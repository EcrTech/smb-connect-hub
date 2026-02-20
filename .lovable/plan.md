

# Fix Repost Display: Show Reposter's Identity Instead of Original Author

## Problem
When Rahul reposts Prerna Arora's post, the post card incorrectly shows Prerna's name, initials, and profile link -- even though the avatar image was already fixed. The "Rahul reposted Prerna Arora" banner is correct, but the main post identity (avatar fallback, name, profile navigation) still points to the original author instead of the reposter.

## Root Cause
The previous fix only updated the avatar image `src` to use `post.profiles?.avatar` (the reposter). However, the following elements still reference `post.original_author`:
- **Avatar fallback initials** -- shows Prerna's initials
- **Display name** -- shows "Prerna Arora" instead of "Rahul Upadhyay"
- **Profile link (onClick)** -- navigates to Prerna's profile

Additionally, since Rahul has no avatar uploaded, the fallback initials kick in and show "PA" (Prerna Arora) instead of "RU" (Rahul Upadhyay).

## Solution
Update all three feed files so that for reposts, the post card consistently shows the **reposter's** identity (avatar, name, initials, profile link). The "reposted from [Original Author]" banner already correctly identifies the original content creator.

## Technical Details

### Files to modify:

**1. `src/pages/association/AssociationFeed.tsx`**
- Line 1226: Change profile link from `post.original_author_id || post.user_id` to `post.user_id`
- Lines 1239-1242: Change fallback initials to always use `post.profiles` instead of `post.original_author`
- Line 1253: Change profile link from `post.original_author_id || post.user_id` to `post.user_id`
- Lines 1259-1262: Change display name to always use `post.profiles` instead of `post.original_author`

**2. `src/pages/member/MemberFeed.tsx`**
- Line 1153: Change profile link from `post.original_author_id || post.user_id` to `post.user_id`
- Line 1168: Same profile link fix for the name element

**3. `src/pages/company/CompanyFeed.tsx`**
- Line 1026: Change profile link from `post.original_author_id || post.user_id` to `post.user_id`
- Lines 1039-1041: Change fallback initials to always use `post.profiles` instead of `post.original_author`
- Line 1053: Change profile link from `post.original_author_id || post.user_id` to `post.user_id`
- Lines 1059-1061: Change display name to always use `post.profiles` instead of `post.original_author`

### Result
For a repost by Rahul of Prerna's content:
- Banner: "Rahul Upadhyay reposted Prerna Arora" (unchanged, already correct)
- Avatar/Name/Link: Shows Rahul Upadhyay's identity
- Post content: Shows the original post content (unchanged)

