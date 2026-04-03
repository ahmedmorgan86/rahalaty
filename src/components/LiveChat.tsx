import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, User, WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';
import { api } from '../services/api';

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const msgs = await api.getMessages(id);
      setMessages(msgs);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let intervalId: ReturnType<typeof setInterval>;

    const initializeChat = async () => {
      if (!isOnline) {
        setError('لا يوجد اتصال بالإنترنت');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('يرجى تسجيل الدخول أولاً');
          setLoading(false);
          return;
        }

        const chats = await api.getChats(user.id);
        const activeChat = chats.find(c => c.userId === user.id && c.status === 'active');

        let currentChatId = '';
        if (!activeChat) {
          const newChat = await api.createChat({
            userId: user.id,
            userName: user.user_metadata?.displayName || 'عميل',
            status: 'active',
            updatedAt: new Date().toISOString(),
            lastMessage: 'بدأ المحادثة',
          });
          currentChatId = newChat.id;
        } else {
          currentChatId = activeChat.id;
        }

        setChatId(currentChatId);
        await fetchMessages(currentChatId);
        intervalId = setInterval(() => fetchMessages(currentChatId), 3000);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('فشل تحميل المحادثة');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isOpen, isOnline, fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId || sending) return;

    if (!isOnline) {
      setError('لا يوجد اتصال بالإنترنت');
      return;
    }

    setSending(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('يرجى تسجيل الدخول أولاً');
      setSending(false);
      return;
    }

    const text = message;
    setMessage('');

    try {
      await api.sendMessage(chatId, {
        text,
        senderId: user.id,
        senderName: user.user_metadata?.displayName || 'عميل',
        isAdmin: false,
        createdAt: new Date().toISOString(),
      });
      await api.updateChat(chatId, { lastMessage: text, updatedAt: new Date().toISOString() });
      await fetchMessages(chatId);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('فشل إرسال الرسالة');
      setMessage(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-20 right-0 w-96 bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[600px]"
          >
            <div className="bg-emerald-600 p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">الدعم الفني</div>
                  <div className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-300" : "bg-red-300")} />
                    {isOnline ? 'متصل الآن' : 'غير متصل'}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {!isOnline && (
              <div className="bg-red-500/10 border-b border-red-500/20 p-4 flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold text-red-400">لا يوجد اتصال بالإنترنت</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border-b border-red-500/20 p-3 flex items-center gap-2">
                <span className="text-sm font-bold text-red-400">{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex-1 flex items-center justify-center p-10">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : (
              <div ref={scrollRef} className="flex-1 p-6 space-y-4 max-h-80 overflow-y-auto">
                {messages.length === 0 && (
                  <div className="text-center text-stone-500 text-xs py-10">مرحباً بك! كيف يمكننا مساعدتك اليوم؟</div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={cn('flex', !msg.isAdmin ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] p-4 rounded-2xl text-sm font-medium',
                      !msg.isAdmin ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white/5 text-stone-300 rounded-tl-none')}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <form onSubmit={handleSend} className="p-6 border-t border-white/5 flex gap-4">
              <input 
                type="text" 
                placeholder="اكتب رسالتك..." 
                disabled={!isOnline || sending}
                className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none text-white text-sm disabled:opacity-50"
                value={message} 
                onChange={e => setMessage(e.target.value)} 
              />
              <button 
                type="submit" 
                disabled={!isOnline || sending || !message.trim()}
                className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={!isOnline}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95",
          isOnline 
            ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/40" 
            : "bg-stone-600 text-stone-400 cursor-not-allowed"
        )}
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-8 h-8" />}
      </button>
    </div>
  );
}
