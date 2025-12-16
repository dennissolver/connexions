// app/api/store-transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { interviewId, transcript, format = 'txt' } = await request.json();

    if (!interviewId || !transcript) {
      return NextResponse.json(
        { error: 'Interview ID and transcript required' },
        { status: 400 }
      );
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${interviewId}/${timestamp}-transcript.${format}`;

    // Prepare content based on format
    let content: string;
    let contentType: string;

    if (format === 'json') {
      content = typeof transcript === 'string' 
        ? transcript 
        : JSON.stringify(transcript, null, 2);
      contentType = 'application/json';
    } else {
      content = typeof transcript === 'string'
        ? transcript
        : formatTranscript(transcript);
      contentType = 'text/plain';
    }

    // Upload to storage bucket
    const { data, error } = await supabase.storage
      .from('transcripts')
      .upload(filename, content, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to store transcript' },
        { status: 500 }
      );
    }

    // Get public URL (or signed URL for private bucket)
    const { data: urlData } = await supabase.storage
      .from('transcripts')
      .createSignedUrl(filename, 60 * 60 * 24 * 7); // 7 day expiry

    const transcriptUrl = urlData?.signedUrl || data.path;

    // Update interviews record with transcript URL
    await supabase
      .from('interviews')
      .update({
        transcript_url: transcriptUrl,
        transcript: typeof transcript === 'string' ? transcript : formatTranscript(transcript),
      })
      .eq('id', interviewId);

    return NextResponse.json({
      success: true,
      path: data.path,
      url: transcriptUrl,
    });

  } catch (error: any) {
    console.error('Store transcript error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store transcript' },
      { status: 500 }
    );
  }
}

// GET - Retrieve transcript from storage
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');
    const path = searchParams.get('path');

    if (!interviewId && !path) {
      return NextResponse.json(
        { error: 'Interview ID or path required' },
        { status: 400 }
      );
    }

    let filePath = path;

    // If only interviewId provided, look up the transcript URL
    if (!filePath && interviewId) {
      const { data: interview } = await supabase
        .from('interviews')
        .select('transcript_url, transcript')
        .eq('id', interviewId)
        .single();

      if (interview?.transcript) {
        return NextResponse.json({
          success: true,
          transcript: interview.transcript,
          source: 'database',
        });
      }

      if (!interview?.transcript_url) {
        return NextResponse.json(
          { error: 'No transcript found for this interviews' },
          { status: 404 }
        );
      }

      // Extract path from URL if it's a signed URL
      filePath = interview.transcript_url.split('/transcripts/')[1]?.split('?')[0];
    }

    if (!filePath) {
      return NextResponse.json({ error: 'Could not determine file path' }, { status: 400 });
    }

    // Download from storage
    const { data, error } = await supabase.storage
      .from('transcripts')
      .download(filePath);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to retrieve transcript' },
        { status: 404 }
      );
    }

    const text = await data.text();

    return NextResponse.json({
      success: true,
      transcript: text,
      source: 'storage',
    });

  } catch (error: any) {
    console.error('Get transcript error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve transcript' },
      { status: 500 }
    );
  }
}

function formatTranscript(messages: any[]): string {
  if (!Array.isArray(messages)) return String(messages);
  
  return messages
    .map(m => {
      const role = m.role === 'agent' ? 'Agent' : 'Interviewee';
      const timestamp = m.timestamp ? `[${m.timestamp}] ` : '';
      return `${timestamp}${role}: ${m.content}`;
    })
    .join('\n\n');
}
