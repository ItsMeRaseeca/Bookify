/**
 * Upload Controller
 * =================
 * HTTP request handlers for file uploads.
 */

import { Request, Response } from 'express';
import { uploadImage } from '../../services/upload.service.js';
import { BadRequestError } from '../../lib/errors.js';

/**
 * POST /upload/image
 * Upload an image to Cloudinary (ORGANIZER only)
 */
export async function uploadServiceImage(req: Request, res: Response) {
  const file = req.file;

  if (!file) {
    throw new BadRequestError('No image file provided');
  }

  const result = await uploadImage(file.buffer, file.mimetype, 'services');

  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully',
    image: {
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.size,
    },
  });
}
