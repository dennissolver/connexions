import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/send-email
 * Sends welcome email with interviews link to client
 * 
 * Supports multiple email providers:
 * - Resend (RESEND_API_KEY)
 * - SendGrid (SENDGRID_API_KEY)
 * - Fallback: logs to console
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, agentName, interviewUrl, companyName } = body;

    if (!to || !interviewUrl) {
      return NextResponse.json(
        { error: 'Email and interviews URL required' },
        { status: 400 }
      );
    }

    const emailHtml = generateEmailHtml({
      agentName: agentName || 'Your AI Interviewer',
      interviewUrl,
      companyName: companyName || 'Your Company',
    });

    const emailText = generateEmailText({
      agentName: agentName || 'Your AI Interviewer',
      interviewUrl,
      companyName: companyName || 'Your Company',
    });

    // Try Resend first
    if (process.env.RESEND_API_KEY) {
      const result = await sendWithResend({
        to,
        subject: subject || `Your AI Interviewer is Ready - ${agentName}`,
        html: emailHtml,
        text: emailText,
      });
      
      if (result.success) {
        return NextResponse.json({ sent: true, provider: 'resend' });
      }
    }

    // Try SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const result = await sendWithSendGrid({
        to,
        subject: subject || `Your AI Interviewer is Ready - ${agentName}`,
        html: emailHtml,
        text: emailText,
      });
      
      if (result.success) {
        return NextResponse.json({ sent: true, provider: 'sendgrid' });
      }
    }

    // Fallback: log to console (for development)
    console.log('=== EMAIL WOULD BE SENT ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Interview URL:', interviewUrl);
    console.log('===========================');

    return NextResponse.json({ 
      sent: true, 
      provider: 'console',
      message: 'Email logged (no email provider configured)'
    });

  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

async function sendWithResend({ to, subject, html, text }: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'AI Interview Agents <noreply@corporateaisolutions.com>',
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (response.ok) {
      return { success: true };
    }
    
    const error = await response.json();
    console.error('Resend error:', error);
    return { success: false, error };
  } catch (error) {
    console.error('Resend failed:', error);
    return { success: false, error };
  }
}

async function sendWithSendGrid({ to, subject, html, text }: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { 
          email: process.env.EMAIL_FROM_ADDRESS || 'noreply@corporateaisolutions.com',
          name: 'AI Interview Agents'
        },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      return { success: true };
    }
    
    const error = await response.text();
    console.error('SendGrid error:', error);
    return { success: false, error };
  } catch (error) {
    console.error('SendGrid failed:', error);
    return { success: false, error };
  }
}

function generateEmailHtml({ agentName, interviewUrl, companyName }: {
  agentName: string;
  interviewUrl: string;
  companyName: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AI Interviewer is Ready</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0;">AI Interview Agents</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0;">by Corporate AI Solutions</p>
    </div>

    <!-- Main Card -->
    <div style="background-color: #1e293b; border-radius: 16px; padding: 40px; text-align: center;">
      
      <!-- Success Icon -->
      <div style="width: 64px; height: 64px; background-color: rgba(34, 197, 94, 0.2); border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
        <span style="color: #22c55e; font-size: 32px;">âœ“</span>
      </div>

      <h2 style="color: #22c55e; font-size: 28px; margin: 0 0 16px;">Your AI Interviewer is Ready!</h2>
      
      <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 32px;">
        <strong>${agentName}</strong> for ${companyName} is now live and ready to conduct interviews.
      </p>

      <!-- Interview Link -->
      <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px;">Your Interview Link:</p>
        <a href="${interviewUrl}" style="color: #a78bfa; font-size: 16px; word-break: break-all; text-decoration: none;">
          ${interviewUrl}
        </a>
      </div>

      <!-- CTA Button -->
      <a href="${interviewUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
        Test Your Interviewer
      </a>

    </div>

    <!-- Next Steps -->
    <div style="margin-top: 32px; padding: 24px; background-color: rgba(30, 41, 59, 0.5); border-radius: 12px;">
      <h3 style="color: #ffffff; font-size: 18px; margin: 0 0 16px;">What's Next?</h3>
      <ol style="color: #94a3b8; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>Click the link above to test your AI interviewer</li>
        <li>Share the interview link with your target participants</li>
        <li>Your AI will handle the conversations automatically</li>
      </ol>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #334155;">
      <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px;">
        Need help? <a href="https://calendly.com/mcmdennis" style="color: #a78bfa; text-decoration: none;">Book a call with Dennis</a>
      </p>
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        AI Interview Agents by Corporate AI Solutions<br>
        <a href="mailto:dennis@corporateaisolutions.com" style="color: #64748b;">dennis@corporateaisolutions.com</a>
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

function generateEmailText({ agentName, interviewUrl, companyName }: {
  agentName: string;
  interviewUrl: string;
  companyName: string;
}) {
  return `
Your AI Interviewer is Ready!

${agentName} for ${companyName} is now live and ready to conduct interviews.

Your Interview Link:
${interviewUrl}

What's Next?
1. Click the link above to test your AI interviewer
2. Share the interview link with your target participants
3. Your AI will handle the conversations automatically

Need help? Book a call with Dennis: https://calendly.com/mcmdennis

---
AI Interview Agents by Corporate AI Solutions
dennis@corporateaisolutions.com
  `.trim();
}

