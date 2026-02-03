

## Update Post Image Dimensions and Size Limits

Align the post image validation with the LinkedIn-style specifications you provided.

---

### Current vs Requested Comparison

| Setting | Current | Requested | Action |
|---------|---------|-----------|--------|
| **Post - Square** | 1080 x 1080 | 1080 x 1080 | No change needed |
| **Post - Landscape** | 1200 x 627 | 1200 x 627 | No change needed |
| **Post - Portrait** | 1080 x 1350 (4:5) | 1200 x 1200 | **Add as new option** |
| **Post File Size** | 5 MB | 8 MB | **Increase limit** |
| **Document Size** | 10 MB | 100 MB | **Increase limit** |
| **Formats** | JPG, PNG | JPG, PNG | No change needed |

---

### What We'll Change

**1. Add 1200x1200 Portrait Option**

Currently, portrait posts require 1080x1350 (4:5 ratio). We'll add support for 1200x1200 as an alternative portrait format while keeping the existing option.

**2. Increase Post Image Size Limit**

Update from 5MB to 8MB to match LinkedIn's specifications.

**3. Increase Document (Carousel) Size Limit**

Update from 10MB to 100MB for document uploads in posts.

---

### File to Modify

| File | Changes |
|------|---------|
| `src/lib/uploadValidation.ts` | Update `POST_IMAGE_DIMENSIONS`, `FILE_SIZE_LIMITS`, and validation logic |

---

### Technical Details

**Updated Constants:**

```typescript
export const FILE_SIZE_LIMITS = {
  // ... other limits
  POST_IMAGE: 8 * 1024 * 1024,  // 8MB (was 5MB)
  DOCUMENT: 100 * 1024 * 1024,  // 100MB (was 10MB)
} as const;

export const POST_IMAGE_DIMENSIONS = {
  SQUARE: { width: 1080, height: 1080 },      // 1:1 - Feed posts
  PORTRAIT_4_5: { width: 1080, height: 1350 }, // 4:5 - Portrait (existing)
  PORTRAIT_1_1: { width: 1200, height: 1200 }, // 1:1 - Portrait (new)
  LANDSCAPE: { width: 1200, height: 627 },     // 1.91:1 - Link previews
} as const;
```

**Updated Validation Logic:**

The `validatePostImageDimensions` function will be updated to check for 4 formats instead of 3:
- 1080 x 1080 (Square)
- 1080 x 1350 (Portrait 4:5)
- 1200 x 1200 (Portrait 1:1) - **NEW**
- 1200 x 627 (Landscape)

---

### Error Message Update

The error message will be updated to reflect all allowed formats:

```
"Image dimensions (WxH) don't match allowed formats: 
1080x1080 (square), 1080x1350 (portrait 4:5), 
1200x1200 (portrait), or 1200x627 (landscape). 
Please resize your image."
```

---

### Other Image Types (No Changes Needed)

The following specifications you mentioned are for profile/company images which use different validation with maximum limits rather than exact dimensions. These are already adequately covered:

- **Profile Picture (400x400)**: Current max 1000x1000 allows this
- **Personal Background (1584x396)**: Current max 2000x1000 allows this  
- **Company Logo (400x400)**: Current system allows this
- **Company Banner (1128x191)**: Current max 2000x1000 allows this
- **Event Banner (1600x900)**: Uses general validation, within limits

These use flexible "maximum" validation rather than exact-match validation, so they already accept the sizes you specified.

