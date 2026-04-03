import React, { useState, useEffect, useCallback } from 'react';
import { Trip, Booking, UserProfile, Review, Destination } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Search, MapPin, Calendar, Clock, CreditCard, CheckCircle2, Star, Zap, Smartphone, CreditCard as CardIcon, ChevronRight, ArrowLeft, Filter, SlidersHorizontal, ShieldCheck, Coffee, Wifi, TrendingUp, Quote, Navigation, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import BusSeatPicker from '../components/BusSeatPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { sendNotification } from '../services/notificationService';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import DestinationsMap from '../components/DestinationsMap';
import RouteMap from '../components/RouteMap';
import { getCoordinates } from '../lib/coordinates';

interface HomeProps {
  userProfile: UserProfile | null;
}

const POPULAR_DESTINATIONS = [
  { id: 'd1', name: 'شرم الشيخ', image: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=800&q=80', count: '12 رحلة يومياً', lat: 27.9158, lng: 34.3300 },
  { id: 'd2', name: 'الغردقة', image: 'https://images.unsplash.com/photo-1544918877-460635b6d13e?auto=format&fit=crop&w=800&q=80', count: '8 رحلات يومياً', lat: 27.2579, lng: 33.8116 },
  { id: 'd3', name: 'الإسكندرية', image: 'https://images.unsplash.com/photo-1568048696279-483586244a83?auto=format&fit=crop&w=800&q=80', count: '24 رحلة يومياً', lat: 31.2001, lng: 29.9187 },
  { id: 'd4', name: 'الأقصر', image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80', count: '5 رحلات يومياً', lat: 25.6872, lng: 32.6396 },
];

const REVIEWS: Review[] = [
  { id: '1', userId: 'u1', userName: 'أحمد محمود', rating: 5, comment: 'تجربة رائعة جداً، الأتوبيس كان مريح جداً والمواعيد دقيقة.', createdAt: '2024-03-01' },
  { id: '2', userId: 'u2', userName: 'سارة علي', rating: 5, comment: 'أفضل شركة أتوبيسات في مصر، الرفاهية فعلاً موجودة.', createdAt: '2024-03-05' },
  { id: '3', userId: 'u3', userName: 'محمد حسن', rating: 4, comment: 'خدمة ممتازة وسرعة في الحجز، شكراً لكم.', createdAt: '2024-03-10' },
];

export default function Home({ userProfile }: HomeProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [bookingStep, setBookingStep] = useState<'list' | 'seats' | 'payment' | 'success'>('list');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [lastBookingId, setLastBookingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBusType, setFilterBusType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMapDest, setSelectedMapDest] = useState<Destination | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [tripsData, destsData, reviewsData] = await Promise.all([
        api.getTrips(),
        api.getDestinations(),
        api.getReviews()
      ]);

      setTrips(tripsData);
      setDestinations(destsData.length > 0 ? destsData : POPULAR_DESTINATIONS.map((d, i) => ({ id: `d${i}`, ...d })));
      setReviews(reviewsData.length > 0 ? reviewsData : REVIEWS);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('فشل تحميل الرحلات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.origin.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         trip.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterBusType === 'All' || trip.busType === filterBusType;
    return matchesSearch && matchesType;
  });

  const featuredTrips = trips.filter(t => t.isFeatured).slice(0, 3);

  const handleSeatToggle = (seatNumber: number) => {
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatNumber));
    } else {
      setSelectedSeats(prev => [...prev, seatNumber]);
    }
  };

  const validateBooking = (): string | null => {
    if (!userProfile) return 'يرجى تسجيل الدخول أولاً';
    if (!selectedTrip) return 'يرجى اختيار رحلة';
    if (selectedSeats.length === 0) return 'يرجى اختيار مقعد واحد على الأقل';
    if (!paymentMethod) return 'يرجى اختيار وسيلة الدفع';
    return null;
  };

  const handleBooking = async () => {
    const validationError = validateBooking();
    if (validationError) {
      setBookingError(validationError);
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    try {
      const pointsToEarn = Math.floor((selectedSeats.length * selectedTrip!.price) / 10);
      const bookingData: Partial<Booking> = {
        userId: userProfile!.uid,
        tripId: selectedTrip!.id,
        tripOrigin: selectedTrip!.origin,
        tripDestination: selectedTrip!.destination,
        seats: selectedSeats,
        totalPrice: selectedSeats.length * selectedTrip!.price,
        status: 'confirmed',
        paymentMethod,
        pointsEarned: pointsToEarn,
        createdAt: new Date().toISOString(),
      };

      const { id } = await api.addBooking(bookingData);
      setLastBookingId(id);
      
      const updatedTrip = {
        ...selectedTrip!,
        bookedSeats: [...(selectedTrip!.bookedSeats || []), ...selectedSeats],
        availableSeats: selectedTrip!.availableSeats - selectedSeats.length
      };
      await api.updateTrip(selectedTrip!.id, updatedTrip);

      await api.updateUserPoints(userProfile!.uid, (userProfile!.loyaltyPoints || 0) + pointsToEarn);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#059669']
      });

      setBookingStep('success');
    } catch (error) {
      console.error('Booking error:', error);
      setBookingError('فشل إتمام الحجز. يرجى المحاولة مرة أخرى.');
    } finally {
      setBookingLoading(false);
    }
  };

  const resetBooking = () => {
    setSelectedSeats([]);
    setSelectedTrip(null);
    setPaymentMethod('');
    setBookingStep('list');
    setBookingError(null);
    setShowConfirmation(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <div className="text-stone-500 font-bold uppercase tracking-widest animate-pulse">جاري تحميل الرحلات الفاخرة...</div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black">حدث خطأ</h3>
        <p className="text-stone-500 font-medium">{error}</p>
      </div>
      <button 
        onClick={handleRefresh}
        className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
      >
        <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
        إعادة المحاولة
      </button>
    </div>
  );

  return (
    <div className="space-y-24 pb-20">
      <AnimatePresence mode="wait">
        {bookingStep === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-24"
          >
            {/* Hero Section */}
            <section className="relative h-[600px] rounded-[4rem] overflow-hidden flex items-center justify-center text-center p-6">
              <img 
                src="https://picsum.photos/seed/travel/1920/1080" 
                alt="Hero" 
                className="absolute inset-0 w-full h-full object-cover brightness-[0.3]"
                referrerPolicy="no-referrer"
              />
              <div className="relative z-10 max-w-3xl space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="text-emerald-500 font-black uppercase tracking-[0.4em] text-xs">Premium Bus Booking</div>
                  <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none text-white">سافر بأسلوب<br />مختلف تماماً</h1>
                  <p className="text-stone-400 text-lg font-medium max-w-xl mx-auto">استمتع بتجربة سفر فاخرة مع أحدث أسطول أتوبيسات في الشرق الأوسط</p>
                </motion.div>

                <div className="flex flex-col md:flex-row items-center gap-4 bg-black/40 backdrop-blur-2xl p-4 rounded-[2.5rem] border border-white/10 shadow-2xl">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                    <input
                      type="text"
                      placeholder="من أين تريد الذهاب؟"
                      className="w-full bg-white/5 border border-white/10 p-5 pl-12 rounded-2xl focus:border-emerald-500 outline-none transition-all text-white font-bold"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && setShowFilters(true)}
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilters(true)}
                    className="w-full md:w-auto bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                  >
                    بحث الآن
                  </button>
                </div>
              </div>
            </section>

            {/* Why Choose Us */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: <ShieldCheck />, title: 'أمان تام', desc: 'أنظمة تتبع متطورة وسائقين محترفين' },
                { icon: <Wifi />, title: 'إنترنت مجاني', desc: 'واي فاي عالي السرعة طوال الرحلة' },
                { icon: <Coffee />, title: 'ضيافة فاخرة', desc: 'وجبات خفيفة ومشروبات مجانية' },
                { icon: <TrendingUp />, title: 'نقاط ولاء', desc: 'اجمع النقاط وسافر مجاناً' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 space-y-4 hover:border-emerald-500/20 transition-all group"
                >
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    {React.cloneElement(item.icon as React.ReactElement, { className: 'w-7 h-7' })}
                  </div>
                  <h3 className="text-xl font-black">{item.title}</h3>
                  <p className="text-stone-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </section>

            {/* Featured Trips */}
            {featuredTrips.length > 0 && (
              <section className="space-y-8">
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <div className="text-emerald-500 font-black uppercase tracking-widest text-xs">Featured Trips</div>
                    <h2 className="text-4xl font-black tracking-tighter">رحلات مميزة</h2>
                  </div>
                  <button className="text-stone-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors">عرض الكل</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {featuredTrips.map(trip => (
                    <div key={trip.id}>
                      <FeaturedTripCard trip={trip} onClick={() => { setSelectedTrip(trip); setBookingStep('seats'); }} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Main Trips List */}
            <section className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2">
                  <div className="text-emerald-500 font-black uppercase tracking-widest text-xs">Available Trips</div>
                  <h2 className="text-4xl font-black tracking-tighter">الرحلات المتاحة</h2>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-center gap-2",
                      showFilters ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white/5 border-white/10 text-stone-400 hover:bg-white/10"
                    )}
                  >
                    <Filter className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">تصفية</span>
                  </button>

                  <button
                    onClick={handleRefresh}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
                  </button>

                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <Star className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-stone-500 uppercase">نقاط الولاء</div>
                      <div className="text-lg font-black">{userProfile?.loyaltyPoints || 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-wrap gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">فئة الحافلة</label>
                        <div className="flex gap-2">
                          {['All', 'Standard', 'Business', 'Elite'].map(type => (
                            <button
                              key={type}
                              onClick={() => setFilterBusType(type)}
                              className={cn(
                                "px-6 py-2 rounded-xl text-xs font-black transition-all",
                                filterBusType === type ? "bg-emerald-600 text-white" : "bg-white/5 text-stone-500 hover:bg-white/10"
                              )}
                            >
                              {type === 'All' ? 'الكل' : type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTrips.map(trip => (
                  <div key={trip.id}>
                    <TripCard trip={trip} onClick={() => { setSelectedTrip(trip); setBookingStep('seats'); }} />
                  </div>
                ))}
              </div>
            </section>

            {/* Loyalty Program Info */}
            <section className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[4rem] p-16 relative overflow-hidden shadow-2xl shadow-emerald-600/20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
                <div className="flex-1 space-y-8 text-center lg:text-right">
                  <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">برنامج الولاء الحصري</span>
                  </div>
                  <h2 className="text-5xl lg:text-7xl font-black text-white leading-none tracking-tighter">سافر أكثر.. <br />واحصل على رحلات مجانية</h2>
                  <p className="text-emerald-50/80 text-lg font-medium max-w-2xl mx-auto lg:mx-0">
                    مع كل حجز تقوم به، تجمع نقاط ولاء يمكنك استبدالها بخصومات حصرية أو حتى رحلات مجانية بالكامل. انضم لأكثر من 50,000 مسافر يستمتعون بمزايا رحلتي.
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white font-black text-xl">10%</div>
                      <div className="text-xs font-bold text-white/70 uppercase tracking-widest">نقاط مستردة</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white font-black text-xl">24/7</div>
                      <div className="text-xs font-bold text-white/70 uppercase tracking-widest">دعم فني</div>
                    </div>
                  </div>
                </div>
                <div className="w-full lg:w-1/3 relative">
                  <div className="aspect-square bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-2xl">
                    <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center text-emerald-900 shadow-xl shadow-yellow-400/20">
                      <Star className="w-12 h-12 fill-current" />
                    </div>
                    <div>
                      <div className="text-4xl font-black text-white">1,250</div>
                      <div className="text-xs font-bold text-emerald-200 uppercase tracking-widest">نقطة في انتظارك</div>
                    </div>
                    <button className="w-full bg-white text-emerald-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">ابدأ التجميع الآن</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Popular Destinations */}
            <section className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2">
                  <div className="text-emerald-500 font-black uppercase tracking-widest text-xs">Popular Destinations</div>
                  <h2 className="text-4xl font-black tracking-tighter">وجهات شائعة</h2>
                </div>
                <p className="text-stone-500 font-medium">استكشف أجمل المدن المصرية وخريطة رحلاتنا</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                  {destinations.map((dest, i) => (
                    <motion.div
                      key={dest.id || i}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedMapDest(dest)}
                      className={cn(
                        "relative h-40 rounded-[2rem] overflow-hidden group cursor-pointer border-2 transition-all",
                        selectedMapDest?.id === dest.id ? "border-emerald-500 shadow-2xl shadow-emerald-500/20" : "border-transparent"
                      )}
                    >
                      <img src={dest.image} alt={dest.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6">
                        <h3 className="text-xl font-black text-white">{dest.name}</h3>
                        <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">{dest.count}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="lg:col-span-2">
                  <DestinationsMap 
                    destinations={destinations} 
                    selectedDestination={selectedMapDest} 
                  />
                </div>
              </div>
            </section>

            {/* Reviews Section */}
            <section className="bg-[#111] rounded-[4rem] p-16 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[100px] rounded-full" />
              <div className="relative z-10 space-y-12">
                <div className="text-center space-y-4">
                  <div className="text-emerald-500 font-black uppercase tracking-widest text-xs">Testimonials</div>
                  <h2 className="text-5xl font-black tracking-tighter">ماذا يقول عملاؤنا؟</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-6 relative">
                      <Quote className="absolute top-6 right-6 w-12 h-12 text-emerald-500/10" />
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-4 h-4", i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-stone-700")} />
                        ))}
                      </div>
                      <p className="text-stone-300 font-medium leading-relaxed italic">"{review.comment}"</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center font-black text-emerald-500">
                          {review.userName[0]}
                        </div>
                        <div>
                          <div className="font-black text-white">{review.userName}</div>
                          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">عميل موثق</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {bookingStep === 'seats' && selectedTrip && (
          <motion.div
            key="seats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <button 
              onClick={() => setBookingStep('list')}
              className="group flex items-center gap-2 text-stone-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-widest">العودة للرحلات</span>
            </button>
            
            <div className="space-y-12">
              {getCoordinates(selectedTrip.origin) && getCoordinates(selectedTrip.destination) && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <Navigation className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter">مسار الرحلة المباشر</h3>
                      <p className="text-stone-500 font-medium text-sm">تتبع مسار الحافلة والوقت المتوقع للوصول</p>
                    </div>
                  </div>
                  <RouteMap 
                    origin={[getCoordinates(selectedTrip.origin)!.lat, getCoordinates(selectedTrip.origin)!.lng]}
                    destination={[getCoordinates(selectedTrip.destination)!.lat, getCoordinates(selectedTrip.destination)!.lng]}
                    originName={selectedTrip.origin}
                    destinationName={selectedTrip.destination}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <BusSeatPicker
                totalSeats={selectedTrip.totalSeats}
                bookedSeats={selectedTrip.bookedSeats || []}
                selectedSeats={selectedSeats}
                onSeatToggle={handleSeatToggle}
              />
              
              <div className="space-y-8">
                <div className="bg-[#111] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                  <div className="space-y-2">
                    <div className="text-emerald-500 font-black uppercase tracking-widest text-xs">ملخص الحجز</div>
                    <h2 className="text-3xl font-black">{selectedTrip.origin} <span className="text-stone-700">→</span> {selectedTrip.destination}</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                      <span className="text-stone-500 text-sm font-bold uppercase">المقاعد</span>
                      <div className="flex gap-2">
                        {selectedSeats.length > 0 ? selectedSeats.map(s => (
                          <span key={s} className="bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-lg shadow-lg shadow-emerald-500/20">{s}</span>
                        )) : <span className="text-stone-700 font-bold italic">لم يتم الاختيار</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                      <span className="text-stone-500 text-sm font-bold uppercase">النقاط المكتسبة</span>
                      <span className="text-emerald-500 font-black">+{Math.floor((selectedSeats.length * selectedTrip.price) / 10)} نقطة</span>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                      <span className="text-stone-400 text-lg font-bold">الإجمالي</span>
                      <span className="text-4xl font-black text-white">{formatCurrency(selectedSeats.length * selectedTrip.price)}</span>
                    </div>
                  </div>
                  
                  <button
                    disabled={selectedSeats.length === 0}
                    onClick={() => setShowConfirmation(true)}
                    className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-20 disabled:grayscale shadow-xl shadow-emerald-600/20 active:scale-95"
                  >
                    متابعة للدفع
                  </button>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl flex items-center gap-4">
                  <Zap className="w-8 h-8 text-emerald-500" />
                  <p className="text-xs text-stone-400 font-medium leading-relaxed">
                    احجز الآن واحصل على نقاط ولاء يمكنك استخدامها لاحقاً للحصول على رحلات مجانية أو خصومات حصرية.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

        {bookingStep === 'payment' && selectedTrip && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto space-y-12 py-12"
          >
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black tracking-tighter">اختر وسيلة الدفع</h2>
              <p className="text-stone-500 font-medium">جميع المعاملات مشفرة وآمنة تماماً</p>
            </div>

            <div className="grid gap-4">
              {[
                { id: 'fawry', name: 'فوري', icon: <Zap className="w-6 h-6" />, color: 'text-yellow-500' },
                { id: 'vodafone', name: 'فودافون كاش', icon: <Smartphone className="w-6 h-6" />, color: 'text-red-500' },
                { id: 'card', name: 'بطاقة بنكية', icon: <CardIcon className="w-6 h-6" />, color: 'text-blue-500' },
                { id: 'instapay', name: 'إنستا باي', icon: <Star className="w-6 h-6" />, color: 'text-emerald-500' },
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    "group flex items-center justify-between p-8 rounded-[2rem] border-2 transition-all active:scale-[0.98]",
                    paymentMethod === method.id 
                      ? "border-emerald-500 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10" 
                      : "border-white/5 bg-[#111] hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className={cn("w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center transition-colors", paymentMethod === method.id ? "bg-emerald-500 text-white" : method.color)}>
                      {method.icon}
                    </div>
                    <span className={cn("text-xl font-black", paymentMethod === method.id ? "text-white" : "text-stone-400")}>{method.name}</span>
                  </div>
                  {paymentMethod === method.id && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
            
            <button
              disabled={!paymentMethod || bookingLoading}
              onClick={handleBooking}
              className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-[0.2em] hover:bg-emerald-500 transition-all disabled:opacity-20 shadow-2xl shadow-emerald-600/40 flex items-center justify-center gap-3"
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  جاري التأكيد...
                </>
              ) : (
                <>تأكيد الدفع {formatCurrency(selectedSeats.length * selectedTrip.price)}</>
              )}
            </button>
            {bookingError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-bold text-center"
              >
                {bookingError}
              </motion.div>
            )}
          </motion.div>
        )}

        {bookingStep === 'success' && selectedTrip && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto py-12"
          >
            <div className="bg-white text-black rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="bg-emerald-600 p-12 text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-0 left-0 w-40 h-40 bg-white blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="w-24 h-24 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl relative z-10">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-black text-white relative z-10">تم تأكيد حجزك!</h2>
                <p className="text-emerald-100 font-bold relative z-10">تذكرتك جاهزة للاستخدام</p>
              </div>

              <div className="p-12 space-y-12">
                <div className="flex justify-between items-start">
                  <div className="space-y-6">
                    <div>
                      <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">المسافر</div>
                      <div className="text-xl font-black">{userProfile?.displayName}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">الرحلة</div>
                        <div className="text-sm font-bold">{selectedTrip.origin} - {selectedTrip.destination}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">المقاعد</div>
                        <div className="text-sm font-bold">{selectedSeats.join(', ')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-3xl border border-stone-100">
                    <QRCodeSVG value={`booking:${lastBookingId}`} size={120} />
                  </div>
                </div>

                <div className="bg-stone-50 p-8 rounded-[2rem] border border-stone-100 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">الموعد</div>
                    <div className="text-lg font-black">{format(new Date(selectedTrip.departureTime), 'dd MMMM yyyy', { locale: ar })}</div>
                    <div className="text-sm font-bold text-emerald-600">{format(new Date(selectedTrip.departureTime), 'HH:mm')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">رقم التذكرة</div>
                    <div className="text-lg font-black uppercase tracking-tighter">#{lastBookingId.slice(0, 12)}</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-stone-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-stone-800 transition-all"
                  >
                    طباعة التذكرة
                  </button>
                  <button
                    onClick={() => {
                      resetBooking();
                    }}
                    className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
                  >
                    حجز رحلة أخرى
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && selectedTrip && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#111] rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border border-white/10 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black tracking-tighter">تأكيد الحجز</h2>
                <p className="text-stone-500 font-medium">يرجى مراجعة تفاصيل رحلتك قبل الدفع</p>
              </div>

              <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 text-xs font-bold uppercase tracking-widest">الوجهة</span>
                  <span className="font-black">{selectedTrip.origin} ← {selectedTrip.destination}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 text-xs font-bold uppercase tracking-widest">المقاعد</span>
                  <span className="font-black text-emerald-500">{selectedSeats.join(', ')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 text-xs font-bold uppercase tracking-widest">التاريخ</span>
                  <span className="font-black">{format(new Date(selectedTrip.departureTime), 'dd MMMM yyyy', { locale: ar })}</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-stone-400 font-bold">الإجمالي</span>
                  <span className="text-2xl font-black text-white">{formatCurrency(selectedSeats.length * selectedTrip.price)}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setBookingStep('payment');
                    setShowConfirmation(false);
                  }}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20"
                >
                  تأكيد ومتابعة
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 bg-white/5 text-stone-400 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  تعديل
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.02 }}
      className="group relative bg-[#111] rounded-[3rem] p-10 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer overflow-hidden shadow-2xl"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/5 blur-[80px] rounded-full group-hover:bg-emerald-600/10 transition-colors" />
      
      <div className="relative z-10 space-y-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest w-fit">
              {trip.busType} Class
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tighter">
            {formatCurrency(trip.price)}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
            <div className="w-px h-16 bg-gradient-to-b from-emerald-500 via-emerald-500/50 to-transparent" />
            <div className="w-3 h-3 rounded-full border-2 border-emerald-500/50" />
          </div>
          <div className="flex-1 space-y-8">
            <div>
              <div className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-2">نقطة الانطلاق</div>
              <div className="text-2xl font-black tracking-tight">{trip.origin}</div>
            </div>
            <div>
              <div className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-2">الوجهة النهائية</div>
              <div className="text-2xl font-black tracking-tight">{trip.destination}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/5">
          <div className="flex items-center gap-3 text-stone-400">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">التاريخ</span>
              <span className="text-sm font-bold text-white">{format(new Date(trip.departureTime), 'dd MMMM', { locale: ar })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-stone-400">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">الوقت</span>
              <span className="text-sm font-bold text-white">{format(new Date(trip.departureTime), 'HH:mm')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("w-4 h-4", i < (trip.rating || 5) ? "text-yellow-500 fill-yellow-500" : "text-stone-800")} />
              ))}
            </div>
            <span className="text-xs font-black text-stone-500">{(trip.rating || 5.0).toFixed(1)}</span>
          </div>
          <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-xl group-hover:shadow-emerald-500/20">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeaturedTripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative h-[600px] rounded-[4rem] overflow-hidden group cursor-pointer shadow-2xl"
      onClick={onClick}
    >
      <img 
        src={trip.image || `https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80`} 
        alt={trip.destination} 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      
      <div className="absolute top-12 right-12">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-3 rounded-full flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-black text-white uppercase tracking-widest">رحلة مميزة اليوم</span>
        </div>
      </div>

      <div className="absolute bottom-16 left-16 right-16 space-y-10">
        <div className="space-y-4">
          <div className="text-emerald-500 font-black uppercase tracking-widest text-sm">Exclusive Destination</div>
          <h3 className="text-7xl lg:text-8xl font-black text-white tracking-tighter leading-none">{trip.destination}</h3>
          <div className="flex items-center gap-6">
            <p className="text-stone-300 font-medium text-xl">من {trip.origin} • {trip.busType} Class</p>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-xl font-black text-white">4.9</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-8 border-t border-white/10">
          <div className="space-y-1">
            <div className="text-xs font-black text-stone-400 uppercase tracking-widest">السعر يبدأ من</div>
            <div className="text-5xl font-black text-white tracking-tighter">{formatCurrency(trip.price)}</div>
          </div>
          <button className="bg-emerald-600 text-white px-12 py-6 rounded-3xl font-black text-lg uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-600/40 active:scale-95">
            احجز الآن
          </button>
        </div>
      </div>
    </motion.div>
  );
}
