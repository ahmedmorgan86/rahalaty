export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  phoneNumber?: string;
  loyaltyPoints: number;
  createdAt: string;
}

export interface Bus {
  id: string;
  plateNumber: string;
  model: string;
  year: number;
  capacity: number;
  status: 'active' | 'maintenance' | 'retired';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  image?: string;
  createdAt: string;
}

export interface MaintenanceLog {
  id: string;
  busId: string;
  description: string;
  cost: number;
  date: string;
  technician: string;
}

export interface Trip {
  id: string;
  busId?: string;
  busPlate?: string;
  busModel?: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  busType: 'Standard' | 'Business' | 'Elite';
  availableSeats: number;
  totalSeats: number;
  bookedSeats: number[];
  amenities: string[];
  isFeatured?: boolean;
  rating?: number;
  reviewCount?: number;
  image?: string;
}

export interface Booking {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  tripId: string;
  tripOrigin?: string;
  tripDestination?: string;
  seats: number[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentMethod: string;
  pointsEarned: number;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Destination {
  id: string;
  name: string;
  image: string;
  count: string;
  lat?: number;
  lng?: number;
}

export interface Chat {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string;
  updatedAt: any;
  status: 'active' | 'closed';
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  createdAt: any;
}
