
# Show Full Association Page from Search Results

## Problem
When a member clicks on an association from search results, they see a basic profile page with just contact info and details. Instead, they should see the full association page with posts, images, updates, tabs (Posts, About, Members, Companies), cover image/banner, and the association's complete feed -- like how association managers see their own page.

## Solution
Rebuild the `MemberAssociationProfileView` page (`src/pages/member/AssociationProfileView.tsx`) to display the full association experience by:

1. Loading the association by the URL `:id` parameter (instead of the current user's manager role)
2. Showing the association profile header with cover image, logo, name, location, member/company counts
3. Adding tabs: Posts, About, Members, Companies
4. Displaying the association's posts feed (read-only, no post composer since the viewer is not a manager)
5. Showing About info (description, contact, social links, functionaries)
6. Listing member and company directories for that association

## Technical Details

### File to Rewrite: `src/pages/member/AssociationProfileView.tsx`

The page will be restructured to include:

- **Header section**: Cover image, logo, association name, industry, location, member/company counts, Message and Follow buttons
- **Tabs**: Posts | About | Members | Companies
- **Posts tab**: Fetch posts where `post_context = 'association'` and `organization_id = association.id`, with content filter (All/Images/Videos) and sort (Recent/Top). Display with likes, comments, shares -- all read-only viewing with engagement actions (like, comment, share, bookmark)
- **About tab**: Existing contact info, details, social links, and key functionaries (current content reorganized into this tab)
- **Members tab**: List members associated with this association
- **Companies tab**: List companies under this association

### Data Queries
- Association info: `associations` table by `:id`
- Posts: `posts` table filtered by `post_context = 'association'` and `organization_id = :id`
- Members: Via `association_members` or `company_members` join
- Companies: `companies` table filtered by `association_id = :id`
- Key functionaries: `key_functionaries_public` table

### Components Reused
- `MentionText` for post content rendering
- `CommentsSection` for post comments
- `SharePostDropdown`, `BookmarkButton`, `PostEngagementBadge` for post interactions
- `BackButton` for navigation
- `UniversalSearch` in header
- `MobileNavigation`, `FloatingChat` for layout consistency
