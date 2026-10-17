/**
 * Image processing utilities for Unending Void.
 * Handles client-side resizing and compression for player avatars and tokens.
 */

/**
 * Resizes an image file if it exceeds the specified file size (default 1MB) or max dimensions.
 * Compresses down to an optimized base64 JPEG data URL suitable for Firestore storage.
 *
 * @param {File} file - The raw File object from file input
 * @param {number} maxDimension - Maximum width/height in pixels (default 512)
 * @param {number} maxSizeBytes - Threshold in bytes above which resizing is enforced (default 1MB = 1048576)
 * @returns {Promise<string>} Base64 Data URL of the resized image
 */
export function processProfileImage(file, maxDimension = 512, maxSizeBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('NO_FILE_PROVIDED'));
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('INVALID_FILE_TYPE'));
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        const isOverSize = file.size > maxSizeBytes;
        const isOverDimension = img.width > maxDimension || img.height > maxDimension;

        let targetWidth = img.width;
        let targetHeight = img.height;

        if (isOverSize || isOverDimension) {
          if (targetWidth > targetHeight) {
            if (targetWidth > maxDimension) {
              targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
              targetWidth = maxDimension;
            }
          } else {
            if (targetHeight > maxDimension) {
              targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
              targetHeight = maxDimension;
            }
          }
        }

        // Render to canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(event.target.result);
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Quality compression
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Progressively decrease quality if base64 size is still above ~700KB
        while (dataUrl.length > 700000 && quality > 0.4) {
          quality -= 0.15;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}
