
# Fix: Tagged Mentions Not Rendering and Links Not Working

## Problem
Tagged people like @Sandipan Ray are showing as raw markup text (e.g., `@[Sandipan Ray](member:uuid)`) instead of being rendered as clickable names. URLs in posts are also not working as clickable links.

## Root Cause
There are two bugs:

1. **URL linkification bug in MentionText.tsx**: The `linkifySegment` function uses a URL regex with the `g` (global) flag, then calls `.test()` on it inside a `.map()` loop. With the `g` flag, `.test()` advances an internal cursor (`lastIndex`), causing it to alternately match and miss URLs. This makes URL detection unreliable and can also interfere with the rendering of text segments around mentions.

2. **CompanyFeed.tsx uses wrong component**: The Company Feed uses `LinkifiedText` (which only handles URLs) instead of `MentionText` (which handles both mentions and URLs). So mentions in company feed posts always show as raw text.

## Solution

### 1. Fix `src/components/post/MentionText.tsx`
- Remove the `g` flag from `urlPattern` in `linkifySegment`, or create a new regex instance for each `.test()` call to avoid the `lastIndex` state bug
- This ensures every URL is correctly detected and every text segment renders properly

### 2. Fix `src/lib/linkify.tsx`
- Apply the same fix to the `linkifyText` function which has the identical bug

### 3. Fix `src/pages/company/CompanyFeed.tsx`
- Replace `LinkifiedText` import with `MentionText` import
- Replace `<LinkifiedText>` usage with `<MentionText>` so mentions are properly rendered in company feed posts

### Technical Details

**Files to modify:**
- `src/components/post/MentionText.tsx` -- fix the regex `g` flag bug in `linkifySegment`
- `src/lib/linkify.tsx` -- fix the same regex bug in `linkifyText`
- `src/pages/company/CompanyFeed.tsx` -- switch from `LinkifiedText` to `MentionText`
