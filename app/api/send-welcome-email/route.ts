// app/api/setup/send-welcome/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, companyName, platformUrl } = await request.json();

    if (!email || !platformUrl) {
      return NextResponse.json({ error: 'Email and platform URL required' }, { status: 400 });
    }

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
      <h1 style="color:#fff;font-size:24px;margin:0;">AI Interview Agents</h1>
      <p style="color:#94a3b8;font-size:14px;margin:4px 0 0;">Your platform is ready!</p>
    </div>

    <!-- Main Card -->
    <div style="background:#1e293b;border-radius:16px;padding:40px;text-align:center;">
      
      <!-- Success Icon -->
      <div style="width:64px;height:64px;background:rgba(34,197,94,0.2);border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#22c55e;font-size:32px;">âœ“</span>
      </div>

      <h2 style="color:#22c55e;font-size:28px;margin:0 0 16px;">Platform Created!</h2>
      
      <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 32px;">
        Hi ${firstName || 'there'},<br><br>
        Your AI Interview Agents platform for <strong>${companyName}</strong> is now live and ready to use.
      </p>

      <!-- CTA Button -->
      <a href="${platformUrl}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:600;font-size:16px;">
        Visit Your Platform â†’
      </a>

      <!-- URL Box -->
      <div style="margin-top:32px;padding:16px;background:#0f172a;border-radius:8px;">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Platform URL:</p>
        <a href="${platformUrl}" style="color:#a78bfa;font-size:14px;word-break:break-all;">${platformUrl}</a>
      </div>
    </div>

    <!-- Getting Started -->
    <div style="margin-top:24px;padding:24px;background:rgba(30,41,59,0.5);border-radius:12px;">
      <h3 style="color:#fff;font-size:16px;margin:0 0 16px;">Getting Started</h3>
      <ol style="color:#94a3b8;font-size:14px;margin:0;padding-left:20px;line-height:2;">
        <li>Visit your platform</li>
        <li>Click "Create Your Agent" to design your AI interviewer</li>
        <li>Share the interview link with participants</li>
        <li>View responses in your dashboard</li>
      </ol>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #334155;">
      <p style="color:#64748b;font-size:12px;margin:0;">
        Questions? Reply to this email or book a call at <a href="https://calendly.com/mcmdennis" style="color:#a78bfa;">calendly.com/mcmdennis</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    // Try Resend
    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'AI Interview Agents <hello@corporateaisolutions.com>',
          to: [email],
          subject: `âœ“ Your AI Interview Platform is Ready - ${companyName}`,
          html: emailHtml,
        }),
      });

      if (res.ok) {
        console.log('Welcome email sent via Resend');
        return NextResponse.json({ success: true, provider: 'resend' });
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
          subject: `âœ“ Your AI Interview Platform is Ready - ${companyName}`,
          content: [{ type: 'text/html', value: emailHtml }],
        }),
      });

      if (res.ok || res.status === 202) {
        console.log('Welcome email sent via SendGrid');
        return NextResponse.json({ success: true, provider: 'sendgrid' });
      }
    }

    // Fallback: log to console
    console.log('=== WELCOME EMAIL (no provider configured) ===');
    console.log('To:', email);
    console.log('Company:', companyName);
    console.log('URL:', platformUrl);
    console.log('==============================================');

    return NextResponse.json({ success: true, provider: 'console' });

  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}

