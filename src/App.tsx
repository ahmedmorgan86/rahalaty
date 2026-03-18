import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { UserProfile } from './types';
import { api } from './services/api';

import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user);
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (authUser: any) => {
    try {
      const profile = await api.getUser(authUser.id);
      if (profile) {
        setUserProfile(profile);
        return;
      }
      // مفيش profile — عمله جديد
      const newProfile: UserProfile = {
        uid: authUser.id,
        email: authUser.email || '',
        displayName: authUser.user_metadata?.displayName || authUser.email?.split('@')[0] || 'مسافر رحلتي',
        role: 'user',
        loyaltyPoints: 0,
        createdAt: new Date().toISOString(),
      };
      try {
        await api.saveUser(newProfile);
      } catch (e) {
        console.warn('Could not save profile:', e);
      }
      setUserProfile(newProfile);
    } catch (e) {
      console.error('loadProfile error:', e);
      // حتى لو فشل، مش هنوقف التطبيق
      setUserProfile({
        uid: authUser.id,
        email: authUser.email || '',
        displayName: authUser.user_metadata?.displayName || 'مسافر رحلتي',
        role: 'user',
        loyaltyPoints: 0,
        createdAt: new Date().toISOString(),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-stone-500 text-xs mt-4 font-bold uppercase tracking-widest">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute user={user}>
            <Layout userProfile={userProfile}>
              <Home userProfile={userProfile} />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute user={user}>
            <Layout userProfile={userProfile}>
              <Profile userProfile={userProfile} />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute userProfile={userProfile}>
            <Layout userProfile={userProfile}>
              <Admin />
            </Layout>
          </AdminRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function ProtectedRoute({ user, children }: { user: any; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ userProfile, children }: { userProfile: UserProfile | null; children: React.ReactNode }) {
  if (!userProfile || userProfile.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
}
