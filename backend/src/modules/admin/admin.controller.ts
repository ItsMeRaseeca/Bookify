/**
 * Admin Controller
 * ================
 * HTTP request handlers for admin dashboard.
 */

import { Request, Response } from 'express';
import * as adminService from './admin.service.js';

/**
 * GET /admin/metrics
 * Get platform-wide metrics
 */
export async function getMetrics(_req: Request, res: Response) {
  const metrics = await adminService.getMetrics();
  
  res.status(200).json({
    success: true,
    metrics,
  });
}

/**
 * GET /admin/services
 * Get all services (read-only)
 */
export async function getAllServices(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await adminService.getAllServices({ page, limit });
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * GET /admin/users
 * Get all users
 */
export async function getAllUsers(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const role = req.query.role as string | undefined;

  const result = await adminService.getAllUsers({ page, limit, role });
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * GET /admin/bookings
 * Get all bookings
 */
export async function getAllBookings(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string | undefined;

  const result = await adminService.getAllBookings({ page, limit, status });
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * GET /admin/activity
 * Get recent activity
 */
export async function getRecentActivity(_req: Request, res: Response) {
  const activity = await adminService.getRecentActivity();
  
  res.status(200).json({
    success: true,
    activity,
  });
}
