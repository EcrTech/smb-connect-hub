
# Add Explicit Association Manager Records for marketing@asrmedia.in

## Current State
- **marketing@asrmedia.in** (user ID: `1c16e51e-12be-4ddc-8130-ae249e5dcef3`) is already a **Super Admin** (`is_super_admin: true` in `admin_users`)
- They already have implicit access to all associations via the admin role in the code
- They have an explicit `association_managers` record only for **The Rise** (role: manager)

## What Needs to Be Done
Insert `association_managers` records for the 3 remaining associations:

1. **Advaita Women Entreprenuer Awards** (`2fa9f982-434c-4389-a3e0-5b4c0e9360da`)
2. **Bharat DtoC** (`89f09def-3cf4-4f9c-b71b-2276b52db40f`)
3. **We Spark Start Up Association** (`8ff6c8f3-dc66-4913-b000-676beec0030d`)

## Database Changes
A single migration will insert 3 rows into `association_managers` with:
- `user_id`: `1c16e51e-12be-4ddc-8130-ae249e5dcef3`
- `role`: `admin`
- `is_active`: `true`
- One row per association listed above

No code changes are needed -- only a database migration.
