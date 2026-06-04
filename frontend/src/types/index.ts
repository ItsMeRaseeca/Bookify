export type UserRole = 'user' | 'organizer' | 'admin';

export type SlotStatus = 'available' | 'hold' | 'booked';

export type PaymentMode = 'online' | 'cash';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  bookedBy?: string;
  holdExpiry?: string;
}

export interface BreakTime {
  id: string;
  startTime: string;
  endTime: string;
}

export interface DaySchedule {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breaks: BreakTime[];
}

export interface Service {
  id: string;
  organizerId: string;
  organizerName: string;
  name: string;
  description: string;
  slotDuration: number;
  price: number;
  startDate: string;
  endDate: string;
  isPublished: boolean;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  schedule: DaySchedule[];
  createdAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  serviceId: string;
  slotId: string;
  paymentMode: PaymentMode;
  paymentStatus: 'pending' | 'success' | 'failed';
  amount: number;
  createdAt: string;
  // Included service details from API
  service?: {
    id: string;
    title: string;
    category: string;
    imageUrl?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  // Included slot details from API
  slot?: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  pendingVerification: {
    email: string;
    phone: string;
    name: string;
    role: UserRole;
    password: string;
  } | null;
}

export interface AppState {
  users: User[];
  services: Service[];
  slots: TimeSlot[];
  bookings: Booking[];
}
