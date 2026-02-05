

## Allow Flexible Image Dimensions (LinkedIn-Style)

Align with LinkedIn's actual image handling policy, which is **permissive rather than restrictive** on exact dimensions.

---

### Current Problem

The validation is rejecting an 889px height image because it only allows these specific heights:
- 627, 800, 1080, 1200, or 1350 pixels

However, **LinkedIn doesn't actually enforce strict dimension requirements** - it accepts a wide range of sizes and handles resizing/cropping automatically.

---

### LinkedIn's Actual Policy

| Requirement | LinkedIn Standard |
|-------------|-------------------|
| **Minimum Width** | 552px (will be accepted but may look low quality) |
| **Recommended Width** | 1200px for optimal quality |
| **Maximum File Size** | 8MB |
| **Aspect Ratio** | Flexible (1.91:1 to 1:1 most common) |
| **Dimension Enforcement** | None - LinkedIn auto-crops/resizes |

---

### Proposed Change

Instead of validating for specific heights, use **minimum dimension requirements** like LinkedIn:

| Setting | Current | New (LinkedIn-Style) |
|---------|---------|----------------------|
| **Min Width** | None | 400px |
| **Min Height** | Must be exactly 627/800/1080/1200/1350 | 400px |
| **Max Width** | 4000px | 4096px |
| **Max Height** | 4000px | 4096px |
| **Max File Size** | 8MB | 8MB (no change) |

---

### What This Means

- Images like 889px height will now be **accepted**
- Any image at least 400x400px and under 8MB will be valid
- Extremely small images (under 400px) will be rejected with a helpful message
- The platform displays images responsively anyway, so exact dimensions aren't critical

---

### File to Modify

| File | Changes |
|------|---------|
| `src/lib/uploadValidation.ts` | Replace height-only validation with minimum dimension check |

---

### Technical Details

**Updated Constants:**

```typescript
// Post image dimension limits (LinkedIn-style)
export const POST_IMAGE_LIMITS = {
  MIN_WIDTH: 400,      // Minimum for acceptable quality
  MIN_HEIGHT: 400,     // Minimum for acceptable quality
  MAX_WIDTH: 4096,     // Maximum allowed
  MAX_HEIGHT: 4096,    // Maximum allowed
  RECOMMENDED_WIDTH: 1200,  // For optimal quality
} as const;
```

**Updated Validation Logic:**

```typescript
export const validatePostImageDimensions = (file: File): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      
      // Check minimum dimensions
      if (width < POST_IMAGE_LIMITS.MIN_WIDTH || height < POST_IMAGE_LIMITS.MIN_HEIGHT) {
        resolve({
          valid: false,
          error: `Image is too small (${width}x${height}px). Minimum size is ${POST_IMAGE_LIMITS.MIN_WIDTH}x${POST_IMAGE_LIMITS.MIN_HEIGHT}px.`,
        });
        return;
      }
      
      // Check maximum dimensions
      if (width > POST_IMAGE_LIMITS.MAX_WIDTH || height > POST_IMAGE_LIMITS.MAX_HEIGHT) {
        resolve({
          valid: false,
          error: `Image is too large (${width}x${height}px). Maximum size is ${POST_IMAGE_LIMITS.MAX_WIDTH}x${POST_IMAGE_LIMITS.MAX_HEIGHT}px.`,
        });
        return;
      }
      
      resolve({ valid: true });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: 'Failed to load image' });
    };
    
    img.src = url;
  });
};
```

---

### Benefits

1. **User-Friendly**: Users can upload images without resizing to exact dimensions
2. **LinkedIn-Compatible**: Matches how LinkedIn actually handles images
3. **Quality Guardrails**: Still prevents very small (low quality) or oversized images
4. **Flexible Aspect Ratios**: Square, portrait, landscape - all accepted

