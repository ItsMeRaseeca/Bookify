/**
 * Cloudinary Upload Service
 * =========================
 * Image upload functionality using Cloudinary.
 */

import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { BadRequestError, InternalError } from '../lib/errors.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload an image buffer to Cloudinary
 */
export async function uploadImage(
  fileBuffer: Buffer,
  mimeType: string,
  folder = 'services'
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new BadRequestError(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new BadRequestError('File size exceeds 5MB limit');
  }

  try {
    // Convert buffer to base64 data URI
    const base64 = fileBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `service-booking/${folder}`,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 800, crop: 'limit' }, // Max dimensions
        { quality: 'auto:good' }, // Auto optimize quality
        { fetch_format: 'auto' }, // Auto select best format
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new InternalError('Failed to upload image');
  }
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Don't throw - deletion failure shouldn't break the flow
  }
}

/**
 * Get optimized URL for an image
 */
export function getOptimizedUrl(
  publicId: string,
  width?: number,
  height?: number
): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: width || 800, height: height || 600, crop: 'fill' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  });
}
