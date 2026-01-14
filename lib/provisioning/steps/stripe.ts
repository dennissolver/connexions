
// lib/provisioning/steps/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any, // ⬅ bypass type restriction
});


export async function createStripeCustomer(
  projectSlug: string
): Promise<{ customerId: string }> {
  const customer = await stripe.customers.create({
    name: projectSlug,
    metadata: { projectSlug },
  });

  return { customerId: customer.id };
}

export async function createStripeSubscription(
  customerId: string
): Promise<{ subscriptionId: string }> {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: process.env.STRIPE_DEFAULT_PRICE_ID!,
      },
    ],
    metadata: { customerId },
  });

  return { subscriptionId: subscription.id };
}

