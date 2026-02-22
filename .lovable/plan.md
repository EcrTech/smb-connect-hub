

# Fix: Profile Not Found and Tagged Mentions Not Working

## Problem

There are two related issues:

1. **"Profile not found" when clicking tagged names**: When you click on a tagged person (like @Cheshta Minocha) in a post, it navigates to their profile page but shows "Profile not found". This happens because the database access rules are too restrictive -- they only allow viewing profiles of people you're directly connected to, are in your network, or who have posted. If the tagged person doesn't meet any of these conditions for the current viewer, the profile is blocked.

2. **Tagging people doesn't work properly**: The tag mention system lets you search and select people, but when the tagged link is clicked, it leads to a dead end ("Profile not found") due to the same access restriction issue.

## Root Cause

The profile visibility rules currently require one of:
- You own the profile
- You're an admin
- You're connected to the person
- The person has published posts
- You're an association/company manager viewing network members

There is **no rule** that allows authenticated users to simply view any other user's basic profile. This means tagged mentions can point to profiles the viewer cannot access.

## Solution

### 1. Add a broader profile visibility rule

Add a new database policy that allows any authenticated (logged-in) user to view any non-hidden profile. This is standard for professional networking platforms -- all members should be able to view each other's basic profiles.

```sql
CREATE POLICY "Authenticated users can view all non-hidden profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND NOT is_hidden_admin(id)
  );
```

### 2. Add a fallback on the Profile page

Update the MemberProfile page so that instead of showing a dead-end "Profile not found" message, it shows a back button allowing the user to return to where they came from.

### Technical Details

**Files to modify:**
- Database migration (new policy)
- `src/pages/member/MemberProfile.tsx` -- improve the "not found" state with a back button

This is a minimal, targeted fix. The new policy is safe because:
- It only grants SELECT (read) access
- It still excludes hidden admin profiles
- It aligns with how professional networking platforms work (public profiles within the platform)

