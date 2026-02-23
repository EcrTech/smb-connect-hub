

# Fix: "Currently Working" Employment Status Causes Database Error

## Problem
When selecting "Currently working" in the Edit Profile dialog, the save fails with:
> "new row for relation 'profiles' violates check constraint 'employment_status_check'"

The database only allows these values: `open_to_opportunities`, `actively_looking`, `hiring`, `not_looking`, `open_to_consulting`, `available_for_freelance`.

The value `currently_working` exists in the UI dropdown but is **not** included in the database constraint.

## Solution
Add `currently_working` to the database check constraint so it matches the UI options.

### Changes:
1. **Database migration** -- Update the `employment_status_check` constraint on the `profiles` table to include `currently_working`:
   ```sql
   ALTER TABLE public.profiles DROP CONSTRAINT employment_status_check;
   ALTER TABLE public.profiles ADD CONSTRAINT employment_status_check 
     CHECK (employment_status IS NULL OR employment_status = ANY(ARRAY[
       'currently_working', 'open_to_opportunities', 'actively_looking', 
       'hiring', 'not_looking', 'open_to_consulting', 'available_for_freelance'
     ]));
   ```

2. **Update display in MemberProfile.tsx** -- The display code for `currently_working` already exists (line 1054), so no frontend changes are needed.

No other files need modification.

