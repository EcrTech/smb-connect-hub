
# Fix Posts Appearing on Admin Profile Instead of Association Page

## Problem
When a user (e.g., Rahul Upadhyay) creates posts on behalf of an association, those posts appear on their personal Member Profile page. This happens because the profile page queries all posts by `user_id` without filtering out posts that belong to an association or company context.

The association page query itself is correct -- it properly filters by `post_context = 'association'` and `organization_id`. The issue is that the same posts also leak onto the personal profile.

## Solution
Filter out organization-context posts from the personal profile feed so they only appear on their respective association (or company) pages.

## Technical Details

### File: `src/pages/member/MemberProfile.tsx`

Update the posts query (around line 272) to exclude posts that have a `post_context` of `'association'` or `'company'`. Change:

```typescript
const { data: postsData, error } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

To:

```typescript
const { data: postsData, error } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId)
  .or('post_context.is.null,post_context.eq.member')
  .order('created_at', { ascending: false });
```

This ensures only personal/member posts show on the profile, while association and company posts remain exclusively on their respective organization pages.

No other files need changes -- the association page already correctly queries posts by `post_context` and `organization_id`.
