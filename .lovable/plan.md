
# Fix Association Redirection: Always Use Selected Association from RoleContext

## Problem
When switching between associations via the Role Switcher, all association pages ignore the `selectedAssociationId` stored in RoleContext and instead independently query the database. This causes them to always load the same association (typically the first one returned by the query).

Specifically:
- **AssociationFeed.tsx** queries `association_managers` with `.maybeSingle()` which either errors (multiple rows) or returns an arbitrary result, then falls back to fetching the first association for admins.
- **AssociationDashboard.tsx** uses `userData?.association` from `useUserRole`, which works correctly when `selectedAssociationId` is set, but has an admin fallback that fetches `.limit(1)` (first association).
- **Other association pages** (Members, Companies, Profile, Invitations, Analytics, BulkUpload, EmailLists, EmailAnalytics) rely on `userData?.association` which comes from `useUserRole` -- this part actually works when `selectedAssociationId` is properly set.

The main culprit is **AssociationFeed.tsx**, which completely bypasses the RoleContext and does its own association resolution.

## Solution

### 1. Fix AssociationFeed.tsx (primary fix)
Update `loadAssociationInfo()` to first check `selectedAssociationId` from RoleContext before falling back to database queries.

- Import `useRoleContext` 
- Read `selectedAssociationId` from the context
- In `loadAssociationInfo()`, if `selectedAssociationId` is available, use it directly to fetch the association data instead of querying `association_managers`
- Only fall back to the current logic if no `selectedAssociationId` is set

### 2. Fix AssociationDashboard.tsx (admin fallback)
The admin fallback (lines 76-104) fetches `.limit(1)` which always returns the same association. Update it to use `selectedAssociationId` from RoleContext when available.

- Import and read `selectedAssociationId` from `useRoleContext` (already imported)
- Before the admin fallback, check if `selectedAssociationId` is set and use it directly

## Technical Details

### File: `src/pages/association/AssociationFeed.tsx`

Add `useRoleContext` import and read `selectedAssociationId`. Modify `loadAssociationInfo()`:

```typescript
// At component level:
const { selectedAssociationId } = useRoleContext();

// In loadAssociationInfo(), before the current logic:
let associationId: string | null = null;

// Priority 1: Use selectedAssociationId from RoleContext
if (selectedAssociationId) {
  associationId = selectedAssociationId;
} else {
  // Existing fallback logic (association_managers query, admin fallback)
  // ...
}
```

Also add `selectedAssociationId` to the `useEffect` dependency array so the feed reloads when the user switches associations.

### File: `src/pages/association/AssociationDashboard.tsx`

Read `selectedAssociationId` from the existing `useRoleContext` usage. In the `initialize` function, add a check before the admin fallback:

```typescript
const { setRole, selectedAssociationId } = useRoleContext();

// In initialize(), add before the admin fallback (line 76):
} else if (selectedAssociationId) {
  // Use the selected association from RoleContext
  const { data: assocData } = await supabase
    .from('associations')
    .select('*')
    .eq('id', selectedAssociationId)
    .maybeSingle();
  if (assocData) {
    setAssociation(assocData);
    loadStats(assocData.id);
  }
}
```

### Files NOT requiring changes
The remaining association pages (`AssociationMembers`, `AssociationCompanies`, `AssociationProfile`, `AssociationInvitations`, `AssociationAnalytics`, `BulkUploadCompanies`, `AssociationEmailLists`, `AssociationEmailListDetail`) all derive their association ID from `userData?.association` provided by `useUserRole`. The `useUserRole` hook already correctly uses `selectedAssociationId` to find the matching association manager record (line 58 of `useUserRole.ts`), so these pages will work correctly once the two main pages are fixed.
