
# Fix: Feed Button Not Responding on Association Feed Page

## Problem
When on the Association Feed page and viewing a non-Posts tab (About, Members, Companies), clicking the "Feed" button in the desktop navigation bar does not visibly change anything. The button scrolls to top and reloads posts data, but it does not switch the active tab back to "Posts", so the user sees no change.

## Solution
Update the Feed button's `onClick` handler to also reset `activeTab` to `'posts'`, so clicking Feed always brings the user back to the posts view.

## Technical Details

### File: `src/pages/association/AssociationFeed.tsx`

**Line 831** - Update the onClick handler:

```typescript
// From:
onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); loadPosts(); }}

// To:
onClick={() => { setActiveTab('posts'); window.scrollTo({ top: 0, behavior: 'smooth' }); loadPosts(); }}
```

This single-line change ensures that clicking the Feed button:
1. Switches to the Posts tab (if on About/Members/Companies)
2. Scrolls to the top of the page
3. Refreshes the feed content
