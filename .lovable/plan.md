

# Add "Association Member" Role Option to User Management

## Problem
The "Assign Role" dialog in User Management only offers 4 role types: Admin, Association Admin, Company Admin, and Company Member. There is no option to directly add a user as an **Association Member** -- someone who belongs to an association's default company as a regular member.

## Solution
Add a new "Association Member" role type to the dialog. When selected, the admin picks an association, the system automatically uses that association's default company, and inserts the user into the `members` table with the role "member".

## Changes

### File: `src/pages/admin/UserManagement.tsx`

1. **Add "Association Member" to the role type dropdown** (after "Association Admin", around line 878):
   - New `SelectItem` with value `"association_member"` and a user icon

2. **Add UI for "Association Member" selection** (after the `association_admin` section, around line 915):
   - Show an Association dropdown (same as existing ones)
   - No company picker needed -- the default company is used automatically

3. **Add logic in `assignRole` function** (around line 388):
   - New `case 'association_member'`:
     - Validate an association is selected
     - Find the default company for that association from the already-loaded `companies` array
     - If no default company exists, show an error
     - Check for existing membership (same pattern as `company_member`)
     - Insert into `members` table with `company_id` = default company, `role` = "member"

No database changes needed -- this uses the existing `members` table structure.
