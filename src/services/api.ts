import { supabase } from '../supabase';
import { Trip, Booking, UserProfile, Review, Destination, Chat, ChatMessage, Bus, MaintenanceLog, ApiError } from '../types';

class ApiService {
  private handleError(error: unknown): never {
    const apiError: ApiError = {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: (error as any)?.code,
      status: (error as any)?.status,
    };
    console.error('API Error:', apiError);
    throw apiError;
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  async getUser(uid: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as UserProfile;
    } catch (error) {
      console.error('getUser error:', error);
      return null;
    }
  }

  async saveUser(user: UserProfile): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .upsert(user, { onConflict: 'uid' });
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateUser(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('uid', uid);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateUserPoints(uid: string, points: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ loyaltyPoints: points })
        .eq('uid', uid);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Trips ──────────────────────────────────────────────────────────────────
  async getTrips(filters?: { origin?: string; destination?: string; busType?: string; date?: string }): Promise<Trip[]> {
    try {
      let query = supabase
        .from('trips')
        .select('*, buses(plateNumber, model)')
        .order('departureTime', { ascending: true });

      if (filters?.origin) query = query.ilike('origin', `%${filters.origin}%`);
      if (filters?.destination) query = query.ilike('destination', `%${filters.destination}%`);
      if (filters?.busType && filters.busType !== 'All') query = query.eq('busType', filters.busType);
      if (filters?.date) query = query.gte('departureTime', filters.date);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        bookedSeats: t.bookedSeats || [],
        amenities: t.amenities || [],
        busPlate: t.buses?.plateNumber,
        busModel: t.buses?.model,
      }));
    } catch (error) {
      this.handleError(error);
    }
  }

  async getTripById(id: string): Promise<Trip | null> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, buses(plateNumber, model)')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return {
        ...data,
        bookedSeats: data.bookedSeats || [],
        amenities: data.amenities || [],
        busPlate: data.buses?.plateNumber,
        busModel: data.buses?.model,
      } as Trip;
    } catch (error) {
      this.handleError(error);
    }
  }

  async addTrip(trip: Partial<Trip>): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          ...trip,
          bookedSeats: trip.bookedSeats || [],
          amenities: trip.amenities || [],
          isFeatured: trip.isFeatured || false,
          rating: trip.rating || 5,
          reviewCount: trip.reviewCount || 0,
        })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateTrip(id: string, trip: Partial<Trip>): Promise<void> {
    try {
      const { error } = await supabase.from('trips').update(trip).eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteTrip(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Bookings ───────────────────────────────────────────────────────────────
  async getBookings(userId?: string): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('*, users(displayName, phoneNumber), trips(origin, destination)')
        .order('createdAt', { ascending: false });
      if (userId) query = query.eq('userId', userId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        seats: b.seats || [],
        userName: b.users?.displayName,
        userPhone: b.users?.phoneNumber,
        tripOrigin: b.trips?.origin,
        tripDestination: b.trips?.destination,
      }));
    } catch (error) {
      this.handleError(error);
    }
  }

  async getBookingById(id: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, users(displayName, phoneNumber), trips(origin, destination)')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return {
        ...data,
        seats: data.seats || [],
        userName: data.users?.displayName,
        userPhone: data.users?.phoneNumber,
        tripOrigin: data.trips?.origin,
        tripDestination: data.trips?.destination,
      } as Booking;
    } catch (error) {
      this.handleError(error);
    }
  }

  async addBooking(booking: Partial<Booking>): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancelBooking(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Reviews ────────────────────────────────────────────────────────────────
  async getReviews(tripId?: string): Promise<Review[]> {
    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .order('createdAt', { ascending: false });
      if (tripId) query = query.eq('tripId', tripId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async addReview(review: Partial<Review>): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert(review)
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Destinations ───────────────────────────────────────────────────────────
  async getDestinations(): Promise<Destination[]> {
    try {
      const { data, error } = await supabase.from('destinations').select('*');
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async addDestination(dest: Partial<Destination>): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .insert(dest)
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateDestination(id: string, dest: Partial<Destination>): Promise<void> {
    try {
      const { error } = await supabase.from('destinations').update(dest).eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteDestination(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('destinations').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Chats ──────────────────────────────────────────────────────────────────
  async getChats(userId?: string): Promise<Chat[]> {
    try {
      let query = supabase
        .from('chats')
        .select('*')
        .order('updatedAt', { ascending: false });
      if (userId) query = query.eq('userId', userId).eq('status', 'active');
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async createChat(chat: Partial<Chat>): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert(chat)
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<void> {
    try {
      const { error } = await supabase.from('chats').update(data).eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chatId', chatId)
        .order('createdAt', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async sendMessage(chatId: string, msg: Partial<ChatMessage>): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ ...msg, chatId })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Buses ──────────────────────────────────────────────────────────────────
  async getBuses(): Promise<Bus[]> {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async getBusById(id: string): Promise<Bus | null> {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as Bus;
    } catch (error) {
      this.handleError(error);
    }
  }

  async addBus(bus: Partial<Bus>): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from('buses')
        .insert({ ...bus, createdAt: new Date().toISOString() })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateBus(id: string, bus: Partial<Bus>): Promise<void> {
    try {
      const { error } = await supabase.from('buses').update(bus).eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteBus(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('buses').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Maintenance ────────────────────────────────────────────────────────────
  async getMaintenanceLogs(busId: string): Promise<MaintenanceLog[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('busId', busId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  async addMaintenanceLog(busId: string, log: Partial<MaintenanceLog>): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .insert({ ...log, busId })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ── Analytics ──────────────────────────────────────────────────────────────
  async getStats(): Promise<{
    totalTrips: number;
    totalBuses: number;
    totalBookings: number;
    totalRevenue: number;
    activeUsers: number;
  }> {
    try {
      const [trips, buses, bookings, users] = await Promise.all([
        this.getTrips(),
        this.getBuses(),
        this.getBookings(),
        this.getAllUsers()
      ]);

      return {
        totalTrips: trips.length,
        totalBuses: buses.length,
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((acc, b) => acc + (b.totalPrice || 0), 0),
        activeUsers: users.length,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export const api = new ApiService();
