
# Fix: Profiles Not Displaying Due to `.single()` Errors

## Problem
When clicking on a tagged person's name, the profile page shows "Profile not found". This happens because the `MemberProfile.tsx` page uses `.single()` to query the `members` table for the viewed user. Many users (especially admin-only users) have no record in the `members` table, causing `.single()` to throw a 406 error that crashes the entire profile loading function.

## Root Cause
The `loadProfile` function in `MemberProfile.tsx` calls `.single()` on the `members` table (line 641) to get connection count. When no member record exists for the user being viewed, `.single()` throws an error, which is caught by the `catch` block. This prevents the rest of the profile from loading properly - even though the profile data itself was already fetched successfully from the `profiles` table.

The same issue affects several connection-related functions (lines 421, 428, 504, 511, 782, 788) that also use `.single()` on the members table.

## Solution

Replace all `.single()` calls on the `members` table in `MemberProfile.tsx` with `.maybeSingle()`. This returns `null` instead of throwing an error when no rows are found, allowing the profile to display correctly even when the user has no member record.

### Files to modify:
- **`src/pages/member/MemberProfile.tsx`** - Change 7 instances of `.single()` to `.maybeSingle()` for members table queries (lines 421, 428, 504, 511, 529, 641, 782, 788)

### Technical details:
- Line 641: The `loadProfile` function queries members to get connection count. With `.maybeSingle()`, if no member record exists, `userMember` will be null and the connection count section is safely skipped (there's already a `if (userMember)` check on line 643).
- Lines 421, 428: `checkConnectionStatus` - already has a null check (`if (!currentMember || !otherMember) return`)
- Lines 504, 511: `handleSendMessage` - already has a null check
- Lines 782, 788: `handleConnect`/disconnect - already has null checks
- Line 529: `.select().single()` after an insert can remain, but should also use `.maybeSingle()` for safety
