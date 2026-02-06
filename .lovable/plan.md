

## Make Association Posts Visible and Notified to All Members

Association posts are currently isolated to the association feed only. This plan makes them visible in every member's feed and sends a notification to all platform members when an association creates a post.

---

### Change 1: Show Association Posts in Member Feed

**File:** `src/pages/member/MemberFeed.tsx`

Update the post query filter from:
```
.or('post_context.is.null,post_context.eq.member')
```
to:
```
.or('post_context.is.null,post_context.eq.member,post_context.eq.association')
```

This single filter change makes all association posts appear in the member feed alongside regular member posts.

Additionally, update the post rendering logic to display association branding (logo, name) for association-context posts instead of the individual user's profile, matching how they appear in the association feed.

---

### Change 2: Show Association Posts in Member Profile (Activity Tab)

**File:** `src/pages/member/MemberProfile.tsx`

If similar `post_context` filtering exists, update it to also include `association` posts.

---

### Change 3: Database Trigger for Notifications

Create a database trigger function that fires when a new post with `post_context = 'association'` is inserted. It will:

1. Look up the association name from the `organization_id`
2. Insert a notification row for every active member (all `user_id` values from the `members` table where `is_active = true`)
3. Skip the post author to avoid self-notification

```sql
CREATE OR REPLACE FUNCTION public.notify_association_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assoc_name text;
  member_record record;
BEGIN
  -- Only trigger for association posts
  IF NEW.post_context != 'association' OR NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get association name
  SELECT name INTO assoc_name
  FROM associations
  WHERE id = NEW.organization_id;

  -- Notify all active members except the post author
  INSERT INTO notifications (user_id, type, category, title, message, link, data)
  SELECT DISTINCT
    m.user_id,
    'association_post',
    'updates',
    'New Association Update',
    CONCAT(COALESCE(assoc_name, 'An association'), ' shared a new post'),
    '/feed',
    jsonb_build_object(
      'post_id', NEW.id,
      'association_id', NEW.organization_id,
      'association_name', assoc_name
    )
  FROM members m
  WHERE m.is_active = true
    AND m.user_id != NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_association_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_association_post();
```

---

### Change 4: Update Notification Display

**File:** `src/components/notifications/NotificationsDropdown.tsx` (and related notification rendering)

Add handling for the new `association_post` notification type with an appropriate icon (e.g., Building2) so it displays correctly in the notification list.

---

### Summary of Files

| File | Change |
|------|--------|
| `src/pages/member/MemberFeed.tsx` | Include association posts in query + render with association branding |
| `src/pages/member/MemberProfile.tsx` | Include association posts if filtered |
| `src/components/notifications/NotificationsDropdown.tsx` | Handle `association_post` notification type |
| Database migration | Add `notify_association_post()` trigger function |

