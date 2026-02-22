
# Fix: Add Edit and Delete Functionality to Education Section

## Problem
The Education section on your profile only has an "Add" button. Once an education entry is added, there's no way to edit or delete it -- the entries are displayed as read-only text.

## Solution
Add edit (pencil) and delete (trash) buttons to each education entry, and create an edit dialog that pre-fills the form with existing data so you can update it.

## Technical Details

### 1. Update `EditEducationDialog` to support editing existing entries
- Accept an optional `education` prop with existing data
- When provided, pre-fill the form and use `UPDATE` instead of `INSERT`
- Change the dialog title/button text accordingly ("Edit Education" vs "Add Education")

### 2. Add edit/delete buttons to each education entry in `MemberProfile.tsx`
- Add a Pencil icon button that opens the `EditEducationDialog` with the selected entry's data
- Add a Trash icon button that deletes the entry (with confirmation)
- Only show these buttons when viewing your own profile (`isOwnProfile`)

### 3. Add delete handler in `MemberProfile.tsx`
- Add a `handleDeleteEducation` function that calls `supabase.from('education').delete()` for the selected entry
- Show a success/error toast and refresh the profile

### Files to modify:
- `src/components/member/EditEducationDialog.tsx` -- support edit mode with pre-filled data
- `src/pages/member/MemberProfile.tsx` -- add edit/delete buttons and delete handler for education entries
