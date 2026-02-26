

# Fix Remaining Unfiltered `listUsers` Calls

## Problem

Two edge functions still call `supabaseAdmin.auth.admin.listUsers()` without any filter, which:
- Returns only the first 50 users by default
- Fails silently when the target user falls outside that window
- Wastes bandwidth by fetching all users just to find one by email

## Affected Functions

| Function | Line | Current (broken) | 
|---|---|---|
| `complete-member-invitation/index.ts` | 63-64 | `listUsers()` then `.find(u => u.email === ...)` |
| `process-event-registration/index.ts` | 246-247 | `listUsers()` then `.find(u => u.email?.toLowerCase() === ...)` |

## Fix

Apply the same filtered pattern already used in `verify-password-otp`:

```typescript
const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
  filter: `email.eq.${email}`,
  page: 1,
  perPage: 1,
});
const existingUser = users?.[0] || null;
```

Both functions will get this identical replacement. No other code changes needed — the rest of each function already works with `existingUser` being either a user object or null/undefined.

## Scope

- **2 files changed**, ~3 lines each
- No database migrations
- No frontend changes

