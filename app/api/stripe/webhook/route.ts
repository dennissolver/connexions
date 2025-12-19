// app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
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
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
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

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { leadId, companyName } = session.metadata || {};
  const customerId = session.customer as string;
  const sessionData = session as any;
  const subscriptionId = sessionData.subscription as string;

  console.log('✅ Checkout completed:', { customerId, subscriptionId, leadId });

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

  // Create new client record
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      email: session.customer_email || session.customer_details?.email,
      name: session.customer_details?.name,
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

  // Create billing account for the new client
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
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
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

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log('❌ Subscription canceled:', { customerId });

  await supabase
    .from('clients')
    .update({
      subscription_status: 'canceled',
    })
    .eq('stripe_customer_id', customerId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
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

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
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