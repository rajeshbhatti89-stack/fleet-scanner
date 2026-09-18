import { createWorker } from 'tesseract.js';
import { enhanceForOcr } from './imageUtils';

export interface OcrResult {
  rawText: string;
  extractedNumber: number | null;
  confidence: number;
  filteredCandidates: number[];
}

let ocrWorker: any = null;

export const getOcrWorker = async (onProgress?: (progress: number, status: string) => void) => {
  if (!ocrWorker) {
    ocrWorker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100), m.status);
        }
      }
    });

    // Whitelist numbers and decimal points to maximize accuracy on odometer and hour meters
    await ocrWorker.setParameters({
      tessedit_char_whitelist: '0123456789.',
      tessedit_pageseg_mode: '7', // Treat the image as a single text line
    });
  }
  return ocrWorker;
};

/**
 * Extracts numeric meter reading from an image or cropped meter canvas
 */
export const extractMeterReading = async (
  imageSrc: string,
  onProgress?: (progress: number, status: string) => void
): Promise<OcrResult> => {
  try {
    // 1. Enhance contrast and grayscale for OCR
    const preprocessed = await enhanceForOcr(imageSrc);

    // 2. Initialize or retrieve worker
    const worker = await getOcrWorker(onProgress);

    // 3. Recognize
    const ret = await worker.recognize(preprocessed);
    const rawText = ret.data.text || '';
    const confidence = Math.round(ret.data.confidence || 0);

    // 4. Clean text and extract numbers
    // Replace commas with dots if user/machine has European decimal notation
    const normalized = rawText.replace(/,/g, '.').replace(/[^0-9.]/g, ' ');
    const parts = normalized.split(/\s+/).filter(Boolean);

    const candidates: number[] = [];
    for (const part of parts) {
      const num = parseFloat(part);
      if (!isNaN(num) && num >= 0 && num < 10000000) {
        candidates.push(num);
      }
    }

    // Pick the most likely candidate: odometer / hour meter typically is the largest contiguous number
    let extractedNumber: number | null = null;
    if (candidates.length > 0) {
      // Find candidate with longest integer portion or highest magnitude
      extractedNumber = candidates.reduce((prev, curr) => (curr > prev ? curr : prev), candidates[0]);
    }

    return {
      rawText: rawText.trim(),
      extractedNumber,
      confidence,
      filteredCandidates: candidates
    };
  } catch (err) {
    console.error('OCR Extraction error:', err);
    return {
      rawText: '',
      extractedNumber: null,
      confidence: 0,
      filteredCandidates: []
    };
  }
};
