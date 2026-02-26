
## Objective
Fix the password reset flow so a successful reset always updates the correct user account, and prevent the same identity-matching bug in other backend functions.

## What I found (root cause)
1. The reset function logs show a mismatch:
   - Request email: `a@in-sync.co.in`
   - Password updated for user ID: `46377ffe-5862-4074-a19b-b14361814948` (different account)
2. This means the “find user by email” logic is returning the wrong user.
3. The current implementation relies on `auth.admin.listUsers({ filter: ... })` in 3 functions:
   - `verify-password-otp`
   - `complete-member-invitation`
   - `process-event-registration`
4. In practice, that `filter` is not being reliably applied in this runtime path, so it can fall back to first-page users and produce wrong matches.

## Implementation plan

### 1) Patch password reset user resolution (highest priority)
**File:** `supabase/functions/verify-password-otp/index.ts`

- Normalize input email once:
  - `normalizedEmail = email.trim().toLowerCase()`
- Match OTP record using normalized/case-insensitive email + code + unused + not expired.
- Replace `listUsers({ filter })` lookup with a deterministic lookup:
  - Query `public.profiles` by normalized email to get the exact user ID.
  - If no profile match, fallback to paginated auth-user scan (page/perPage loop) with exact lowercase email comparison.
- Add a safety guard before password update:
  - Fetch the resolved auth user and verify `resolvedUser.email.toLowerCase() === normalizedEmail`.
  - If mismatch, abort with explicit error (never update password on mismatch).
- Keep current transaction order:
  1) verify OTP
  2) resolve+verify user identity
  3) update password
  4) mark OTP used

### 2) Normalize OTP creation data
**File:** `supabase/functions/send-password-otp/index.ts`

- Store OTP rows with normalized lowercase email.
- Keep response behavior unchanged (do not reveal whether account exists).

### 3) Fix same bug pattern in the two recently edited functions
**Files:**
- `supabase/functions/complete-member-invitation/index.ts`
- `supabase/functions/process-event-registration/index.ts`

- Remove `listUsers({ filter })` usage.
- Use the same deterministic email→user resolution approach as above:
  - profile-based lookup first
  - paginated fallback if needed
- Preserve current functional behavior (only replace user lookup block).

### 4) Add guardrail logging for future debugging
**Files:** same 3 backend functions

- Log:
  - normalized input email
  - matched user ID
  - matched user email (masked or partial)
- Log and fail hard on ambiguous/unsafe matches (e.g., >1 profile hit, mismatch between requested and resolved email).

### 5) Verify end-to-end before closing
- Flow A (password reset):
  1) request OTP
  2) reset with new password
  3) confirm old password fails
  4) confirm new password succeeds
- Flow B (negative):
  - wrong OTP fails and does not change password
- Flow C:
  - invitation completion still correctly detects existing users
- Flow D:
  - event registration still links existing users and creates new users correctly

## Technical details (for implementation)
```text
Current risky path
User email -> listUsers(filter) -> first-page/incorrect user -> update wrong password

Target safe path
User email
  -> normalize lower/trim
  -> resolve user_id from profiles(email)
      -> fallback: paginated auth scan exact compare
  -> verify resolved auth email matches request email
  -> update password
```

### Resolver behavior contract
- Input: raw email string
- Output: `{ userId, email } | null`
- Rules:
  - exact match on lowercase email
  - never return first row by default
  - throw on ambiguous identity match

## Scope and impact
- **Code changes:** 4 backend function files
- **Database migrations:** none required
- **Frontend changes:** none required
- **Risk reduction:** high (prevents cross-account password updates)

## Post-fix verification note
There is evidence of at least one historical cross-account update. After patching, I will include a quick audit check in logs for any further mismatches and confirm no new incidents occur.
