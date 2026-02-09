
# Add @Mention Tagging for Members and Associations in Posts

## Overview
Add the ability to tag/mention members and associations in posts by typing `@` in the post composer. A dropdown will appear showing matching members and associations, and selecting one inserts a styled mention into the text.

## How It Will Work
1. When you type `@` followed by characters in the post text box, a dropdown appears with matching members and associations
2. Select a person or association from the dropdown to insert the mention
3. Mentions appear as clickable highlighted links in the published post
4. Clicking a mention navigates to that member's profile or association page

## Technical Details

### 1. New Database Table: `post_mentions`
Create a table to store which members/associations are mentioned in each post:
- `id` (UUID, primary key)
- `post_id` (UUID, references posts)
- `mentioned_user_id` (UUID, nullable -- for member mentions)
- `mentioned_association_id` (UUID, nullable -- for association mentions)
- `created_at` (timestamp)
- RLS: viewable by all authenticated users, insertable by post author

### 2. New Component: `MentionInput` 
A wrapper around the Textarea that:
- Detects `@` typing and extracts the search query after it
- Queries `profiles` table (members) and `associations` table in parallel
- Shows a positioned dropdown with results (avatar, name, type label)
- On selection, replaces `@query` with `@[Display Name](type:id)` markup in the text
- Handles keyboard navigation (arrow keys, Enter, Escape)

### 3. New Component: `MentionText`
A renderer that parses `@[Display Name](member:uuid)` or `@[Display Name](association:uuid)` patterns in post content and renders them as clickable styled links that navigate to the correct profile/association page.

### 4. Update Post Composer (MemberFeed.tsx and AssociationFeed.tsx)
- Replace the plain `<Textarea>` with the new `MentionInput` component
- On post submission, parse mentions from content and insert into `post_mentions` table

### 5. Update Post Display
- Replace plain text rendering with `MentionText` component so mentions appear as clickable links in all feed views (MemberFeed, AssociationFeed, SavedPosts)

### Files to Create
- `src/components/post/MentionInput.tsx` -- mention-aware text input
- `src/components/post/MentionText.tsx` -- mention renderer for display

### Files to Modify
- `src/pages/member/MemberFeed.tsx` -- use MentionInput in composer, MentionText in posts
- `src/pages/association/AssociationFeed.tsx` -- same changes
- `src/pages/member/SavedPosts.tsx` -- use MentionText for display

### Database Migration
- Create `post_mentions` table with RLS policies
