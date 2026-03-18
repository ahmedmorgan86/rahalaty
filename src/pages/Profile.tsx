import React, { useState, useEffect } from 'react';
import { UserProfile, Booking, Trip } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Ticket, Calendar, MapPin, Clock, Star, ChevronRight, LogOut, User, Settings, Shield } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'framer-motion';


import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../supabase';

interface ProfileProps {
  userProfile: UserProfile | null;
}

export default function Profile({ userProfile }: ProfileProps) {
  const [bookings, setBookings] = useState<(Booking & { trip?: Trip })[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      if (!userProfile) return;
      try {
        // Fetch bookings filtered by userId server-side
        const [bookingsData, tripsData] = await Promise.all([
          api.getBookings(userProfile.uid),
          api.getTrips()
        ]);

        // Map trips once instead of fetching for each booking (fix N+1 query)
        const tripsMap = new Map(tripsData.map(t => [t.id, t]));
        const fullBookings = bookingsData.map(booking => ({
          ...booking,
          trip: tripsMap.get(booking.tripId)
        }));

        setBookings(fullBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [userProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20" dir="rtl">
      {/* Profile Header */}
      <section className="bg-[#111] rounded-[3rem] p-12 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[100px] rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-5xl font-black shadow-2xl shadow-emerald-600/20">
            {userProfile.displayName?.[0] || userProfile.email[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-right space-y-2">
            <h1 className="text-4xl font-black tracking-tighter">{userProfile.displayName || 'مسافر رحلتي'}</h1>
            <p className="text-stone-500 font-medium">{userProfile.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black text-emerald-500">{userProfile.loyaltyPoints} نقطة ولاء</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                <Shield className="w-4 h-4 text-stone-400" />
                <span className="text-xs font-black text-stone-400 uppercase tracking-widest">{userProfile.role === 'admin' ? 'مسؤول' : 'عضو مميز'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="p-4 bg-white/5 border border-white/10 rounded-2xl text-stone-400 hover:text-white hover:bg-white/10 transition-all">
              <Settings className="w-6 h-6" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Bookings List */}
      <section className="space-y-8">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="text-emerald-500 font-black uppercase tracking-widest text-xs">Your Journey History</div>
            <h2 className="text-4xl font-black tracking-tighter">رحلاتي السابقة</h2>
          </div>
          <div className="text-stone-500 font-bold text-sm">{bookings.length} رحلة</div>
        </div>

        {loading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-white/5 rounded-[2.5rem] animate-pulse" />
            ))}
          </div>
        ) : bookings.length > 0 ? (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 hover:border-emerald-500/20 transition-all group"
              >
                <div className="flex flex-col md:flex-row justify-between gap-8">
                  <div className="space-y-6 flex-1">
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                        {booking.status === 'confirmed' ? 'مؤكد' : 'ملغي'}
                      </div>
                      <div className="text-stone-500 text-xs font-bold">#{booking.id.slice(0, 8)}</div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <div className="text-2xl font-black">{booking.trip?.origin || '---'}</div>
                        <div className="text-[10px] font-bold text-stone-500 uppercase">نقطة الانطلاق</div>
                      </div>
                      <div className="flex-1 flex items-center gap-4">
                        <div className="h-px flex-1 bg-stone-800 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-stone-700" />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-black">{booking.trip?.destination || '---'}</div>
                        <div className="text-[10px] font-bold text-stone-500 uppercase">الوجهة</div>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-64 space-y-6 border-t md:border-t-0 md:border-r border-white/5 pt-6 md:pt-0 md:pr-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-stone-600" />
                        <span className="text-xs font-bold">{booking.trip ? format(new Date(booking.trip.departureTime), 'dd MMM', { locale: ar }) : '---'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-stone-600" />
                        <span className="text-xs font-bold">{booking.trip ? format(new Date(booking.trip.departureTime), 'HH:mm') : '---'}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] font-bold text-stone-500 uppercase">المقاعد</div>
                        <div className="text-sm font-black text-emerald-500">{booking.seats.join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-stone-500 uppercase">الإجمالي</div>
                        <div className="text-xl font-black">{formatCurrency(booking.totalPrice)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10 space-y-6">
            <Ticket className="w-16 h-16 text-stone-700 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-2xl font-black">لا يوجد حجوزات بعد</h3>
              <p className="text-stone-500 font-medium">ابدأ رحلتك الأولى معنا الآن واستمتع بالرفاهية</p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
            >
              استكشف الرحلات
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
