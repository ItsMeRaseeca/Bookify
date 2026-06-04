import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Service, TimeSlot, Booking, User, PaymentMode, DaySchedule } from '@/types';
import { servicesApi, organizerApi, bookingsApi, adminApi } from '@/lib/api';

interface AppContextType {
  // State
  services: Service[];
  slots: TimeSlot[];
  bookings: Booking[];
  users: User[];
  isLoading: boolean;
  
  // Service operations
  fetchServices: (params?: { page?: number; limit?: number; search?: string; category?: string }) => Promise<void>;
  fetchServiceById: (id: string, date?: string) => Promise<{ service: Service; slotsByDate: Record<string, TimeSlot[]> } | null>;
  fetchCategories: () => Promise<string[]>;
  
  // Organizer operations
  fetchOrganizerServices: () => Promise<Service[]>;
  createService: (data: {
    title: string;
    description: string;
    category: string;
    price: number;
    imageUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    schedule: {
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      slotDuration: number;
      breakHours?: Array<{ start: string; end: string }>;
    };
  }) => Promise<{ success: boolean; error?: string; service?: Service }>;
  updateService: (id: string, updates: Partial<Service>) => Promise<{ success: boolean; error?: string }>;
  deleteService: (id: string) => Promise<{ success: boolean; error?: string }>;
  publishService: (id: string, published: boolean) => Promise<{ success: boolean; error?: string }>;
  fetchOrganizerStats: () => Promise<{
    totalServices: number;
    publishedServices: number;
    unpublishedServices: number;
    totalBookings: number;
    totalRevenue: number;
  } | null>;
  
  // Booking operations
  holdSlot: (slotId: string) => Promise<{ success: boolean; error?: string; holdExpiry?: string }>;
  confirmBooking: (slotId: string, paymentMode: PaymentMode) => Promise<{ success: boolean; error?: string; booking?: Booking }>;
  cancelHold: (slotId: string) => Promise<{ success: boolean; error?: string }>;
  fetchUserBookings: () => Promise<Booking[]>;
  downloadReceipt: (bookingId: string) => Promise<Blob | null>;
  
  // Admin operations
  fetchAdminMetrics: () => Promise<any>;
  fetchAdminServices: (params?: { page?: number; limit?: number }) => Promise<{ services: Service[]; pagination: any }>;
  fetchAdminUsers: (params?: { page?: number; limit?: number; role?: string }) => Promise<{ users: User[]; pagination: any }>;
  fetchAdminBookings: (params?: { page?: number; limit?: number; status?: string }) => Promise<{ bookings: Booking[]; pagination: any }>;
  
  // Legacy compatibility
  getServiceById: (id: string) => Service | undefined;
  getSlotsByServiceId: (serviceId: string) => TimeSlot[];
  getBookingsByUserId: (userId: string) => Booking[];
  getServicesByOrganizerId: (organizerId: string) => Service[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ============================================
  // SERVICE OPERATIONS (PUBLIC)
  // ============================================

  const fetchServices = async (params?: { page?: number; limit?: number; search?: string; category?: string }) => {
    setIsLoading(true);
    try {
      const response = await servicesApi.getAll(params);
      const apiServices = response.data.services.map(mapApiServiceToLocal);
      setServices(apiServices);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServiceById = useCallback(async (id: string, date?: string) => {
    try {
      const response = await servicesApi.getById(id, date);
      const service = mapApiServiceToLocal(response.data.service);
      const slotsByDate: Record<string, TimeSlot[]> = {};
      
      if (response.data.service.slotsByDate) {
        for (const [dateKey, apiSlots] of Object.entries(response.data.service.slotsByDate)) {
          slotsByDate[dateKey] = (apiSlots as any[]).map(mapApiSlotToLocal);
        }
      }
      
      return { service, slotsByDate };
    } catch (error) {
      console.error('Failed to fetch service:', error);
      return null;
    }
  }, []);

  const fetchCategories = async (): Promise<string[]> => {
    try {
      const response = await servicesApi.getCategories();
      return response.data.categories || [];
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
  };

  // ============================================
  // ORGANIZER OPERATIONS
  // ============================================

  const fetchOrganizerServices = async (): Promise<Service[]> => {
    try {
      const response = await organizerApi.getServices();
      const apiServices = response.data.services.map(mapApiServiceToLocal);
      return apiServices;
    } catch (error) {
      console.error('Failed to fetch organizer services:', error);
      return [];
    }
  };

  const createService = async (data: {
    title: string;
    description: string;
    category: string;
    price: number;
    imageUrl?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    published?: boolean;
    schedule: {
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      slotDuration: number;
      breakHours?: Array<{ start: string; end: string }>;
    };
  }) => {
    try {
      const response = await organizerApi.createService(data);
      const service = mapApiServiceToLocal(response.data.service);
      return { success: true, service };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create service' };
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    try {
      // Map frontend fields to backend fields
      const backendUpdates: any = {};
      if (updates.name) backendUpdates.title = updates.name;
      if (updates.description) backendUpdates.description = updates.description;
      if (updates.price) backendUpdates.price = updates.price;
      if (updates.imageUrl) backendUpdates.imageUrl = updates.imageUrl;
      if (updates.latitude) backendUpdates.latitude = updates.latitude;
      if (updates.longitude) backendUpdates.longitude = updates.longitude;
      
      await organizerApi.updateService(id, backendUpdates);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update service' };
    }
  };

  const deleteService = async (id: string) => {
    try {
      await organizerApi.deleteService(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete service' };
    }
  };

  const publishService = async (id: string, published: boolean) => {
    try {
      await organizerApi.publishService(id, published);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to publish service' };
    }
  };

  const fetchOrganizerStats = async () => {
    try {
      const response = await organizerApi.getStats();
      return response.data.stats;
    } catch (error) {
      console.error('Failed to fetch organizer stats:', error);
      return null;
    }
  };

  // ============================================
  // BOOKING OPERATIONS
  // ============================================

  const holdSlot = async (slotId: string) => {
    try {
      const response = await bookingsApi.hold(slotId);
      return { 
        success: true, 
        holdExpiry: response.data.holdExpiry 
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to hold slot' };
    }
  };

  const confirmBooking = async (slotId: string, paymentMode: PaymentMode) => {
    try {
      const response = await bookingsApi.confirm({
        slotId,
        paymentMode: paymentMode === 'online' ? 'ONLINE' : 'CASH',
      });
      const booking = mapApiBookingToLocal(response.data.booking);
      return { success: true, booking };
    } catch (error: any) {
      return { success: false, error: error.message || 'Booking failed' };
    }
  };

  const cancelHold = async (slotId: string) => {
    try {
      await bookingsApi.cancelHold(slotId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to cancel hold' };
    }
  };

  const fetchUserBookings = async (): Promise<Booking[]> => {
    try {
      const response = await bookingsApi.getAll();
      return response.data.bookings.map(mapApiBookingToLocal);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      return [];
    }
  };

  const downloadReceipt = async (bookingId: string): Promise<Blob | null> => {
    try {
      const response = await bookingsApi.downloadReceipt(bookingId);
      return response.data;
    } catch (error) {
      console.error('Failed to download receipt:', error);
      return null;
    }
  };

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  const fetchAdminMetrics = async () => {
    try {
      const response = await adminApi.getMetrics();
      const data = response.data.metrics;
      // Flatten the nested structure for easier consumption
      return {
        totalUsers: data.users?.users || 0,
        totalOrganizers: data.users?.organizers || 0,
        totalAdmins: data.users?.admins || 0,
        totalServices: data.services?.total || 0,
        publishedServices: data.services?.published || 0,
        unpublishedServices: data.services?.unpublished || 0,
        totalSlots: data.slots?.total || 0,
        bookedSlots: data.slots?.booked || 0,
        availableSlots: data.slots?.available || 0,
        totalBookings: data.bookings?.total || 0,
        successfulBookings: data.bookings?.successful || 0,
        failedBookings: data.bookings?.failed || 0,
        totalRevenue: data.revenue?.total || 0,
        onlinePayments: data.revenue?.onlinePayments || 0,
        cashPayments: data.revenue?.cashPayments || 0,
        // Analytics
        popularDayOfWeek: data.analytics?.popularDayOfWeek || { day: 'N/A', count: 0 },
        popularDate: data.analytics?.popularDate || { date: '', count: 0 },
        popularTimeSlot: data.analytics?.popularTimeSlot || { time: 'N/A', count: 0 },
        dayOfWeekBreakdown: data.analytics?.dayOfWeekBreakdown || [],
      };
    } catch (error) {
      console.error('Failed to fetch admin metrics:', error);
      return null;
    }
  };

  const fetchAdminServices = async (params?: { page?: number; limit?: number }) => {
    try {
      const response = await adminApi.getServices(params);
      return {
        services: response.data.services.map(mapApiServiceToLocal),
        pagination: response.data.pagination,
      };
    } catch (error) {
      console.error('Failed to fetch admin services:', error);
      return { services: [], pagination: {} };
    }
  };

  const fetchAdminUsers = async (params?: { page?: number; limit?: number; role?: string }) => {
    try {
      const response = await adminApi.getUsers(params);
      return {
        users: response.data.users,
        pagination: response.data.pagination,
      };
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      return { users: [], pagination: {} };
    }
  };

  const fetchAdminBookings = async (params?: { page?: number; limit?: number; status?: string }) => {
    try {
      const response = await adminApi.getBookings(params);
      return {
        bookings: response.data.bookings.map(mapApiBookingToLocal),
        pagination: response.data.pagination,
      };
    } catch (error) {
      console.error('Failed to fetch admin bookings:', error);
      return { bookings: [], pagination: {} };
    }
  };

  // ============================================
  // LEGACY COMPATIBILITY METHODS
  // ============================================

  const getServiceById = (id: string) => services.find((s) => s.id === id);
  const getSlotsByServiceId = (serviceId: string) => slots.filter((s) => s.serviceId === serviceId);
  const getBookingsByUserId = (userId: string) => bookings.filter((b) => b.userId === userId);
  const getServicesByOrganizerId = (organizerId: string) => services.filter((s) => s.organizerId === organizerId);

  return (
    <AppContext.Provider
      value={{
        services,
        slots,
        bookings,
        users,
        isLoading,
        fetchServices,
        fetchServiceById,
        fetchCategories,
        fetchOrganizerServices,
        createService,
        updateService,
        deleteService,
        publishService,
        fetchOrganizerStats,
        holdSlot,
        confirmBooking,
        cancelHold,
        fetchUserBookings,
        downloadReceipt,
        fetchAdminMetrics,
        fetchAdminServices,
        fetchAdminUsers,
        fetchAdminBookings,
        getServiceById,
        getSlotsByServiceId,
        getBookingsByUserId,
        getServicesByOrganizerId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// ============================================
// HELPER FUNCTIONS - Map API responses to local types
// ============================================

function mapApiServiceToLocal(apiService: any): Service {
  return {
    id: apiService.id,
    organizerId: apiService.organizerId,
    organizerName: apiService.organizer?.name || 'Unknown',
    name: apiService.title,
    description: apiService.description,
    slotDuration: apiService.schedules?.[0]?.slotDuration || 60,
    price: apiService.price,
    startDate: apiService.schedules?.[0]?.startDate || '',
    endDate: apiService.schedules?.[0]?.endDate || '',
    isPublished: apiService.published,
    imageUrl: apiService.imageUrl,
    latitude: apiService.latitude,
    longitude: apiService.longitude,
    schedule: [], // Schedule is handled by backend
    createdAt: apiService.createdAt,
  };
}

function mapApiSlotToLocal(apiSlot: any): TimeSlot {
  return {
    id: apiSlot.id,
    serviceId: apiSlot.serviceId,
    date: apiSlot.date?.split('T')[0] || apiSlot.date,
    startTime: apiSlot.startTime,
    endTime: apiSlot.endTime,
    status: apiSlot.status.toLowerCase() as 'available' | 'hold' | 'booked',
    bookedBy: undefined,
    holdExpiry: apiSlot.holdExpiry,
  };
}

function mapApiBookingToLocal(apiBooking: any): Booking {
  return {
    id: apiBooking.id,
    userId: apiBooking.userId,
    serviceId: apiBooking.serviceId,
    slotId: apiBooking.slotId,
    paymentMode: apiBooking.paymentMode.toLowerCase() as PaymentMode,
    paymentStatus: apiBooking.paymentStatus.toLowerCase() as 'pending' | 'success' | 'failed',
    amount: apiBooking.amount,
    createdAt: apiBooking.createdAt,
    // Include service details if present
    service: apiBooking.service ? {
      id: apiBooking.service.id,
      title: apiBooking.service.title,
      category: apiBooking.service.category,
      imageUrl: apiBooking.service.imageUrl,
      address: apiBooking.service.address,
      city: apiBooking.service.city,
      state: apiBooking.service.state,
    } : undefined,
    // Include slot details if present
    slot: apiBooking.slot ? {
      date: apiBooking.slot.date?.split('T')[0] || apiBooking.slot.date,
      startTime: apiBooking.slot.startTime,
      endTime: apiBooking.slot.endTime,
    } : undefined,
  };
}
