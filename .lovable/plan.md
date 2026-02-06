

## Fix LinkedIn-Style Image Display and Validation

Two changes are needed to match LinkedIn's image handling: how images are **displayed** and the minimum size allowed.

---

### Problem

Images downloaded from LinkedIn appear blurred or improperly scaled because:

1. **Display uses `object-cover`** -- This CSS property crops images to fill the container, cutting off parts of the image and stretching/blurring non-standard aspect ratios
2. **Minimum dimension may still be too restrictive** -- Some LinkedIn-sourced images may be smaller than 400px in one dimension

---

### Changes

**1. Fix Image Display (6 files)**

Change all post image rendering from `object-cover` (crops to fill) to `object-contain` (fits entire image without cropping), and add a background color so the image container looks clean.

| File | Current | Updated |
|------|---------|---------|
| `src/pages/member/MemberFeed.tsx` | `object-cover` | `object-contain bg-gray-100` |
| `src/pages/member/MemberProfile.tsx` (2 places) | `object-cover` | `object-contain bg-gray-100` |
| `src/pages/member/SavedPosts.tsx` | `object-cover` | `object-contain bg-gray-100` |
| `src/pages/company/CompanyFeed.tsx` | `object-cover` | `object-contain bg-gray-100` |
| `src/pages/association/AssociationFeed.tsx` | `object-cover` | `object-contain bg-gray-100` |

This ensures the full image is always visible without cropping or distortion, matching how LinkedIn displays post images.

**2. Lower Minimum Dimensions (1 file)**

In `src/lib/uploadValidation.ts`, reduce the minimum from 400x400 to 200x200 to accept more images including smaller LinkedIn downloads:

```
MIN_WIDTH:  400 --> 200
MIN_HEIGHT: 400 --> 200
```

---

### Technical Details

The CSS change on each post image tag:

```html
<!-- Before -->
<img className="mt-4 rounded-lg max-h-96 w-full object-cover" />

<!-- After -->
<img className="mt-4 rounded-lg max-h-96 w-full object-contain bg-gray-100 rounded-lg" />
```

- `object-contain` preserves the full image and aspect ratio
- `bg-gray-100` provides a subtle background for images that don't fill the full width (e.g., tall portrait images)
- `max-h-96` (384px max height) is kept to prevent overly tall images from dominating the feed

