

## Use Mobile Number as Password

This plan updates the event registration process to use the registrant's mobile number as their password instead of generating a random password.

---

### Current Behavior

- Password is auto-generated using `generatePassword(14)` function
- Creates a random 14-character password with letters, numbers, and symbols
- The phone number is stored in user metadata but not used for authentication

---

### Proposed Change

| Aspect | Current | New |
|--------|---------|-----|
| Password Source | Random 14-char string | User's mobile number |
| Example | `aB3!xKp9@mNq2R` | `9876543210` |
| Validation | None for phone | Ensure phone is provided |

---

### Implementation

**File to Modify:** `supabase/functions/process-event-registration/index.ts`

**Changes:**

1. **Add phone validation** - Make phone number mandatory for new user registration
2. **Replace password generation** - Use phone number directly instead of `generatePassword()`
3. **Remove unused function** - Clean up the `generatePassword()` function (optional)

---

### Code Changes

**Before (line 252):**
```typescript
password = generatePassword(14);
```

**After:**
```typescript
// Use mobile number as password
if (!phone || phone.trim().length < 6) {
  return new Response(
    JSON.stringify({ error: 'Phone number is required for registration' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
password = phone.trim();
```

---

### Considerations

| Consideration | How We Handle It |
|---------------|------------------|
| Phone format | Use the phone number as provided (with or without country code) |
| Security | The email template already prompts users to change password after first login |
| Validation | Require minimum 6 characters to ensure valid phone number |

---

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/process-event-registration/index.ts` | Replace password generation with phone number |

