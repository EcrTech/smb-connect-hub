

# Fix: Mobile Navigation Routes for Association Context

## Problem
When logged in as an Association Manager (e.g., Bharat DtoC) and on the Association Feed (`/association/feed`), the bottom mobile navigation bar uses hardcoded member routes like `/feed`, `/members`, `/messages`. Clicking any of these takes the user out of the association context and into the member area. Navigating back then lands on the main dashboard instead of the association feed.

## Solution
Update `MobileNavigation` to detect the current route context (association, company, or member) and adjust navigation paths accordingly.

- If the user is on an `/association/*` route, the "Feed" button should go to `/association/feed`, "Members" to `/association/members`, etc.
- If on a `/company/*` route, use company-prefixed routes.
- Otherwise, use the default member routes.

## Technical Details

### File: `src/components/layout/MobileNavigation.tsx`

1. Detect the current context from `location.pathname`:
   - Starts with `/association` --> association context
   - Starts with `/company` --> company context
   - Otherwise --> member context (default)

2. Replace static `navItems` with dynamic path resolution:

```text
Association context:
  Feed    --> /association/feed
  Members --> /association/members
  Messages --> /messages (shared route)
  Saved   --> /saved-posts (shared route)
  Alerts  --> /notifications (shared route)

Company context:
  Feed    --> /company/feed
  Members --> /company/members
  Messages --> /messages (shared route)
  Saved   --> /saved-posts (shared route)
  Alerts  --> /notifications (shared route)

Member context (default, unchanged):
  Feed    --> /feed
  Members --> /members
  Messages --> /messages
  Saved   --> /saved-posts
  Alerts  --> /notifications
```

3. Update the `isActive` check to account for the context-aware paths.

This ensures navigation stays within the correct role context and prevents unintended redirects to the dashboard.

