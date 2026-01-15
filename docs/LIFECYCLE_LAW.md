# Tenant Lifecycle Law (IMMUTABLE)

This system has exactly **one source of truth** for tenant state:

> `clients.lifecycle` (Postgres enum: tenant_lifecycle)

All onboarding, provisioning, dashboard, and routing logic MUST
derive from this value.

---

## 🚦 Allowed Lifecycle States (Order Is Enforced)

1. VISITOR
2. PAID_NO_PROFILE
3. COMPANY_PROFILE
4. PERSONAL_PROFILE
5. AGENT_PROFILE
6. INTERVIEW_READY

Transitions may ONLY move forward by one step.
This is enforced at the database level.

---

## 🔒 Hard Rules (Non-Negotiable)

❌ No UI component may infer lifecycle from:
- row counts
- null checks
- “first time” heuristics
- empty tables

❌ No API route may update `clients.lifecycle` directly.

❌ No redirect logic may exist outside `resolveNextRoute(lifecycle)`.

❌ No provisioning logic may run unless lifecycle ≥ AGENT_PROFILE.

❌ No dashboard query may assume data exists.

---

## ✅ Required Patterns

✔ Lifecycle progression happens ONLY via RPC / server function  
✔ UI derives state ONLY from lifecycle
