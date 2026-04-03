import React, { useState, useEffect, useCallback } from 'react';
import { Trip, Booking, Chat, ChatMessage, Bus, MaintenanceLog } from '../types';
import { Plus, Trash2, Edit, Bus as BusIcon, MapPin, Calendar, DollarSign, Users, TrendingUp, Star, LayoutDashboard, Settings, LogOut, Bell, BarChart3, PieChart as PieChartIcon, MessageSquare, CheckCircle2, Send, Zap, Image as ImageIcon, Eye, Wrench, History, AlertTriangle, Navigation, RefreshCw, Loader2, Search, Filter } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { sendNotification } from '../services/notificationService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '../supabase';
import { api } from '../services/api';
import RouteMap from '../components/RouteMap';
import { getCoordinates } from '../lib/coordinates';

export default function Admin() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState('');
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trips' | 'buses' | 'support' | 'analytics'>('dashboard');
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [newBus, setNewBus] = useState<Partial<Bus>>({
    plateNumber: '',
    model: '',
    year: new Date().getFullYear(),
    capacity: 49,
    status: 'active',
    image: ''
  });
  const [newMaintenance, setNewMaintenance] = useState<Partial<MaintenanceLog>>({
    description: '',
    cost: 0,
    date: new Date().toISOString().split('T')[0],
    technician: ''
  });
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showDeleteBusConfirm, setShowDeleteBusConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifData, setNotifData] = useState({ title: '', body: '', url: '/' });
  const [sendingNotif, setSendingNotif] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [selectedTripDetails, setSelectedTripDetails] = useState<Trip | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({
    origin: '',
    destination: '',
    departureTime: new Date().toISOString(),
    arrivalTime: new Date(Date.now() + 3600000 * 4).toISOString(),
    price: 0,
    busType: 'Standard',
    totalSeats: 49,
    availableSeats: 49,
    bookedSeats: [],
    amenities: ['WiFi', 'AC', 'USB'],
    isFeatured: false,
    rating: 5,
    reviewCount: 0,
    image: ''
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'cancelled' | 'pending'>('all');

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [tripsData, bookingsData, chatsData, busesData] = await Promise.all([
        api.getTrips(),
        api.getBookings(),
        api.getChats(),
        api.getBuses()
      ]);
      
      setTrips(tripsData);
      setBookings(bookingsData);
      setChats(chatsData);
      setBuses(busesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setStatusMessage({ type: 'error', text: 'فشل تحميل البيانات' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      if (activeTab === 'support') {
        api.getChats().then(setChats);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchData, activeTab]);

  const fetchData = async () => {
    try {
      const [tripsData, bookingsData, chatsData, busesData] = await Promise.all([
        api.getTrips(),
        api.getBookings(),
        api.getChats(),
        api.getBuses()
      ]);
      
      setTrips(tripsData);
      setBookings(bookingsData);
      setChats(chatsData);
      setBuses(busesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeChat) {
      const fetchMessages = async () => {
        const msgs = await api.getMessages(activeChat.id);
        setChatMessages(msgs);
      };
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !activeChat) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const text = reply;
    setReply('');

    try {
      await api.sendMessage(activeChat.id, {
        text,
        senderId: user.id,
        senderName: 'الدعم الفني',
        isAdmin: true,
        createdAt: new Date().toISOString()
      });

      await api.updateChat(activeChat.id, {
        lastMessage: text,
        updatedAt: new Date().toISOString(),
        status: 'active'
      });
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleCloseChat = async (chatId: string) => {
    try {
      await api.updateChat(chatId, {
        status: 'closed',
        updatedAt: new Date().toISOString()
      });
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
      fetchData();
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEditing && editingTrip) {
          setEditingTrip({ ...editingTrip, image: reader.result as string });
        } else {
          setNewTrip({ ...newTrip, image: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addTrip(newTrip);
      setShowAddModal(false);
      fetchData();
    } catch (error) {
      console.error('Error adding trip:', error);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    try {
      await api.deleteTrip(id);
      setStatusMessage({ type: 'success', text: 'تم حذف الرحلة بنجاح' });
      fetchData();
    } catch (error) {
      console.error('Error deleting trip:', error);
      setStatusMessage({ type: 'error', text: 'فشل حذف الرحلة' });
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const seedData = async () => {
    const initialTrips: Partial<Trip>[] = [
      {
        origin: 'القاهرة',
        destination: 'الإسكندرية',
        departureTime: new Date(Date.now() + 86400000).toISOString(),
        arrivalTime: new Date(Date.now() + 86400000 + 10800000).toISOString(),
        price: 250,
        busType: 'Elite',
        totalSeats: 49,
        availableSeats: 49,
        bookedSeats: [],
        amenities: ['WiFi', 'AC', 'USB', 'Coffee', 'Screen'],
        isFeatured: true,
        rating: 4.8,
        reviewCount: 124
      },
      {
        origin: 'القاهرة',
        destination: 'شرم الشيخ',
        departureTime: new Date(Date.now() + 172800000).toISOString(),
        arrivalTime: new Date(Date.now() + 172800000 + 21600000).toISOString(),
        price: 650,
        busType: 'Elite',
        totalSeats: 49,
        availableSeats: 49,
        bookedSeats: [],
        amenities: ['WiFi', 'AC', 'USB', 'Meal', 'Screen'],
        isFeatured: true,
        rating: 4.9,
        reviewCount: 89
      },
      {
        origin: 'المنصورة',
        destination: 'القاهرة',
        departureTime: new Date(Date.now() + 43200000).toISOString(),
        arrivalTime: new Date(Date.now() + 43200000 + 7200000).toISOString(),
        price: 120,
        busType: 'Business',
        totalSeats: 49,
        availableSeats: 49,
        bookedSeats: [],
        amenities: ['AC', 'USB']
      },
      {
        origin: 'الغردقة',
        destination: 'القاهرة',
        departureTime: new Date(Date.now() + 259200000).toISOString(),
        arrivalTime: new Date(Date.now() + 259200000 + 25200000).toISOString(),
        price: 550,
        busType: 'Elite',
        totalSeats: 49,
        availableSeats: 49,
        bookedSeats: [],
        amenities: ['WiFi', 'AC', 'USB', 'Screen'],
        isFeatured: true
      }
    ];

    const initialDestinations = [
      { name: 'شرم الشيخ', image: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=800&q=80', count: '12 رحلة يومياً', lat: 27.9158, lng: 34.3300 },
      { name: 'الغردقة', image: 'https://images.unsplash.com/photo-1544918877-460635b6d13e?auto=format&fit=crop&w=800&q=80', count: '8 رحلات يومياً', lat: 27.2579, lng: 33.8116 },
      { name: 'الإسكندرية', image: 'https://images.unsplash.com/photo-1568048696279-483586244a83?auto=format&fit=crop&w=800&q=80', count: '24 رحلة يومياً', lat: 31.2001, lng: 29.9187 },
      { name: 'الأقصر', image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80', count: '5 رحلات يومياً', lat: 25.6872, lng: 32.6396 },
    ];

    const initialReviews = [
      { userId: 'u1', userName: 'أحمد محمود', rating: 5, comment: 'تجربة رائعة جداً، الأتوبيس كان مريح جداً والمواعيد دقيقة.', createdAt: new Date().toISOString() },
      { userId: 'u2', userName: 'سارة علي', rating: 5, comment: 'أفضل شركة أتوبيسات في مصر، الرفاهية فعلاً موجودة.', createdAt: new Date().toISOString() },
      { userId: 'u3', userName: 'محمد حسن', rating: 4, comment: 'خدمة ممتازة وسرعة في الحجز، شكراً لكم.', createdAt: new Date().toISOString() },
    ];

    try {
      for (const trip of initialTrips) {
        await api.addTrip(trip);
      }
      for (const dest of initialDestinations) {
        await api.addDestination(dest);
      }
      for (const review of initialReviews) {
        await api.addReview(review);
      }
      setStatusMessage({ type: 'success', text: 'تم إضافة البيانات التجريبية بنجاح' });
      fetchData();
    } catch (e) {
      console.error('Error seeding data:', e);
      setStatusMessage({ type: 'error', text: 'فشل إضافة البيانات التجريبية' });
    }
  };

  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    try {
      await api.updateTrip(editingTrip.id, editingTrip);
      setEditingTrip(null);
      fetchData();
    } catch (e) {
      console.error('Error updating trip:', e);
    }
  };

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addBus(newBus);
      setShowAddBusModal(false);
      setNewBus({
        plateNumber: '',
        model: '',
        year: new Date().getFullYear(),
        capacity: 49,
        status: 'active',
        image: ''
      });
      fetchData();
      setStatusMessage({ type: 'success', text: 'تم إضافة الحافلة بنجاح' });
    } catch (error) {
      console.error('Error adding bus:', error);
      setStatusMessage({ type: 'error', text: 'فشل إضافة الحافلة' });
    }
  };

  const handleDeleteBus = async (id: string) => {
    try {
      await api.deleteBus(id);
      setShowDeleteBusConfirm(null);
      fetchData();
      setStatusMessage({ type: 'success', text: 'تم حذف الحافلة بنجاح' });
    } catch (error) {
      console.error('Error deleting bus:', error);
      setStatusMessage({ type: 'error', text: 'فشل حذف الحافلة' });
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus) return;
    try {
      await api.addMaintenanceLog(selectedBus.id, newMaintenance);
      setShowAddMaintenance(false);
      setNewMaintenance({
        description: '',
        cost: 0,
        date: new Date().toISOString().split('T')[0],
        technician: ''
      });
      const logs = await api.getMaintenanceLogs(selectedBus.id);
      setMaintenanceLogs(logs);
      setStatusMessage({ type: 'success', text: 'تم إضافة سجل الصيانة بنجاح' });
    } catch (error) {
      console.error('Error adding maintenance log:', error);
      setStatusMessage({ type: 'error', text: 'فشل إضافة سجل الصيانة' });
    }
  };

  const fetchMaintenanceLogs = async (busId: string) => {
    try {
      const logs = await api.getMaintenanceLogs(busId);
      setMaintenanceLogs(logs);
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingNotif(true);
    try {
      // In SQLite demo, we don't have a subscriptions table yet, 
      // but we could implement it similarly to trips/bookings.
      setStatusMessage({ type: 'success', text: `تم إرسال التنبيه بنجاح (محاكاة)` });
      setShowNotifModal(false);
      setNotifData({ title: '', body: '', url: '/' });
    } catch (error) {
      console.error('Error broadcasting:', error);
      setStatusMessage({ type: 'error', text: 'فشل إرسال التنبيهات' });
    } finally {
      setSendingNotif(false);
    }
  };

  const stats = [
    { label: 'إجمالي الرحلات', value: trips.length, icon: <BusIcon />, color: 'bg-blue-500' },
    { label: 'إجمالي الحافلات', value: buses.length, icon: <BusIcon />, color: 'bg-orange-500' },
    { label: 'إجمالي الحجوزات', value: bookings.length, icon: <Users />, color: 'bg-emerald-500' },
    { label: 'الإيرادات', value: formatCurrency(bookings.reduce((acc, b) => acc + b.totalPrice, 0)), icon: <TrendingUp />, color: 'bg-purple-500' },
  ];

  const chartData = bookings.reduce((acc: any[], booking) => {
    const date = new Date(booking.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.revenue += booking.totalPrice;
      existing.bookings += 1;
    } else {
      acc.push({ date, revenue: booking.totalPrice, bookings: 1 });
    }
    return acc;
  }, []).slice(-7);

  const busTypeData = trips.reduce((acc: any[], trip) => {
    const existing = acc.find(item => item.name === trip.busType);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: trip.busType, value: 1 });
    }
    return acc;
  }, []);

  const destinationData = bookings.reduce((acc: any[], booking) => {
    const existing = acc.find(item => item.name === booking.tripDestination);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: booking.tripDestination, value: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

  if (loading) return <div className="flex items-center justify-center py-40">جاري تحميل لوحة التحكم...</div>;

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <div className="text-emerald-500 font-black uppercase tracking-[0.3em] text-xs">Admin Control</div>
          <h1 className="text-5xl font-black tracking-tighter leading-none">لوحة التحكم</h1>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mr-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-500 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'trips' ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-500 hover:text-white'}`}
            >
              Trips
            </button>
            <button
              onClick={() => setActiveTab('buses')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'buses' ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-500 hover:text-white'}`}
            >
              Buses
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'support' ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-500 hover:text-white'}`}
            >
              Support
            </button>
          </div>
          {trips.length === 0 && (
            <button
              onClick={seedData}
              className="bg-white/5 text-stone-400 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
            >
              إضافة بيانات تجريبية
            </button>
          )}
          <button
            onClick={() => {
              if (activeTab === 'buses') setShowAddBusModal(true);
              else setShowAddModal(true);
            }}
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
          >
            <Plus className="w-6 h-6" />
            {activeTab === 'buses' ? 'إضافة حافلة جديدة' : 'إضافة رحلة جديدة'}
          </button>
          <button
            onClick={() => setShowNotifModal(true)}
            className="bg-white/5 text-stone-400 px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all border border-white/5 active:scale-95"
          >
            <Bell className="w-6 h-6" />
            إرسال تنبيه
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-5 blur-3xl rounded-full group-hover:opacity-10 transition-opacity`} />
                <div className="relative z-10 flex flex-col gap-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                    {React.cloneElement(stat.icon as React.ReactElement, { className: 'w-6 h-6' })}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">{stat.label}</div>
                    <div className="text-2xl font-black text-white">{stat.value}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[#111] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <BarChart3 className="w-8 h-8 text-emerald-500" />
                  <h2 className="text-2xl font-black tracking-tight">تحليل الإيرادات</h2>
                </div>
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">آخر 7 أيام</div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '16px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#111] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
              <div className="flex items-center gap-4">
                <MapPin className="w-8 h-8 text-emerald-500" />
                <h2 className="text-2xl font-black tracking-tight">الوجهات الأكثر طلباً</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={destinationData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#555" fontSize={10} width={80} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '16px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#111] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
              <div className="flex items-center gap-4">
                <PieChartIcon className="w-8 h-8 text-emerald-500" />
                <h2 className="text-2xl font-black tracking-tight">توزيع الحافلات</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={busTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {busTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '16px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {busTypeData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-stone-500 uppercase">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Loyalty Program Section */}
          <div className="bg-[#111] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Star className="w-8 h-8 text-yellow-500" />
                <h2 className="text-2xl font-black tracking-tight">برنامج الولاء</h2>
              </div>
              <button className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline">إدارة النقاط</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">أكثر المستخدمين تفاعلاً</h3>
                <div className="space-y-3">
                  {[
                    { name: 'أحمد محمد', points: 1250, bookings: 12 },
                    { name: 'سارة محمود', points: 980, bookings: 9 },
                    { name: 'ياسين علي', points: 750, bookings: 7 }
                  ].map((user, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 font-black">
                          {user.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{user.name}</div>
                          <div className="text-[10px] text-stone-500">{user.bookings} حجز</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-500 font-black">{user.points}</div>
                        <div className="text-[10px] text-stone-500 uppercase tracking-widest">نقطة</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500">
                  <TrendingUp className="w-10 h-10" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white">45,200</div>
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-widest">إجمالي النقاط الموزعة</div>
                </div>
                <p className="text-xs text-stone-500 max-w-[200px]">يتم توزيع النقاط تلقائياً عند كل حجز ناجح لزيادة ولاء العملاء.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Trips Table */}
      {activeTab === 'trips' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight">الرحلات المجدولة</h2>
          <div className="bg-[#111] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
            <table className="w-full text-right">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="p-8 text-[10px] font-black text-stone-500 uppercase tracking-widest">الرحلة</th>
                  <th className="p-8 text-[10px] font-black text-stone-500 uppercase tracking-widest">الموعد</th>
                  <th className="p-8 text-[10px] font-black text-stone-500 uppercase tracking-widest">السعر</th>
                  <th className="p-8 text-[10px] font-black text-stone-500 uppercase tracking-widest">المقاعد</th>
                  <th className="p-8 text-[10px] font-black text-stone-500 uppercase tracking-widest">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trips.map(trip => (
                  <tr key={trip.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-8">
                      <div className="font-black text-lg">{trip.origin} <span className="text-stone-700">→</span> {trip.destination}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{trip.busType} Class</div>
                        {trip.busPlate && (
                          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest border border-emerald-500/20 px-2 rounded">
                            {trip.busPlate}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="text-sm font-bold text-stone-300">{new Date(trip.departureTime).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</div>
                      <div className="text-xs text-stone-500">{new Date(trip.departureTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="p-8">
                      <div className="text-xl font-black text-emerald-500">{formatCurrency(trip.price)}</div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden w-24">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${(trip.availableSeats / trip.totalSeats) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-stone-400">{trip.availableSeats}/{trip.totalSeats}</span>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedTripDetails(trip)}
                          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-stone-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setEditingTrip(trip)}
                          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-stone-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(trip.id)}
                          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Buses Section */}
      {activeTab === 'buses' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black tracking-tighter">إدارة الحافلات</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {buses.map(bus => (
              <motion.div
                key={bus.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={bus.image || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'} 
                    alt={bus.plateNumber}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4">
                    <div className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg",
                      bus.status === 'active' ? "bg-emerald-500 text-white" : 
                      bus.status === 'maintenance' ? "bg-yellow-500 text-black" : "bg-red-500 text-white"
                    )}>
                      {bus.status === 'active' ? 'نشط' : bus.status === 'maintenance' ? 'في الصيانة' : 'خارج الخدمة'}
                    </div>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">{bus.plateNumber}</h3>
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">{bus.model} ({bus.year})</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-emerald-500">{bus.capacity}</div>
                      <div className="text-[10px] text-stone-500 uppercase tracking-widest">مقعد</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        setSelectedBus(bus);
                        fetchMaintenanceLogs(bus.id);
                      }}
                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      <Wrench className="w-4 h-4" />
                      الصيانة
                    </button>
                    <button 
                      onClick={() => setSelectedBus(bus)}
                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      <History className="w-4 h-4" />
                      الرحلات
                    </button>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <button className="flex-1 bg-white/5 hover:bg-white/10 p-4 rounded-2xl text-stone-400 hover:text-white transition-all flex items-center justify-center">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowDeleteBusConfirm(bus.id)}
                      className="flex-1 bg-white/5 hover:bg-red-500/10 p-4 rounded-2xl text-stone-400 hover:text-red-500 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
          <div className="bg-[#111] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-white/5">
              <h2 className="text-2xl font-black tracking-tight">المحادثات النشطة</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`group relative p-6 rounded-2xl transition-all border cursor-pointer ${activeChat?.id === chat.id ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  onClick={() => setActiveChat(chat)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-stone-500">{new Date(chat.updatedAt?.toDate?.() || chat.updatedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-black text-white">{chat.userName}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <div className="text-sm text-stone-400 truncate flex-1">{chat.lastMessage}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseChat(chat.id);
                      }}
                      className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {chats.length === 0 && (
                <div className="text-center py-20 text-stone-600 font-bold">لا توجد محادثات حالياً</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#111] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col">
            {activeChat ? (
              <>
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                      {activeChat.userName[0]}
                    </div>
                    <div>
                      <div className="font-black text-xl">{activeChat.userName}</div>
                      <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">نشط الآن</div>
                    </div>
                  </div>
                  <button className="text-stone-500 hover:text-white transition-colors">
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-6 rounded-3xl text-sm font-medium ${msg.isAdmin ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white/5 text-stone-300 rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendReply} className="p-8 border-t border-white/5 flex gap-4 bg-white/[0.02]">
                  <input
                    type="text"
                    placeholder="اكتب ردك هنا..."
                    className="flex-1 bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                  />
                  <button type="submit" className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20">
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-stone-600 space-y-4">
                <MessageSquare className="w-20 h-20 opacity-20" />
                <div className="font-black text-xl">اختر محادثة للبدء</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddBusModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl border border-white/10"
          >
            <h2 className="text-4xl font-black tracking-tighter mb-8">إضافة حافلة جديدة</h2>
            <form onSubmit={handleAddBus} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">رقم اللوحة</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={newBus.plateNumber}
                    onChange={e => setNewBus({ ...newBus, plateNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الموديل</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={newBus.model}
                    onChange={e => setNewBus({ ...newBus, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">سنة الصنع</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={newBus.year}
                    onChange={e => setNewBus({ ...newBus, year: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">السعة (مقعد)</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={newBus.capacity}
                    onChange={e => setNewBus({ ...newBus, capacity: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-8">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20"
                >
                  حفظ الحافلة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBusModal(false)}
                  className="flex-1 bg-white/5 text-stone-400 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {selectedBus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] rounded-[3rem] p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl font-black tracking-tighter">تفاصيل الحافلة: {selectedBus.plateNumber}</h2>
              <button 
                onClick={() => setSelectedBus(null)}
                className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-stone-400 hover:bg-white/10 transition-all"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-stone-500 uppercase tracking-widest">سجل الصيانة</h3>
                    <button 
                      onClick={() => setShowAddMaintenance(true)}
                      className="text-xs font-black text-emerald-500 uppercase tracking-widest hover:underline"
                    >
                      إضافة سجل جديد
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {maintenanceLogs.map(log => (
                      <div key={log.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="font-bold text-white">{log.description}</div>
                          <div className="text-emerald-500 font-black">{formatCurrency(log.cost)}</div>
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500 uppercase tracking-widest">
                          <span>{log.technician}</span>
                          <span>{new Date(log.date).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    ))}
                    {maintenanceLogs.length === 0 && (
                      <div className="text-center py-8 text-stone-600 font-bold">لا توجد سجلات صيانة</div>
                    )}
                  </div>
                </div>

                {showAddMaintenance && (
                  <div className="bg-white/5 rounded-3xl p-8 border border-emerald-500/30 space-y-6">
                    <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest">إضافة سجل صيانة</h3>
                    <form onSubmit={handleAddMaintenance} className="space-y-4">
                      <input
                        required
                        type="text"
                        placeholder="الوصف"
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-emerald-500 outline-none transition-all text-white text-sm"
                        value={newMaintenance.description}
                        onChange={e => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          required
                          type="number"
                          placeholder="التكلفة"
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-emerald-500 outline-none transition-all text-white text-sm"
                          value={newMaintenance.cost}
                          onChange={e => setNewMaintenance({ ...newMaintenance, cost: Number(e.target.value) })}
                        />
                        <input
                          required
                          type="text"
                          placeholder="الفني"
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:border-emerald-500 outline-none transition-all text-white text-sm"
                          value={newMaintenance.technician}
                          onChange={e => setNewMaintenance({ ...newMaintenance, technician: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-4">
                        <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">حفظ</button>
                        <button type="button" onClick={() => setShowAddMaintenance(false)} className="flex-1 bg-white/5 text-stone-400 py-3 rounded-xl font-black text-xs uppercase tracking-widest">إلغاء</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                  <h3 className="text-sm font-black text-stone-500 uppercase tracking-widest mb-6">الرحلات المرتبطة</h3>
                  <div className="space-y-4">
                    {trips.filter(t => t.busId === selectedBus.id).map(trip => (
                      <div key={trip.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white">{trip.origin} ← {trip.destination}</div>
                          <div className="text-[10px] text-stone-500">{new Date(trip.departureTime).toLocaleString('ar-EG')}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-emerald-500">{trip.availableSeats}/{trip.totalSeats}</div>
                          <div className="text-[10px] text-stone-500 uppercase tracking-widest">مقعد</div>
                        </div>
                      </div>
                    ))}
                    {trips.filter(t => t.busId === selectedBus.id).length === 0 && (
                      <div className="text-center py-8 text-stone-600 font-bold">لا توجد رحلات مرتبطة بهذه الحافلة</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showDeleteBusConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[150] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] rounded-[3rem] p-12 max-w-md w-full shadow-2xl border border-white/10 text-center"
          >
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black mb-4">تأكيد حذف الحافلة</h2>
            <p className="text-stone-400 mb-8 font-bold">هل أنت متأكد من حذف هذه الحافلة؟ سيتم حذف كافة سجلات الصيانة المرتبطة بها.</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteBus(showDeleteBusConfirm)}
                className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-500 transition-all"
              >
                حذف نهائي
              </button>
              <button
                onClick={() => setShowDeleteBusConfirm(null)}
                className="flex-1 bg-white/5 text-stone-400 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl border border-white/10"
          >
            <h2 className="text-4xl font-black tracking-tighter mb-8">إضافة رحلة جديدة</h2>
            <form onSubmit={handleAddTrip} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">نقطة الانطلاق</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={newTrip.origin}
                    onChange={e => setNewTrip({ ...newTrip, origin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الوجهة</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={newTrip.destination}
                    onChange={e => setNewTrip({ ...newTrip, destination: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">صورة الرحلة</label>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
                    {newTrip.image ? (
                      <img src={newTrip.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-stone-700" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="trip-image-upload"
                      onChange={(e) => handleImageUpload(e)}
                    />
                    <label
                      htmlFor="trip-image-upload"
                      className="inline-block bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-white/10 transition-all"
                    >
                      تحميل صورة
                    </label>
                    <p className="text-[10px] text-stone-500 font-medium">يفضل استخدام صور عالية الجودة (16:9)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">تاريخ ووقت التحرك</label>
                <input
                  required
                  type="datetime-local"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                  value={newTrip.departureTime}
                  onChange={e => setNewTrip({ ...newTrip, departureTime: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">السعر (ج.م)</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={newTrip.price}
                    onChange={e => setNewTrip({ ...newTrip, price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">فئة الرحلة</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold appearance-none"
                    value={newTrip.busType}
                    onChange={e => setNewTrip({ ...newTrip, busType: e.target.value as any })}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Business">Business</option>
                    <option value="Elite">Elite</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الحافلة المخصصة</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold appearance-none"
                    value={newTrip.busId}
                    onChange={e => setNewTrip({ ...newTrip, busId: e.target.value })}
                  >
                    <option value="">اختر حافلة...</option>
                    {buses.map(bus => (
                      <option key={bus.id} value={bus.id}>{bus.plateNumber} - {bus.model}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-6 pt-8">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20"
                >
                  حفظ الرحلة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white/5 text-stone-400 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showNotifModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] rounded-[3rem] p-12 max-w-xl w-full shadow-2xl border border-white/10"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <Bell className="w-6 h-6" />
              </div>
              <h2 className="text-4xl font-black tracking-tighter">إرسال تنبيه عام</h2>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">عنوان التنبيه</label>
                <input
                  required
                  type="text"
                  placeholder="مثال: تحديث هام للرحلات"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                  value={notifData.title}
                  onChange={e => setNotifData({ ...notifData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">محتوى الرسالة</label>
                <textarea
                  required
                  rows={3}
                  placeholder="اكتب تفاصيل التنبيه هنا..."
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold resize-none"
                  value={notifData.body}
                  onChange={e => setNotifData({ ...notifData, body: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">رابط التوجيه (اختياري)</label>
                <input
                  type="text"
                  placeholder="/"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                  value={notifData.url}
                  onChange={e => setNotifData({ ...notifData, url: e.target.value })}
                />
              </div>

              <div className="flex gap-6 pt-4">
                <button
                  type="submit"
                  disabled={sendingNotif}
                  className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50"
                >
                  {sendingNotif ? 'جاري الإرسال...' : 'إرسال الآن'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotifModal(false)}
                  className="flex-1 bg-white/5 text-stone-400 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {editingTrip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl border border-white/10"
          >
            <h2 className="text-4xl font-black tracking-tighter mb-8">تعديل الرحلة</h2>
            <form onSubmit={handleUpdateTrip} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">نقطة الانطلاق</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={editingTrip.origin}
                    onChange={e => setEditingTrip({ ...editingTrip, origin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الوجهة</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={editingTrip.destination}
                    onChange={e => setEditingTrip({ ...editingTrip, destination: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">صورة الرحلة</label>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 bg-white/5 border border-dashed border-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
                    {editingTrip.image ? (
                      <img src={editingTrip.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-stone-700" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="edit-trip-image-upload"
                      onChange={(e) => handleImageUpload(e, true)}
                    />
                    <label
                      htmlFor="edit-trip-image-upload"
                      className="inline-block bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-white/10 transition-all"
                    >
                      تغيير الصورة
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">تاريخ ووقت التحرك</label>
                <input
                  required
                  type="datetime-local"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                  value={new Date(editingTrip.departureTime).toISOString().slice(0, 16)}
                  onChange={e => setEditingTrip({ ...editingTrip, departureTime: new Date(e.target.value).toISOString() })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">السعر (ج.م)</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                    value={editingTrip.price}
                    onChange={e => setEditingTrip({ ...editingTrip, price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">فئة الرحلة</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold appearance-none"
                    value={editingTrip.busType}
                    onChange={e => setEditingTrip({ ...editingTrip, busType: e.target.value as any })}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Business">Business</option>
                    <option value="Elite">Elite</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الحافلة المخصصة</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold appearance-none"
                    value={editingTrip.busId}
                    onChange={e => setEditingTrip({ ...editingTrip, busId: e.target.value })}
                  >
                    <option value="">اختر حافلة...</option>
                    {buses.map(bus => (
                      <option key={bus.id} value={bus.id}>{bus.plateNumber} - {bus.model}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-6 pt-8">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20"
                >
                  تحديث الرحلة
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="flex-1 bg-white/5 text-stone-400 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {selectedTripDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] rounded-[3rem] p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl font-black tracking-tighter">تفاصيل الرحلة</h2>
              <button 
                onClick={() => setSelectedTripDetails(null)}
                className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-stone-400 hover:bg-white/10 transition-all"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">
                      {selectedTripDetails.origin[0]}
                    </div>
                    <div>
                      <div className="text-2xl font-black">{selectedTripDetails.origin} ← {selectedTripDetails.destination}</div>
                      <div className="text-xs font-bold text-stone-500 uppercase tracking-widest">{selectedTripDetails.busType} Class</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">موعد التحرك</div>
                      <div className="font-bold text-white">{new Date(selectedTripDetails.departureTime).toLocaleString('ar-EG')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">السعر</div>
                      <div className="font-black text-emerald-500 text-xl">{formatCurrency(selectedTripDetails.price)}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3">المقاعد المحجوزة</div>
                    <div className="grid grid-cols-8 gap-2">
                      {Array.from({ length: selectedTripDetails.totalSeats }).map((_, i) => {
                        const seatNum = i + 1;
                        const isBooked = selectedTripDetails.bookedSeats.includes(seatNum);
                        return (
                          <div 
                            key={seatNum}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all",
                              isBooked ? "bg-emerald-600 text-white" : "bg-white/5 text-stone-600 border border-white/5"
                            )}
                          >
                            {seatNum}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                  <h3 className="text-sm font-black text-stone-500 uppercase tracking-widest mb-6">قائمة المحجوزات</h3>
                  <div className="space-y-4">
                    {bookings.filter(b => b.tripId === selectedTripDetails.id).map(booking => (
                      <div key={booking.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group/booking">
                        <div>
                          <div className="font-bold text-white">{booking.userName}</div>
                          <div className="text-[10px] text-stone-500">المقاعد: {booking.seats.join(', ')}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-black text-emerald-500">{formatCurrency(booking.totalPrice)}</div>
                            <div className="text-[10px] text-stone-500">{new Date(booking.createdAt).toLocaleDateString('ar-EG')}</div>
                          </div>
                          <button 
                            onClick={() => setSelectedBooking(booking)}
                            className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-stone-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all opacity-0 group-hover/booking:opacity-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {bookings.filter(b => b.tripId === selectedTripDetails.id).length === 0 && (
                      <div className="text-center py-8 text-stone-600 font-bold">لا توجد حجوزات لهذه الرحلة</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                  <h3 className="text-sm font-black text-stone-500 uppercase tracking-widest mb-6">إحصائيات الرحلة</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                      <div className="text-3xl font-black text-white">{selectedTripDetails.totalSeats - selectedTripDetails.availableSeats}</div>
                      <div className="text-[10px] text-stone-500 uppercase tracking-widest">مقعد محجوز</div>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                      <div className="text-3xl font-black text-emerald-500">{selectedTripDetails.availableSeats}</div>
                      <div className="text-[10px] text-stone-500 uppercase tracking-widest">مقعد متاح</div>
                    </div>
                    <div className="col-span-2 p-6 bg-emerald-600/10 rounded-2xl border border-emerald-600/20 text-center">
                      <div className="text-3xl font-black text-emerald-500">
                        {formatCurrency(bookings.filter(b => b.tripId === selectedTripDetails.id).reduce((acc, b) => acc + b.totalPrice, 0))}
                      </div>
                      <div className="text-[10px] text-stone-500 uppercase tracking-widest">إجمالي إيرادات الرحلة</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-8 border border-white/5">
                  <h3 className="text-sm font-black text-stone-500 uppercase tracking-widest mb-6">المرافق</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedTripDetails.amenities.map((amenity, i) => (
                      <div key={i} className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-xs font-bold text-stone-300">
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>

                {getCoordinates(selectedTripDetails.origin) && getCoordinates(selectedTripDetails.destination) && (
                  <div className="bg-white/5 rounded-3xl p-8 border border-white/5 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                        <Navigation className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-black text-stone-500 uppercase tracking-widest">مسار الرحلة والوقت المتوقع</h3>
                    </div>
                    <RouteMap 
                      origin={[getCoordinates(selectedTripDetails.origin)!.lat, getCoordinates(selectedTripDetails.origin)!.lng]}
                      destination={[getCoordinates(selectedTripDetails.destination)!.lat, getCoordinates(selectedTripDetails.destination)!.lng]}
                      originName={selectedTripDetails.origin}
                      destinationName={selectedTripDetails.destination}
                      className="h-[300px]"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] rounded-[3rem] p-12 max-w-xl w-full shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black tracking-tighter">تفاصيل الحجز</h2>
              <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedBooking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                {selectedBooking.status}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">العميل</div>
                  <div className="font-bold text-white">{selectedBooking.userName}</div>
                  {selectedBooking.userPhone && <div className="text-[10px] text-stone-500">{selectedBooking.userPhone}</div>}
                </div>
                <div>
                  <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">رقم الحجز</div>
                  <div className="font-mono text-xs text-stone-400">{selectedBooking.id}</div>
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-stone-500">الرحلة</div>
                  <div className="font-black text-emerald-500">{selectedBooking.tripOrigin} ← {selectedBooking.tripDestination}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-stone-500">المقاعد</div>
                  <div className="font-bold text-white">{selectedBooking.seats.join(', ')}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-stone-500">إجمالي المبلغ</div>
                  <div className="font-black text-xl text-white">{formatCurrency(selectedBooking.totalPrice)}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <Star className="w-5 h-5 text-emerald-500" />
                <div className="text-xs font-medium text-emerald-500">
                  تم منح العميل <span className="font-black">{selectedBooking.pointsEarned}</span> نقطة ولاء لهذا الحجز.
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full mt-8 bg-white/5 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              إغلاق
            </button>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl font-bold shadow-2xl z-[200] flex items-center gap-3",
              statusMessage.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            {statusMessage.text}
          </motion.div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[150] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#111] rounded-[3rem] p-12 max-w-md w-full shadow-2xl border border-white/10 text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black mb-4">تأكيد الحذف</h2>
              <p className="text-stone-400 mb-8 font-bold">هل أنت متأكد من حذف هذه الرحلة؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDeleteTrip(showDeleteConfirm)}
                  className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-500 transition-all"
                >
                  حذف نهائي
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-white/5 text-stone-400 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
