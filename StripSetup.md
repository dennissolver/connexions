# Stripe Payment Setup Guide - Connexions Platform

## Overview

Your payment integration is set up for:
- **$150/month** base subscription
- **100 interviews included**  
- **$5/interview** overage (billed in arrears)

---

## Step 1: Create Stripe Products

Go to [Stripe Dashboard](https://dashboard.stripe.com/products) and create:

### Product 1: Connexions Platform Subscription
1. Click "Add Product"
2. **Name:** Connexions Platform
3. **Description:** Private AI interview platform with 100 interviews included
4. **Pricing:** 
   - Price: $150.00 USD
   - Billing period: Monthly
   - **Save this Price ID** → `price_xxxxx` (you'll need this)

### Product 2: Interview Overage (Optional - for metered billing)
1. Click "Add Product"  
2. **Name:** Additional Interviews
3. **Description:** Per-interview charge beyond included 100
4. **Pricing:**
   - Usage-based pricing
   - Price per unit: $5.00
   - Metered usage
   - **Save this Price ID** → `price_yyyyy`

---

## Step 2: Set Up Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. **Endpoint URL:** `https://your-domain.com/api/stripe/webhook`
4. **Events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. **Copy the Signing Secret** → `whsec_xxxxx`

---

## Step 3: Environment Variables

Add these to your Vercel project:

```env
# Stripe API Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_xxxxx          # or sk_test_ for testing
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx     # or pk_test_ for testing

# Stripe Product Prices (from Step 1)
STRIPE_PRICE_ID=price_xxxxx              # $150/month subscription
STRIPE_METERED_PRICE_ID=price_yyyyy      # $5/interview overage (optional)

# Stripe Webhook (from Step 2)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Your domain
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

---

## Step 4: Run Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Add Stripe columns to platforms table
ALTER TABLE platforms 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS included_interviews INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS used_interviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Add to demo_leads for conversion tracking
ALTER TABLE demo_leads
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ;
```

---

## Step 5: Configure Customer Portal (Optional but Recommended)

1. Go to [Customer Portal Settings](https://dashboard.stripe.com/settings/billing/portal)
2. Enable:
   - Cancel subscription
   - Update payment method
   - View invoice history
3. Configure branding to match your platform

---

## Testing Checklist

Use Stripe test mode first:

1. [ ] Create test product and prices
2. [ ] Add test keys to Vercel env vars
3. [ ] Test checkout flow with card `4242 4242 4242 4242`
4. [ ] Verify webhook receives events
5. [ ] Check database updates after payment
6. [ ] Test customer portal access

---

## File Structure Created

```
app/
├── buyer/
│   ├── page.tsx                    # Wrapper
│   ├── BuyerClient.tsx             # Main purchase page
│   └── success/
│       └── page.tsx                # Post-payment success
├── api/
│   └── stripe/
│       ├── checkout/route.ts       # Create checkout session
│       ├── webhook/route.ts        # Handle Stripe events
│       ├── portal/route.ts         # Customer portal
│       ├── usage/route.ts          # Track interview usage
│       └── verify-session/route.ts # Verify payment
```

---

## Usage Tracking Integration

When an interview completes, call this to track usage:

```typescript
await fetch('/api/stripe/usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platformSlug: 'acme-research',
    interviewCount: 1
  })
});
```

This automatically:
- Increments the usage counter
- Reports overages to Stripe for metered billing
- Returns current usage stats

---

## Go Live Checklist

1. [ ] Switch to live Stripe keys
2. [ ] Update webhook URL to production domain
3. [ ] Test one real payment (refund after)
4. [ ] Verify email notifications working
5. [ ] Monitor first few subscriptions closely