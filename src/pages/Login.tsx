import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Bus, Star, ShieldCheck, Zap, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { UserProfile } from '../types';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'social' | 'email' | 'register'>('social');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const saveProfile = async (uid: string, email: string, displayName: string) => {
    try {
      const existing = await api.getUser(uid);
      if (!existing) {
        const profile: UserProfile = {
          uid, email, displayName,
          role: 'user',
          loyaltyPoints: 0,
          createdAt: new Date().toISOString(),
        };
        await api.saveUser(profile);
      }
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        await saveProfile(data.user.id, data.user.email!, data.user.user_metadata?.displayName || 'مسافر رحلتي');
      }
      navigate('/');
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('يرجى تأكيد بريدك الإلكتروني أولاً — تحقق من صندوق الوارد');
      } else {
        setError(err.message || 'فشل تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { displayName: name } }
      });
      if (error) throw error;
      if (data.user) {
        await saveProfile(data.user.id, data.user.email!, name);
        // If email confirmation is disabled in Supabase, user is logged in directly
        if (data.session) {
          navigate('/');
        } else {
          setError('');
          setMode('social');
          alert('تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجل الدخول.');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        setError('البريد الإلكتروني مستخدم بالفعل — جرّب تسجيل الدخول');
      } else {
        setError(err.message || 'فشل إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-6 overflow-hidden relative" dir="rtl">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10"
      >
        {/* Branding */}
        <div className="space-y-12">
          <div className="space-y-6">
            <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-600/40">
              <Bus className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <div className="text-emerald-500 font-black uppercase tracking-[0.4em] text-xs">Rahlaty Premium</div>
              <h1 className="text-7xl font-black tracking-tighter leading-none">سافر بذكاء<br />ورفاهية</h1>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Feature icon={<Zap />} title="حجز فوري" desc="احجز مقعدك في أقل من 30 ثانية" />
            <Feature icon={<Star />} title="نقاط ولاء" desc="اجمع النقاط واستبدلها برحلات مجانية" />
            <Feature icon={<ShieldCheck />} title="دفع آمن" desc="أحدث وسائل التشفير لحماية بياناتك" />
            <Feature icon={<Bus />} title="أسطول حديث" desc="أتوبيسات مجهزة بأعلى سبل الراحة" />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#111] rounded-[3.5rem] p-12 border border-white/5 shadow-2xl relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[3.5rem]" />
          <div className="relative z-10 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black tracking-tight">
                {mode === 'social' ? 'ابدأ رحلتك الآن' : mode === 'email' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </h2>
              <p className="text-stone-500 font-medium">
                {mode === 'social' ? 'سجل دخولك للوصول إلى عالم من الرفاهية' : 'أدخل بياناتك للمتابعة'}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-bold text-center"
              >
                {error}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {mode === 'social' ? (
                <motion.div key="social" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <button
                    onClick={() => { setMode('email'); setError(''); }}
                    className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20"
                  >
                    <Mail className="w-5 h-5" />
                    تسجيل الدخول بالبريد الإلكتروني
                  </button>
                  <button
                    onClick={() => { setMode('register'); setError(''); }}
                    className="w-full bg-white/5 border border-white/10 text-white font-bold py-5 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    <User className="w-5 h-5 text-emerald-500" />
                    إنشاء حساب جديد
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={mode === 'email' ? handleEmailLogin : handleRegister}
                  className="space-y-6"
                >
                  {mode === 'register' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الاسم بالكامل</label>
                      <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
                        <input required type="text" placeholder="أحمد محمد"
                          className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl focus:border-emerald-500 outline-none text-white font-bold"
                          value={name} onChange={e => setName(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
                      <input required type="email" placeholder="example@mail.com"
                        className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl focus:border-emerald-500 outline-none text-white font-bold"
                        value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600" />
                      <input required type="password" placeholder="••••••••" minLength={6}
                        className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl focus:border-emerald-500 outline-none text-white font-bold"
                        value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-xl shadow-emerald-600/20">
                    {loading ? 'جاري التحميل...' : mode === 'email' ? 'دخول' : 'إنشاء حساب'}
                  </button>
                  <button type="button" onClick={() => { setMode('social'); setError(''); }}
                    className="w-full text-stone-500 text-xs font-bold hover:text-white transition-colors flex items-center justify-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    العودة
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all">
      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      </div>
      <div>
        <div className="text-sm font-black text-white mb-1">{title}</div>
        <div className="text-[10px] text-stone-500 font-medium leading-tight">{desc}</div>
      </div>
    </div>
  );
}
