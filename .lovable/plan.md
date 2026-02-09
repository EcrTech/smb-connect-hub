

## Debug and Fix Association Post Button for Prerna

### Problem

The Post button appears enabled (green) but clicking it produces no result. The user "Prerna" is a valid association manager for "The Rise" but has zero posts in the database. The error is being swallowed silently somewhere in the `handleCreatePost` flow.

### Root Cause Analysis

After thorough investigation:
- Prerna IS in `association_managers` table with role `manager` for "The Rise" -- so `associationInfo` should load correctly
- RLS policies on `posts` table are correct (`auth.uid() = user_id` for INSERT)
- Storage policies on `profile-images` are correct (folder-based auth check)
- No database errors in logs
- The `content` column is NOT NULL, but empty strings are allowed

The most likely cause is that the **error is caught silently** in `handleCreatePost`. The `uploadImage` function catches errors and returns `null` without surfacing them, and the main catch block shows a generic toast that may not be visible or may flash too quickly.

### Solution

Add detailed console logging throughout `handleCreatePost` to trace exactly where the flow stops, and also improve error surfacing:

**File: `src/pages/association/AssociationFeed.tsx`**

1. Add `console.log` at key checkpoints in `handleCreatePost`:
   - Before the early returns (content check, associationInfo check)
   - Before and after storage upload
   - Before and after the database insert
   - In the catch block with the actual error details

2. In `uploadImage`, log the actual upload error instead of only logging to console (which may not be checked). Also add the error to the toast so the user sees what went wrong.

3. If the upload fails (returns null) but the user attached an image, **stop the post creation and show an error** instead of silently inserting a post without the image.

### Technical Changes

```typescript
// In handleCreatePost - add logging and stop on upload failure
const handleCreatePost = async () => {
  console.log('handleCreatePost called', { 
    newPost: newPost.trim(), 
    imageFile: !!imageFile, 
    associationInfoId: associationInfo?.id,
    currentUserId 
  });
  
  if (!newPost.trim() && !imageFile && !videoFile && !documentFile) {
    console.log('No content - returning early');
    return;
  }

  if (!associationInfo?.id) {
    console.log('No association info - showing error');
    // ... existing toast
    return;
  }

  setPosting(true);
  try {
    let imageUrl = null;
    
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      if (!imageUrl) {
        toast({ title: 'Error', description: 'Failed to upload image. Please try again.', variant: 'destructive' });
        setPosting(false);
        return;
      }
    }
    
    // ... rest of upload logic with same pattern for video/document
    
    const { error } = await supabase.from('posts').insert([...]);
    
    if (error) {
      console.error('Post insert error:', error);
      throw error;
    }
    
    // ... success handling
  } catch (error: any) {
    console.error('handleCreatePost error:', error);
    toast({
      title: 'Error',
      description: error?.message || 'Failed to create post',
      variant: 'destructive',
    });
  } finally {
    setPosting(false);
  }
};

// In uploadImage - better error handling
const uploadImage = async (file: File): Promise<string | null> => {
  try {
    console.log('Uploading file:', file.name, file.size, file.type);
    // ... existing upload code
  } catch (error: any) {
    console.error('Upload error details:', error);
    toast({
      title: 'Upload Error',
      description: error?.message || 'Failed to upload file',
      variant: 'destructive',
    });
    return null;
  }
};
```

### Summary

| File | Change |
|------|--------|
| `src/pages/association/AssociationFeed.tsx` | Add console logging, stop post if upload fails, surface actual error messages in toasts |

This will either fix the issue (if it's a silent upload failure) or provide the exact error message on the next attempt so we can address the root cause.
