import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { LogOut, Bus, User, ShieldCheck, Ticket, Star } from 'lucide-react';
import { UserProfile } from '../types';
import { motion } from 'framer-motion';
import LiveChat from './LiveChat';

interface LayoutProps {
  children: React.ReactNode;
  userProfile: UserProfile | null;
}

export default function Layout({ children, userProfile }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      {/* Premium Sidebar/Rail Navigation */}
      <nav className="fixed right-0 top-0 h-full w-20 bg-[#111] border-l border-white/5 flex flex-col items-center py-8 gap-8 z-50 hidden md:flex">
        <Link to="/" className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
          <Bus className="w-7 h-7 text-white" />
        </Link>

        <div className="flex-1 flex flex-col gap-6">
          <NavLink to="/" icon={<Bus />} active={isActive('/')} label="الرحلات" />
          <NavLink to="/profile" icon={<Ticket />} active={isActive('/profile')} label="تذاكري" />
          {userProfile?.role === 'admin' && (
            <NavLink to="/admin" icon={<ShieldCheck />} active={isActive('/admin')} label="الإدارة" />
          )}
        </div>

        {userProfile && (
          <button onClick={handleLogout} className="p-3 text-stone-500 hover:text-red-500 transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
        )}
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden bg-[#111] border-b border-white/5 p-4 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 text-emerald-500 font-black text-xl">
          <Bus className="w-6 h-6" />
          <span>رحلاتي</span>
        </Link>
        {userProfile ? (
          <Link to="/profile" className="w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-500" />
          </Link>
        ) : (
          <Link to="/login" className="text-sm font-bold text-emerald-500">دخول</Link>
        )}
      </header>

      <div className="md:pr-20 min-h-screen flex flex-col">
        {/* Top Bar with Stats */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 hidden md:flex">
          <div className="flex items-center gap-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">
              {isActive('/') ? 'اكتشف الرحلات' : isActive('/profile') ? 'ملفك الشخصي' : 'لوحة التحكم'}
            </h2>
          </div>

          {userProfile && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                <span className="text-sm font-bold text-emerald-500">{userProfile.loyaltyPoints} نقطة</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-stone-400">{userProfile.displayName}</div>
                  <div className="text-[10px] text-stone-600 uppercase tracking-tighter">{userProfile.role}</div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center font-bold">
                  {userProfile.displayName?.[0]}
                </div>
              </div>
            </div>
          )}
        </div>

        <main className="flex-1 p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </main>

        <footer className="p-8 border-t border-white/5 text-center text-stone-600 text-xs uppercase tracking-widest">
          © {new Date().getFullYear()} Rahlaty Premium Experience
        </footer>
      </div>
      <LiveChat />
    </div>
  );
}

function NavLink({ to, icon, active, label }: { to: string; icon: React.ReactNode; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      className={`relative group p-3 rounded-2xl transition-all ${
        active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-stone-500 hover:text-white hover:bg-white/5'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      <span className="absolute right-full mr-4 px-2 py-1 bg-white text-black text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {label}
      </span>
    </Link>
  );
}
