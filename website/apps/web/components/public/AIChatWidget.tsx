'use client';

import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'ai'|'user', text: string}[]>([
    { role: 'ai', text: 'مرحباً بك في منظومة إنسان الرعاية الصحية! كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');

  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    const newMessages = [...messages, { role: 'user' as const, text: userText }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);
    
    try {
      const API_BASE = (typeof window !== 'undefined' && process.env.NODE_ENV === 'production')
        ? '/api/v1'
        : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1');
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The API only accepts 'user' | 'assistant' | 'ai' — 'ai' is our
          // internal display label, translate it to 'assistant' on the wire.
          messages: newMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
        })
      });
      
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي. الرجاء المحاولة لاحقاً.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-50 p-4 bg-[#0B1F3A] text-white rounded-full shadow-xl hover:bg-[#0E7C86] transition-all transform hover:scale-105 ${isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
        aria-label="مساعد إنسان الذكي"
      >
        <MessageCircle size={28} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 left-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 transform origin-bottom-left ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-10 pointer-events-none'}`}
        style={{ height: '500px', maxHeight: 'calc(100vh - 40px)' }}
      >
        {/* Header */}
        <div className="bg-[#0B1F3A] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h3 className="font-bold text-sm">مساعد إنسان الذكي</h3>
              <p className="text-xs text-white/70">متصل الآن</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[#0E7C86] text-white rounded-tr-none' 
                    : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 text-gray-800 shadow-sm rounded-2xl rounded-tl-none p-3 text-sm flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            dir="auto"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:bg-gray-300"
          >
            <Send size={18} className="rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </>
  );
}
