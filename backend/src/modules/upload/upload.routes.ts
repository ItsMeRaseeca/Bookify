/**
 * Upload Routes
 * =============
 * Routes for file uploads (Cloudinary).
 */

import { Router } from 'express';
import multer from 'multer';
import * as uploadController from './upload.controller.js';
import { authenticate, requireOrganizer } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = Router();

// Configure Multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only images
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

// All routes require authentication + organizer role
router.use(authenticate);
router.use(requireOrganizer);

/**
 * POST /upload/image
 * Upload an image to Cloudinary
 */
router.post(
  '/image',
  upload.single('image'),
  asyncHandler(uploadController.uploadServiceImage)
);

export default router;
