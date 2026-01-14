// app/api/stripe/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Lazy initialization - only create client when needed at runtime
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();

    const body = await req.json();
    const {
      leadId,
      email,
      companyName,
      successUrl,
      cancelUrl
    } = body;

    // Create or retrieve customer
    let customer: Stripe.Customer;

    if (email) {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: email,
          name: companyName,
          metadata: {
            leadId: leadId || '',
          },
        });
      }
    } else {
      customer = await stripe.customers.create({
        name: companyName,
        metadata: {
          leadId: leadId || '',
        },
      });
    }

    // Build line items - base subscription + metered usage
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: process.env.STRIPE_PRICE_ID!, // $150/month subscription
        quantity: 1,
      },
    ];

    // Add metered price for overage billing ($5/interview)
    if (process.env.STRIPE_METERED_PRICE_ID) {
      lineItems.push({
        price: process.env.STRIPE_METERED_PRICE_ID,
        // No quantity for metered - Stripe tracks via meter events
      });
    }

    // Create checkout session with subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/buyer/success?session_id={CHECKOUT_SESSION_ID}&leadId=${leadId || ''}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/buyer?leadId=${leadId || ''}`,
      metadata: {
        leadId: leadId || '',
        companyName: companyName || '',
      },
      subscription_data: {
        metadata: {
          leadId: leadId || '',
          companyName: companyName || '',
          includedInterviews: '100',
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      customerId: customer.id,
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
