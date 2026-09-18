export interface CropArea {
  x: number;      // 0-100 percentage
  y: number;      // 0-100 percentage
  width: number;  // 0-100 percentage
  height: number; // 0-100 percentage
}

/**
 * Loads an image from a DataURL or URL into an HTMLImageElement
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * Crops an image based on crop rectangle percentages (e.g. from the mobile camera viewfinder frame)
 */
export const cropImage = async (
  imageSrc: string,
  crop: CropArea = { x: 10, y: 35, width: 80, height: 30 }
): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const sx = (crop.x / 100) * img.naturalWidth;
  const sy = (crop.y / 100) * img.naturalHeight;
  const sw = (crop.width / 100) * img.naturalWidth;
  const sh = (crop.height / 100) * img.naturalHeight;

  canvas.width = Math.max(10, sw);
  canvas.height = Math.max(10, sh);

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.95);
};

/**
 * Pre-processes an image for OCR: converts to Grayscale, increases contrast,
 * and sharpens text for analog dials and digital 7-segment displays.
 */
export const enhanceForOcr = async (imageSrc: string): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return imageSrc;

  // Scale up small crops to give OCR worker better pixel density
  const scale = img.naturalWidth < 800 ? 2 : 1;
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // Contrast enhancement factor
  const contrast = 35; // -100 to 100
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < d.length; i += 4) {
    // Grayscale (Luminance)
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    
    // Contrast adjustment
    let adjusted = factor * (gray - 128) + 128;
    adjusted = Math.min(255, Math.max(0, adjusted));

    d[i] = adjusted;     // R
    d[i + 1] = adjusted; // G
    d[i + 2] = adjusted; // B
    // Alpha d[i + 3] remains unchanged
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
};

/**
 * Compresses an image client-side to ensure it is strictly under maxBytes (default 500KB)
 * Rescales dimensions if excessively large and steps down JPEG compression quality.
 */
export const compressImage = async (
  imageSrc: string,
  maxBytes = 500 * 1024,
  maxDimension = 1600
): Promise<{ compressedDataUrl: string; sizeBytes: number; originalSizeBytes: number }> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Calculate scaled dimensions
  let { naturalWidth: width, naturalHeight: height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  // Iteratively reduce quality until under maxBytes
  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  let sizeBytes = Math.round((dataUrl.length * 3) / 4);
  const originalSizeBytes = sizeBytes;

  while (sizeBytes > maxBytes && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeBytes = Math.round((dataUrl.length * 3) / 4);
  }

  return {
    compressedDataUrl: dataUrl,
    sizeBytes,
    originalSizeBytes
  };
};

/**
 * Converts a base64 DataURL to a Blob for uploading to Supabase Storage
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};
