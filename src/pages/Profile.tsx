import React, { useState, useEffect } from 'react';
import { UserProfile, Booking, Trip } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Ticket, Calendar, MapPin, Clock, Star, ChevronRight, LogOut, User, Settings, Shield, Edit2, Save, X, Mail, Phone, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../supabase';

interface ProfileProps {
  userProfile: UserProfile | null;
}

export default function Profile({ userProfile }: ProfileProps) {
  const [bookings, setBookings] = useState<(Booking & { trip?: Trip })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      if (!userProfile) return;
      try {
        const [bookingsData, tripsData] = await Promise.all([
          api.getBookings(userProfile.uid),
          api.getTrips()
        ]);

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

  useEffect(() => {
    if (userProfile) {
      setEditForm({
        displayName: userProfile.displayName || '',
        phoneNumber: userProfile.phoneNumber || '',
        avatarUrl: userProfile.avatarUrl || '',
      });
    }
  }, [userProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.updateUser(userProfile.uid, {
        displayName: editForm.displayName,
        phoneNumber: editForm.phoneNumber,
        avatarUrl: editForm.avatarUrl,
      });
      setSuccess('تم تحديث الملف الشخصي بنجاح');
      setEditing(false);
      window.location.reload();
    } catch (err) {
      setError('فشل تحديث الملف الشخصي');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      setError('كلمات المرور غير متطابقة');
      return;
    }
    if (passwordData.new.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setPasswordLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });
      if (error) throw error;
      setSuccess('تم تغيير كلمة المرور بنجاح');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setError(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء الحجز؟')) return;
    
    try {
      await api.cancelBooking(bookingId);
      setSuccess('تم إلغاء الحجز بنجاح');
      window.location.reload();
    } catch (err) {
      setError('فشل إلغاء الحجز');
    }
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20" dir="rtl">
      {/* Profile Header */}
      <section className="bg-[#111] rounded-[3rem] p-12 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[100px] rounded-full" />
        
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-3 rounded-2xl flex items-center gap-2 z-20"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">{success}</span>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-3 rounded-2xl flex items-center gap-2 z-20"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="relative">
            <div className="w-32 h-32 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-5xl font-black shadow-2xl shadow-emerald-600/20 overflow-hidden">
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                userProfile.displayName?.[0] || userProfile.email[0].toUpperCase()
              )}
            </div>
            {editing && (
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center cursor-pointer hover:bg-emerald-500 transition-all">
                <Edit2 className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setEditForm({ ...editForm, avatarUrl: reader.result as string });
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-right space-y-2">
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الاسم</label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
                    <input
                      type="text"
                      value={editForm.displayName || ''}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl focus:border-emerald-500 outline-none text-white font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
                    <input
                      type="tel"
                      value={editForm.phoneNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl focus:border-emerald-500 outline-none text-white font-bold"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-4xl font-black tracking-tighter">{userProfile.displayName || 'مسافر رحلتي'}</h1>
                <p className="text-stone-500 font-medium">{userProfile.email}</p>
                {userProfile.phoneNumber && (
                  <p className="text-stone-400 font-medium flex items-center justify-center md:justify-start gap-2">
                    <Phone className="w-4 h-4" />
                    {userProfile.phoneNumber}
                  </p>
                )}
              </>
            )}
            
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
            {editing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="p-4 bg-emerald-600 border border-emerald-500 rounded-2xl text-white hover:bg-emerald-500 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                </button>
                <button
                  onClick={() => { setEditing(false); setError(null); }}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-stone-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setEditing(true)}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-stone-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Edit2 className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-stone-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Lock className="w-6 h-6" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <LogOut className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#111] rounded-[3rem] p-10 max-w-md w-full shadow-2xl border border-white/10 space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tight">تغيير كلمة المرور</h2>
                <p className="text-stone-500 font-medium">أدخل كلمة المرور الجديدة</p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl focus:border-emerald-500 outline-none text-white font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl focus:border-emerald-500 outline-none text-white font-bold"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-bold text-center">
                    {error}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    تغيير كلمة المرور
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPasswordModal(false); setError(null); }}
                    className="flex-1 bg-white/5 text-stone-400 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
