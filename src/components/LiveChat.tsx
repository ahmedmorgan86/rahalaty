import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';
import { api } from '../services/api';

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let intervalId: ReturnType<typeof setInterval>;

    const initializeChat = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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

        const fetchMessages = async () => {
          const msgs = await api.getMessages(currentChatId);
          setMessages(msgs);
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }, 100);
        };

        await fetchMessages();
        intervalId = setInterval(fetchMessages, 3000);
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
    } catch (error) {
      console.error('Error sending message:', error);
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
            className="absolute bottom-20 right-0 w-96 bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="bg-emerald-600 p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">الدعم الفني</div>
                  <div className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest">متصل الآن</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div ref={scrollRef} className="flex-1 p-6 space-y-4 max-h-96 overflow-y-auto">
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
            <form onSubmit={handleSend} className="p-6 border-t border-white/5 flex gap-4">
              <input type="text" placeholder="اكتب رسالتك..."
                className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none text-white text-sm"
                value={message} onChange={e => setMessage(e.target.value)} />
              <button type="submit" className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition-all">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-600/40 hover:bg-emerald-500 transition-all active:scale-95">
        {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-8 h-8" />}
      </button>
    </div>
  );
}
