/**
 * Service Controller
 * ==================
 * HTTP request handlers for service management.
 */

import { Request, Response } from 'express';
import * as serviceService from './service.service.js';

// ============================================
// ORGANIZER ENDPOINTS
// ============================================

/**
 * POST /organizer/services
 * Create a new service
 */
export async function createService(req: Request, res: Response) {
  const result = await serviceService.createService(req.user!.id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Service created successfully',
    ...result,
  });
}

/**
 * GET /organizer/services
 * Get all services for the current organizer
 */
export async function getOrganizerServices(req: Request, res: Response) {
  const services = await serviceService.getOrganizerServices(req.user!.id);
  
  res.status(200).json({
    success: true,
    services,
  });
}

/**
 * GET /organizer/services/:id
 * Get a specific service owned by organizer
 */
export async function getOrganizerService(req: Request, res: Response) {
  const service = await serviceService.getOrganizerService(
    req.user!.id,
    req.params.id!
  );
  
  res.status(200).json({
    success: true,
    service,
  });
}

/**
 * PATCH /organizer/services/:id
 * Update a service
 */
export async function updateService(req: Request, res: Response) {
  const service = await serviceService.updateService(
    req.user!.id,
    req.params.id!,
    req.body
  );
  
  res.status(200).json({
    success: true,
    message: 'Service updated successfully',
    service,
  });
}

/**
 * PATCH /organizer/services/:id/publish
 * Publish or unpublish a service
 */
export async function publishService(req: Request, res: Response) {
  const service = await serviceService.publishService(
    req.user!.id,
    req.params.id!,
    req.body
  );
  
  res.status(200).json({
    success: true,
    message: service.published ? 'Service published' : 'Service unpublished',
    service,
  });
}

/**
 * DELETE /organizer/services/:id
 * Delete a service
 */
export async function deleteService(req: Request, res: Response) {
  const result = await serviceService.deleteService(req.user!.id, req.params.id!);
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * GET /organizer/stats
 * Get organizer dashboard statistics
 */
export async function getOrganizerStats(req: Request, res: Response) {
  const stats = await serviceService.getOrganizerStats(req.user!.id);
  
  res.status(200).json({
    success: true,
    stats,
  });
}

/**
 * GET /organizer/calendar
 * Get organizer calendar bookings for a specific month
 */
export async function getOrganizerCalendar(req: Request, res: Response) {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  
  const data = await serviceService.getOrganizerCalendarBookings(
    req.user!.id,
    year,
    month
  );
  
  res.status(200).json({
    success: true,
    ...data,
  });
}

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * GET /services
 * Get all published services (paginated)
 */
export async function getPublishedServices(req: Request, res: Response) {
  // Use validatedQuery from middleware (req.query is read-only in Express 5)
  const query = (req as any).validatedQuery || req.query;
  const result = await serviceService.getPublishedServices(query as never);
  
  res.status(200).json({
    success: true,
    ...result,
  });
}

/**
 * GET /services/:id
 * Get a single published service with available slots
 */
export async function getPublishedService(req: Request, res: Response) {
  // Use validatedQuery from middleware (req.query is read-only in Express 5)
  const query = (req as any).validatedQuery || req.query;
  const date = query.date as string | undefined;
  const service = await serviceService.getPublishedService(req.params.id!, date);
  
  res.status(200).json({
    success: true,
    service,
  });
}

/**
 * GET /services/categories
 * Get all unique service categories
 */
export async function getCategories(_req: Request, res: Response) {
  const categories = await serviceService.getCategories();
  
  res.status(200).json({
    success: true,
    categories,
  });
}
