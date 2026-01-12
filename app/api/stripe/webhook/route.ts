// app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization - only create clients when needed at runtime
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });
}

function getSupabaseAdmin(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const supabase = getSupabaseAdmin();

  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(supabase, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(supabase, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const { leadId, companyName } = session.metadata || {};
  const customerId = session.customer as string;
  const sessionData = session as any;
  const subscriptionId = sessionData.subscription as string;

  const email = session.customer_email || session.customer_details?.email;
  const name = session.customer_details?.name;

  console.log('✅ Checkout completed:', { customerId, subscriptionId, leadId, email });

  if (!email) {
    console.error('No email found in checkout session');
    return;
  }

  // Update demo lead if exists
  if (leadId) {
    await supabase
      .from('demo_leads')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscribed_at: new Date().toISOString(),
      })
      .eq('id', leadId);
  }

  // ========== Create Supabase Auth User ==========
  let authUserId: string | null = null;

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    console.log('Auth user already exists:', existingUser.id);
    authUserId = existingUser.id;
  } else {
    // Create new auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true, // Auto-confirm email since they just paid
      user_metadata: {
        name: name,
        company_name: companyName,
        stripe_customer_id: customerId,
      },
    });

    if (createError) {
      console.error('Failed to create auth user:', createError);
    } else {
      authUserId = newUser.user?.id || null;
      console.log('✅ Created auth user:', authUserId);
    }
  }

  // ========== Create Client Record ==========
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      id: authUserId || undefined, // Link to auth user if available
      email: email,
      name: name,
      company_name: companyName || 'New Platform',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      subscription_tier: 'standard',
      agents_limit: 10,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create client:', error);
    return;
  }

  // ========== Create Billing Account ==========
  await supabase
    .from('billing_accounts')
    .insert({
      client_id: newClient.id,
      plan: 'standard',
      monthly_included_interviews: 100,
      used_interviews: 0,
      current_period_start: new Date().toISOString(),
    });

  console.log('✅ Created client and billing account:', newClient.id);

  // ========== Send Magic Link Email ==========
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUrl = `${baseUrl}/dashboard`;

  const { data: linkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (magicLinkError) {
    console.error('Failed to generate magic link:', magicLinkError);
  } else {
    console.log('✅ Magic link generated for:', email);

    // Send welcome email with the magic link
    const magicLink = linkData?.properties?.action_link;
    if (magicLink) {
      await sendWelcomeEmailWithMagicLink(email, name || 'there', companyName, magicLink, baseUrl);
    }
  }
}

async function sendWelcomeEmailWithMagicLink(
  email: string,
  name: string,
  companyName: string | undefined,
  magicLink: string,
  baseUrl: string
) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set, skipping welcome email');
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Connexions <noreply@connexions.ai>',
        to: email,
        subject: `Welcome to Connexions${companyName ? ` - ${companyName}` : ''}! 🎉`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8B5CF6; margin: 0;">Welcome to Connexions!</h1>
              <p style="color: #666; font-size: 18px;">Your AI interview platform is ready</p>
            </div>
            
            <p style="font-size: 16px;">Hi ${name},</p>
            
            <p style="font-size: 16px;">Thank you for subscribing! Your account has been created and you're ready to start conducting AI-powered interviews.</p>
            
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
              <p style="color: white; margin: 0 0 16px 0; font-size: 16px;">Click below to access your dashboard:</p>
              <a href="${magicLink}" style="display: inline-block; background-color: white; color: #8B5CF6; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                🚀 Log In to Dashboard
              </a>
            </div>
            
            <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #374151; margin: 0 0 12px 0;">Your Subscription Includes:</h3>
              <ul style="color: #4B5563; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">✅ <strong>100 interviews</strong> per month</li>
                <li style="margin-bottom: 8px;">✅ <strong>10 interview panels</strong></li>
                <li style="margin-bottom: 8px;">✅ <strong>AI transcript analysis</strong></li>
                <li style="margin-bottom: 8px;">✅ <strong>Custom branding</strong></li>
                <li style="margin-bottom: 8px;">✅ <strong>Email invitations</strong></li>
                <li>✅ <strong>Export & reporting</strong></li>
              </ul>
            </div>
            
            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0;">
              <p style="color: #92400E; margin: 0; font-size: 14px;">
                <strong>🔐 Passwordless Login:</strong> This magic link expires in 24 hours. 
                You can always request a new one from the login page.
              </p>
            </div>
            
            <h3 style="color: #374151;">Quick Start Guide:</h3>
            <ol style="color: #4B5563; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Click the login button above</li>
              <li style="margin-bottom: 8px;">Create your first interview panel</li>
              <li style="margin-bottom: 8px;">Invite participants via email</li>
              <li style="margin-bottom: 8px;">Review AI-analyzed transcripts</li>
            </ol>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;">
            
            <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
              Questions? Reply to this email or visit <a href="${baseUrl}" style="color: #8B5CF6;">connexions.ai</a>
              <br><br>
              Connexions - AI-Powered Interview Platform
            </p>
          </div>
        `,
      }),
    });

    if (response.ok) {
      console.log('✅ Welcome email with magic link sent to:', email);
    } else {
      const error = await response.text();
      console.error('Failed to send welcome email:', error);
    }
  } catch (err) {
    console.error('Welcome email error:', err);
  }
}

async function handleSubscriptionChange(supabase: SupabaseClient, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subData = subscription as any;

  console.log('🔄 Subscription updated:', {
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId,
  });

  // Update client subscription status
  await supabase
    .from('clients')
    .update({
      subscription_status: subscription.status,
      stripe_subscription_id: subscription.id,
    })
    .eq('stripe_customer_id', customerId);

  // Update billing period
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (client) {
    const periodStart = subData.current_period_start;
    const periodEnd = subData.current_period_end;

    if (periodStart && periodEnd) {
      await supabase
        .from('billing_accounts')
        .update({
          current_period_start: new Date(periodStart * 1000).toISOString(),
          current_period_end: new Date(periodEnd * 1000).toISOString(),
        })
        .eq('client_id', client.id);
    }
  }
}

async function handleSubscriptionCanceled(supabase: SupabaseClient, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log('❌ Subscription canceled:', { customerId });

  await supabase
    .from('clients')
    .update({
      subscription_status: 'canceled',
    })
    .eq('stripe_customer_id', customerId);
}

async function handleInvoicePaid(supabase: SupabaseClient, invoice: Stripe.Invoice) {
  const invoiceData = invoice as any;
  const customerId = invoiceData.customer as string;

  console.log('💵 Invoice paid:', {
    invoiceId: invoice.id,
    amount: invoiceData.amount_paid,
    customerId,
  });

  // Find client
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!client) return;

  // Reset usage counter for new billing period
  if (invoiceData.subscription) {
    await supabase
      .from('billing_accounts')
      .update({
        used_interviews: 0,
        last_invoice_paid_at: new Date().toISOString(),
      })
      .eq('client_id', client.id);

    console.log('🔄 Reset interview counter for client:', client.id);
  }
}

async function handleInvoiceFailed(supabase: SupabaseClient, invoice: Stripe.Invoice) {
  const invoiceData = invoice as any;
  const customerId = invoiceData.customer as string;

  console.log('⚠️ Invoice payment failed:', { customerId });

  await supabase
    .from('clients')
    .update({
      subscription_status: 'past_due',
    })
    .eq('stripe_customer_id', customerId);

  // Find client and update billing
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (client) {
    await supabase
      .from('billing_accounts')
      .update({
        payment_failed_at: new Date().toISOString(),
      })
      .eq('client_id', client.id);
  }
}