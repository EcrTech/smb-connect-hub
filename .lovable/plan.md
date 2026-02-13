

# Upgrade Association Manager Role for marketing@asrmedia.in

## Current State
- **marketing@asrmedia.in** is already a Super Admin and has records for all 4 associations
- 3 associations already have `role: admin`
- **The Rise** currently has `role: manager`

## What Needs to Be Done
Update the `association_managers` record for **The Rise** from `manager` to `admin`.

## Database Change
A single migration will run:

```sql
UPDATE public.association_managers
SET role = 'admin'
WHERE user_id = '1c16e51e-12be-4ddc-8130-ae249e5dcef3'
  AND association_id = '9cb4672e-6423-429e-a260-1e7ad12f34d5';
```

No code changes are needed.
