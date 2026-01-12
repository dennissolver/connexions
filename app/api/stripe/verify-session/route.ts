// app/api/stripe/verify-session/route.ts

export const dynamic = 'force-dynamic';

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

export async function GET(req: NextRequest) {
  try {
    const stripe = getStripe();

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Payment not completed',
      });
    }

    const customer = session.customer as Stripe.Customer;

    return NextResponse.json({
      success: true,
      email: customer?.email || session.customer_email,
      customerId: session.customer,
      subscriptionId: session.subscription,
      metadata: session.metadata,
    });

  } catch (error: any) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}