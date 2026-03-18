import { supabase } from '../supabase';
import { Trip, Booking, UserProfile, Review, Destination, Chat, ChatMessage, Bus, MaintenanceLog } from '../types';

export const api = {
  // ── Users ──────────────────────────────────────────────────────────────────
  getUser: async (uid: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single();
    if (error || !data) return null;
    return data as UserProfile;
  },

  saveUser: async (user: UserProfile): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'uid' });
    if (error) throw error;
  },

  updateUserPoints: async (uid: string, points: number): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ loyaltyPoints: points })
      .eq('uid', uid);
    if (error) throw error;
  },

  // ── Trips ──────────────────────────────────────────────────────────────────
  getTrips: async (): Promise<Trip[]> => {
    const { data, error } = await supabase
      .from('trips')
      .select('*, buses(plateNumber, model)')
      .order('departureTime', { ascending: true });
    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      bookedSeats: t.bookedSeats || [],
      amenities: t.amenities || [],
      busPlate: t.buses?.plateNumber,
      busModel: t.buses?.model,
    }));
  },

  addTrip: async (trip: Partial<Trip>): Promise<{ id: string }> => {
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
  },

  updateTrip: async (id: string, trip: Partial<Trip>): Promise<void> => {
    const { error } = await supabase.from('trips').update(trip).eq('id', id);
    if (error) throw error;
  },

  deleteTrip: async (id: string): Promise<void> => {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Bookings ───────────────────────────────────────────────────────────────
  getBookings: async (userId?: string): Promise<Booking[]> => {
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
  },

  addBooking: async (booking: Partial<Booking>): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  // ── Reviews ────────────────────────────────────────────────────────────────
  getReviews: async (): Promise<Review[]> => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  addReview: async (review: Partial<Review>): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  // ── Destinations ───────────────────────────────────────────────────────────
  getDestinations: async (): Promise<Destination[]> => {
    const { data, error } = await supabase.from('destinations').select('*');
    if (error) throw error;
    return data || [];
  },

  addDestination: async (dest: Partial<Destination>): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from('destinations')
      .insert(dest)
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  // ── Chats ──────────────────────────────────────────────────────────────────
  getChats: async (userId?: string): Promise<Chat[]> => {
    let query = supabase
      .from('chats')
      .select('*')
      .order('updatedAt', { ascending: false });
    if (userId) query = query.eq('userId', userId).eq('status', 'active');
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  createChat: async (chat: Partial<Chat>): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from('chats')
      .insert(chat)
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  updateChat: async (id: string, data: Partial<Chat>): Promise<void> => {
    const { error } = await supabase.from('chats').update(data).eq('id', id);
    if (error) throw error;
  },

  getMessages: async (chatId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chatId', chatId)
      .order('createdAt', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  sendMessage: async (chatId: string, msg: Partial<ChatMessage>): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from('messages')
      .insert({ ...msg, chatId })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  // ── Buses ──────────────────────────────────────────────────────────────────
  getBuses: async (): Promise<Bus[]> => {
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  addBus: async (bus: Partial<Bus>): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from('buses')
      .insert({ ...bus, createdAt: new Date().toISOString() })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  updateBus: async (id: string, bus: Partial<Bus>): Promise<void> => {
    const { error } = await supabase.from('buses').update(bus).eq('id', id);
    if (error) throw error;
  },

  deleteBus: async (id: string): Promise<void> => {
    const { error } = await supabase.from('buses').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Maintenance ────────────────────────────────────────────────────────────
  getMaintenanceLogs: async (busId: string): Promise<MaintenanceLog[]> => {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('busId', busId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  addMaintenanceLog: async (busId: string, log: Partial<MaintenanceLog>): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .insert({ ...log, busId })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },
};
