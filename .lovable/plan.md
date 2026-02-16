

# Fix 404 Error When Searching for Associations

## Problem
The Universal Search component navigates to `/member/association/:id` (singular), but the route is defined as `/member/associations/:id` (plural). This mismatch causes a 404 error.

## Solution
Fix the navigation path in `src/components/UniversalSearch.tsx` from `/member/association/` to `/member/associations/`.

## Technical Details

### File: `src/components/UniversalSearch.tsx`
Change line 79:
- **From:** `navigate('/member/association/${result.id}')`
- **To:** `navigate('/member/associations/${result.id}')`

This is a one-line fix. No other files need changes.

