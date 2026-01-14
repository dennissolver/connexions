// lib/billing-trigger.ts

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BillingResult {
  success: boolean;
  interviewNumber: number;
  isBillable: boolean;
  remainingFree: number;
  error?: string;
}

/**
 * Call this when an interview completes (transcript saved).
 * Automatically triggers Stripe billing for interview #101+
 *
 * @param clientId - UUID of the client (from clients table)
 * @param interviewId - Unique ID of the interview/conversation
 */
export async function recordInterviewAndBill(
  clientId: string,
  interviewId: string
): Promise<BillingResult> {
  try {
    // 1. Get client's Stripe info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, stripe_customer_id, subscription_status, company_name')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientId);
      return {
        success: false,
        interviewNumber: 0,
        isBillable: false,
        remainingFree: 0,
        error: 'Client not found',
      };
    }

    // 2. Get or create billing account
    let { data: billing, error: billingError } = await supabase
      .from('billing_accounts')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (billingError || !billing) {
      // Create billing account if doesn't exist
      const { data: newBilling } = await supabase
        .from('billing_accounts')
        .insert({
          client_id: clientId,
          plan: 'standard',
          monthly_included_interviews: 100,
          used_interviews: 0,
        })
        .select()
        .single();

      billing = newBilling;
    }

    // 3. Increment the usage counter
    const previousCount = billing?.used_interviews || 0;
    const newCount = previousCount + 1;
    const includedFree = billing?.monthly_included_interviews || 100;

    await supabase
      .from('billing_accounts')
      .update({
        used_interviews: newCount,
        last_interview_at: new Date().toISOString(),
      })
      .eq('client_id', clientId);

    // 4. Check if THIS interview is billable (101st or later)
    const isBillable = newCount > includedFree;
    const remainingFree = Math.max(0, includedFree - newCount);

    console.log(`ðŸ“Š Interview #${newCount} for ${client.company_name || clientId}`, {
      included: includedFree,
      isBillable,
      remainingFree,
    });

    // 5. If billable AND has Stripe customer, report to meter
    if (isBillable && client.stripe_customer_id) {
      await reportToStripeMeter(
        client.stripe_customer_id,
        interviewId,
        clientId
      );
    }

    return {
      success: true,
      interviewNumber: newCount,
      isBillable,
      remainingFree,
    };

  } catch (error: any) {
    console.error('Billing trigger error:', error);
    return {
      success: false,
      interviewNumber: 0,
      isBillable: false,
      remainingFree: 0,
      error: error.message,
    };
  }
}

/**
 * Alternative: Record by agent ID (looks up client automatically)
 */
export async function recordInterviewByAgent(
  agentId: string,
  interviewId: string
): Promise<BillingResult> {
  // Look up client from agent
  const { data: agent } = await supabase
    .from('agents')
    .select('client_id')
    .eq('id', agentId)
    .single();

  if (!agent?.client_id) {
    return {
      success: false,
      interviewNumber: 0,
      isBillable: false,
      remainingFree: 0,
      error: 'Agent not found or no client',
    };
  }

  return recordInterviewAndBill(agent.client_id, interviewId);
}

/**
 * Alternative: Record by ElevenLabs agent ID
 */
export async function recordInterviewByElevenLabsAgent(
  elevenlabsAgentId: string,
  interviewId: string
): Promise<BillingResult> {
  // Look up client from ElevenLabs agent ID
  const { data: agent } = await supabase
    .from('agents')
    .select('client_id')
    .eq('elevenlabs_agent_id', elevenlabsAgentId)
    .single();

  if (!agent?.client_id) {
    return {
      success: false,
      interviewNumber: 0,
      isBillable: false,
      remainingFree: 0,
      error: 'ElevenLabs agent not found',
    };
  }

  return recordInterviewAndBill(agent.client_id, interviewId);
}

/**
 * Reports one interview to Stripe's meter for billing
 */
async function reportToStripeMeter(
  stripeCustomerId: string,
  interviewId: string,
  clientId: string
) {
  try {
    const meterEvent = await stripe.billing.meterEvents.create({
      event_name: 'interview_completed', // Must match your Stripe meter
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: '1', // One interview
      },
      identifier: `${clientId}-${interviewId}`, // Prevents duplicate billing
      timestamp: Math.floor(Date.now() / 1000),
    });

    console.log(`ðŸ’° Billed interview to Stripe:`, {
      customer: stripeCustomerId,
      interview: interviewId,
      eventId: meterEvent.identifier,
    });

    return true;

  } catch (error: any) {
    console.error('Stripe meter reporting failed:', error.message);

    // Store for manual retry/reconciliation
    // Note: Supabase returns { data, error } - doesn't throw on insert failures
    await supabase
      .from('billing_failures')
      .insert({
        client_id: clientId,
        interview_id: interviewId,
        stripe_customer_id: stripeCustomerId,
        error: error.message,
        created_at: new Date().toISOString(),
      });

    return false;
  }
}

/**
 * Get usage summary for a client (for admin dashboard)
 */
export async function getUsageSummary(clientId: string) {
  const { data: billing } = await supabase
    .from('billing_accounts')
    .select('used_interviews, monthly_included_interviews, current_period_start, current_period_end')
    .eq('client_id', clientId)
    .single();

  if (!billing) return null;

  const used = billing.used_interviews || 0;
  const included = billing.monthly_included_interviews || 100;
  const overage = Math.max(0, used - included);

  return {
    used,
    included,
    remaining: Math.max(0, included - used),
    overage,
    overageCost: overage * 5, // $5 per overage
    periodStart: billing.current_period_start,
    periodEnd: billing.current_period_end,
  };
}

/**
 * Reset usage counter (call from Stripe webhook on invoice.paid)
 */
export async function resetUsageCounter(stripeCustomerId: string) {
  // Find client by Stripe customer ID
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();

  if (!client) return false;

  // Reset counter
  await supabase
    .from('billing_accounts')
    .update({
      used_interviews: 0,
      current_period_start: new Date().toISOString(),
      last_invoice_paid_at: new Date().toISOString(),
    })
    .eq('client_id', client.id);

  console.log(`ðŸ”„ Reset usage counter for client ${client.id}`);
  return true;
}
