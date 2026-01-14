// app/api/setup/send-welcome/route.ts
// ============================================================================
// SEND WELCOME EMAIL - Sends onboarding email with dashboard link
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept multiple parameter formats for flexibility
    const email = body.email || body.to || body.adminEmail;
    const firstName = body.firstName || body.adminName?.split(' ')[0] || body.adminFirstName || 'there';
    const companyName = body.companyName || body.platformName || 'Your Company';
    const platformName = body.platformName || companyName;
    const platformUrl = body.platformUrl || body.url;

    console.log('[send-welcome] Received:', {
      email: email ? 'âœ“' : 'âœ—',
      firstName,
      platformName,
      platformUrl: platformUrl ? 'âœ“' : 'âœ—'
    });

    if (!email || !platformUrl) {
      console.error('[send-welcome] Missing params:', { email: !!email, platformUrl: !!platformUrl });
      return NextResponse.json({
        error: 'Email and platform URL required',
        received: { email: !!email, platformUrl: !!platformUrl }
      }, { status: 400 });
    }

    // Normalize URL
    const cleanUrl = platformUrl.startsWith('http') ? platformUrl : `https://${platformUrl}`;
    const dashboardUrl = `${cleanUrl}/panels`; // /panels is the dashboard in child platforms

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;margin:0;">${platformName}</h1>
      <p style="color:#94a3b8;font-size:14px;margin:4px 0 0;">Your AI Interview Platform is Ready!</p>
    </div>

    <!-- Main Card -->
    <div style="background:#1e293b;border-radius:16px;padding:40px;text-align:center;">
      
      <!-- Success Icon -->
      <div style="width:64px;height:64px;background:rgba(139,92,246,0.2);border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#a78bfa;font-size:32px;">âœ“</span>
      </div>

      <h2 style="color:#a78bfa;font-size:28px;margin:0 0 16px;">Platform Created!</h2>
      
      <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 32px;">
        Hi ${firstName},<br><br>
        Your AI Interview Platform for <strong>${companyName}</strong> is now live and ready to use.
      </p>

      <!-- CTA Buttons -->
      <div style="margin-bottom:24px;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:600;font-size:16px;">
          View Interview Panels â†’
        </a>
      </div>
      <div>
        <a href="${cleanUrl}" style="display:inline-block;background:transparent;color:#a78bfa;text-decoration:none;padding:12px 24px;border:1px solid #a78bfa;border-radius:8px;font-weight:500;font-size:14px;">
          Visit Platform Home
        </a>
      </div>

      <!-- URL Box -->
      <div style="margin-top:32px;padding:16px;background:#0f172a;border-radius:8px;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Panels URL:</p>
        <a href="${dashboardUrl}" style="color:#a78bfa;font-size:14px;word-break:break-all;">${dashboardUrl}</a>
      </div>
    </div>

    <!-- Getting Started -->
    <div style="margin-top:24px;padding:24px;background:rgba(30,41,59,0.5);border-radius:12px;">
      <h3 style="color:#fff;font-size:16px;margin:0 0 16px;">ðŸš€ Getting Started</h3>
      <ol style="color:#94a3b8;font-size:14px;margin:0;padding-left:20px;line-height:2;">
        <li><strong>Create your AI interviewer</strong> - Click "Start Setup Call" to design your interview</li>
        <li><strong>Share interview links</strong> - Send participants their unique interview URL</li>
        <li><strong>View results in Panels</strong> - See all responses, transcripts and analytics</li>
        <li><strong>Export data</strong> - Download interview data for further analysis</li>
      </ol>
    </div>

    <!-- Panel Features -->
    <div style="margin-top:16px;padding:24px;background:rgba(30,41,59,0.5);border-radius:12px;">
      <h3 style="color:#fff;font-size:16px;margin:0 0 16px;">ðŸ“Š Your Panels Include</h3>
      <ul style="color:#94a3b8;font-size:14px;margin:0;padding-left:20px;line-height:2;list-style:none;">
        <li>âœ… Real-time interview tracking</li>
        <li>âœ… Full conversation transcripts</li>
        <li>âœ… Response analytics and insights</li>
        <li>âœ… Participant management</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #334155;">
      <p style="color:#64748b;font-size:12px;margin:0;">
        Questions? Reply to this email or book a call at <a href="https://calendly.com/mcmdennis" style="color:#a78bfa;">calendly.com/mcmdennis</a>
      </p>
      <p style="color:#475569;font-size:11px;margin:12px 0 0;">
        Powered by Connexions Interview Platform Factory
      </p>
    </div>
  </div>
</body>
</html>`;

    // Try Resend
    if (process.env.RESEND_API_KEY) {
      const fromDomain = process.env.SMTP_FROM_DOMAIN || 'updates.corporateaisolutions.com';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Connexions <noreply@${fromDomain}>`,
          to: [email],
          subject: `ðŸŽ‰ Your ${platformName} Interview Platform is Ready!`,
          html: emailHtml,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        console.log('[send-welcome] Email sent via Resend:', result.id);
        return NextResponse.json({ success: true, provider: 'resend', messageId: result.id });
      } else {
        const error = await res.text();
        console.error('[send-welcome] Resend error:', error);
      }
    }

    // Try SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: process.env.EMAIL_FROM_ADDRESS || 'hello@corporateaisolutions.com' },
          subject: `ðŸŽ‰ Your ${platformName} Interview Platform is Ready!`,
          content: [{ type: 'text/html', value: emailHtml }],
        }),
      });

      if (res.ok || res.status === 202) {
        console.log('[send-welcome] Email sent via SendGrid');
        return NextResponse.json({ success: true, provider: 'sendgrid' });
      }
    }

    // No provider - return success but note it wasn't sent
    console.log('[send-welcome] No email provider configured');
    console.log('To:', email);
    console.log('Dashboard:', dashboardUrl);

    return NextResponse.json({
      success: true,
      provider: 'none',
      message: 'No email provider configured - email not sent'
    });

  } catch (error: any) {
    console.error('[send-welcome] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'send-welcome',
    status: 'ready',
    resendConfigured: !!process.env.RESEND_API_KEY,
    sendgridConfigured: !!process.env.SENDGRID_API_KEY
  });
}
