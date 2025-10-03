/**
 * Upload validation utilities for file and image uploads
 */

// File size limits in bytes
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5MB for images
  DOCUMENT: 10 * 1024 * 1024,   // 10MB for documents (CSV, PDF, etc.)
  AVATAR: 2 * 1024 * 1024,      // 2MB for avatars
  COVER: 5 * 1024 * 1024,       // 5MB for cover images
} as const;

// Image dimension limits in pixels
export const IMAGE_DIMENSION_LIMITS = {
  MAX_WIDTH: 4000,
  MAX_HEIGHT: 4000,
  AVATAR_MAX: 1000,    // Square dimension for avatars
  COVER_MAX_WIDTH: 2000,
  COVER_MAX_HEIGHT: 1000,
} as const;

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENTS: ['text/csv', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
} as const;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate image dimensions
 */
export const validateImageDimensions = (
  file: File,
  maxWidth: number = IMAGE_DIMENSION_LIMITS.MAX_WIDTH,
  maxHeight: number = IMAGE_DIMENSION_LIMITS.MAX_HEIGHT
): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      if (img.width > maxWidth || img.height > maxHeight) {
        resolve({
          valid: false,
          error: `Image dimensions should not exceed ${maxWidth}x${maxHeight}px. Current: ${img.width}x${img.height}px`,
        });
      } else {
        resolve({ valid: true });
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Failed to load image',
      });
    };
    
    img.src = url;
  });
};

/**
 * Validate file size
 */
export const validateFileSize = (file: File, maxSize: number): ValidationResult => {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size should be less than ${maxSizeMB}MB. Current: ${fileSizeMB}MB`,
    };
  }
  return { valid: true };
};

/**
 * Validate file type
 */
export const validateFileType = (file: File, allowedTypes: readonly string[]): ValidationResult => {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  return { valid: true };
};

/**
 * Complete validation for avatar uploads
 */
export const validateAvatarUpload = async (file: File): Promise<ValidationResult> => {
  // Check file type
  const typeCheck = validateFileType(file, ALLOWED_FILE_TYPES.IMAGES);
  if (!typeCheck.valid) return typeCheck;
  
  // Check file size
  const sizeCheck = validateFileSize(file, FILE_SIZE_LIMITS.AVATAR);
  if (!sizeCheck.valid) return sizeCheck;
  
  // Check dimensions
  const dimensionCheck = await validateImageDimensions(
    file,
    IMAGE_DIMENSION_LIMITS.AVATAR_MAX,
    IMAGE_DIMENSION_LIMITS.AVATAR_MAX
  );
  return dimensionCheck;
};

/**
 * Complete validation for cover image uploads
 */
export const validateCoverImageUpload = async (file: File): Promise<ValidationResult> => {
  // Check file type
  const typeCheck = validateFileType(file, ALLOWED_FILE_TYPES.IMAGES);
  if (!typeCheck.valid) return typeCheck;
  
  // Check file size
  const sizeCheck = validateFileSize(file, FILE_SIZE_LIMITS.COVER);
  if (!sizeCheck.valid) return sizeCheck;
  
  // Check dimensions
  const dimensionCheck = await validateImageDimensions(
    file,
    IMAGE_DIMENSION_LIMITS.COVER_MAX_WIDTH,
    IMAGE_DIMENSION_LIMITS.COVER_MAX_HEIGHT
  );
  return dimensionCheck;
};

/**
 * Complete validation for general image uploads
 */
export const validateImageUpload = async (file: File): Promise<ValidationResult> => {
  // Check file type
  const typeCheck = validateFileType(file, ALLOWED_FILE_TYPES.IMAGES);
  if (!typeCheck.valid) return typeCheck;
  
  // Check file size
  const sizeCheck = validateFileSize(file, FILE_SIZE_LIMITS.IMAGE);
  if (!sizeCheck.valid) return sizeCheck;
  
  // Check dimensions
  const dimensionCheck = await validateImageDimensions(file);
  return dimensionCheck;
};

/**
 * Complete validation for document uploads (CSV, PDF, etc.)
 */
export const validateDocumentUpload = (file: File): ValidationResult => {
  // Check file type
  const typeCheck = validateFileType(file, ALLOWED_FILE_TYPES.DOCUMENTS);
  if (!typeCheck.valid) return typeCheck;
  
  // Check file size
  const sizeCheck = validateFileSize(file, FILE_SIZE_LIMITS.DOCUMENT);
  return sizeCheck;
};
