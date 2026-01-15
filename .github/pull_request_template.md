## 🚦 Tenant Lifecycle Enforcement Checklist

**All PRs must satisfy the following:**

### Lifecycle Authority
- [ ] No code writes directly to `clients.lifecycle`
- [ ] Lifecycle changes occur only via DB triggers
- [ ] No UI logic invents or assumes lifecycle state

### Routing
- [ ] Navigation decisions are derived from `clients.lifecycle`
- [ ] No page hardcodes onboarding order
- [ ] No redirects bypass lifecycle checks

### Backend
- [ ] API responses return empty-safe shapes (never undefined)
- [ ] New clients with zero data do not throw errors
- [ ] Aggregates default to zero

### Frontend
- [ ] New-client dashboard renders with zero data
- [ ] No component assumes existence of interviews / agents
- [ ] All counts are null-safe

❌ PRs that violate lifecycle authority will not be merged.
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
✔ All empty results are valid states  
✔ Dashboards must render correctly with zero data  
✔ Provisioning is lifecycle-gated  

---

## 🧠 Enforcement Locations

| Layer | Enforced By |
|------|-------------|
| DB | Postgres enum + trigger |
| Backend | RPC lifecycle transitions |
| Frontend | resolveNextRoute(lifecycle) |
| CI | PR checklist |

---

Breaking this law **will re-introduce onboarding regressions**.
Do not do it.

### Dashboard / Data Safety Checklist

- [ ] No dashboard query references `client_id` directly
- [ ] All dashboard queries join through `agents`
- [ ] All dashboard queries use `coalesce(...)`
- [ ] UI only calls RPCs (no raw selects)
- [ ] New client returns valid empty state (0 / [])
