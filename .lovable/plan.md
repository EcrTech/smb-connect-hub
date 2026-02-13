
# Fix Association Page 404 Error

## Problem
The route is defined as `/member/association/:id` (singular) in `App.tsx`, but navigation links in `MemberFeed.tsx` and `MemberProfile.tsx` use `/member/associations/:id` (plural). This mismatch causes a 404 error.

## Solution
Update the route definition in `App.tsx` from `/member/association/:id` to `/member/associations/:id` to match the navigation URLs used throughout the app. This is a one-line change.

## Technical Details

### File: `src/App.tsx`
- Change the route path from `path="/member/association/:id"` to `path="/member/associations/:id"`

This aligns the route with the existing navigation calls in:
- `src/pages/member/MemberFeed.tsx` (4 occurrences of `/member/associations/`)
- `src/pages/member/MemberProfile.tsx` (1 occurrence of `/member/associations/`)

No other files need changes.
