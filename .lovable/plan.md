

# Fix Admin Password Reset Edge Function

## Problem
The `admin-reset-user-password` edge function is failing with `AuthSessionMissingError` because:
1. It creates a Supabase client with the anon key but doesn't pass the Authorization header to it
2. It then calls `supabaseClient.auth.getUser(token)` which doesn't work correctly with the old SDK version (2.7.1)
3. The function likely needs `verify_jwt = false` in config.toml since the signing-keys system requires manual JWT validation

## Solution

### File: `supabase/functions/admin-reset-user-password/index.ts`

1. **Update CORS headers** to include all required Supabase client headers
2. **Fix authentication**: Create the anon-key client with the Authorization header passed in `global.headers`, so auth context is available. Use `getClaims(token)` instead of `getUser(token)` for reliable JWT verification.
3. **Update SDK import** to a newer version for `getClaims` support

### File: `supabase/config.toml`

Add `verify_jwt = false` for this function (required for signing-keys system):
```toml
[functions.admin-reset-user-password]
verify_jwt = false
```

### Key changes in the edge function:
- Pass `Authorization` header into the client via `global.headers`
- Use `getClaims(token)` to verify the JWT and extract `sub` (user ID)
- Use the admin client for the admin check query
- Keep the rest of the logic unchanged

