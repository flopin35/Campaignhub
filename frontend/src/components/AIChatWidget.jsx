import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../services/aiService';
import { MessageCircle, X } from './icons/AppIcons';

function isDashboardPage(path) {
  return (
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.includes('/performance')
  );
}

export default function AIChatWidget({ context = {} }) {
  const location = useLocation();
  const dashboardMode = isDashboardPage(location.pathname);

  const welcome = useMemo(
    () =>
      dashboardMode
        ? "Hi! I'm your Dashboard AI — powered by GPT. Ask about analytics, campaign performance, or what to do next."
        : "Hi! I'm your Content AI — powered by Gemini. Ask for captions, slogans, hashtags, or help polishing your campaign copy.",
    [dashboardMode]
  );

  const loadingLabels = useMemo(
    () =>
      dashboardMode
        ? ['Analyzing dashboard…', 'Reviewing performance…', 'Preparing advice…']
        : ['Crafting copy…', 'Polishing content…', 'Almost ready…'],
    [dashboardMode]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: welcome }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(loadingLabels[0]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: welcome }]);
  }, [welcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingLabel]);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    setLoadingLabel(loadingLabels[0]);
    const interval = setInterval(() => {
      i = (i + 1) % loadingLabels.length;
      setLoadingLabel(loadingLabels[i]);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading, loadingLabels]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const page = location.pathname;
      const chatType = dashboardMode ? 'dashboard' : 'presentation';
      const response = await aiService.ask(userMessage, { ...context, page, history }, chatType);

      const reply = response.reply || 'Sorry, I could not process that.';
      const providers = response.providers || [];
      const mode = response.mode;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          meta: providers.length ? providers : mode === 'openai' || mode === 'gemini' ? [mode] : null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again or visit the Upload page to get started.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const badge = dashboardMode
    ? { label: 'GPT', sub: 'Dashboard AI', color: 'emerald' }
    : { label: 'G', sub: 'Content AI', color: 'blue' };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[500px] bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-elevated">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    dashboardMode
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                      : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                  }`}
                >
                  {badge.label}
                </div>
                <div>
                  <span className="font-medium text-sm block leading-tight">CampaignHub AI</span>
                  <span className="text-[10px] text-gray-500">{badge.sub}</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-surface-border"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white rounded-br-md'
                        : 'bg-surface-elevated text-gray-300 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                    {msg.meta && (
                      <div className="flex gap-1 mt-2 pt-2 border-t border-surface-border/50">
                        {msg.meta.includes('gemini') && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Gemini</span>
                        )}
                        {(msg.meta.includes('openai') || msg.meta.includes('gpt')) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">GPT</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-surface-elevated px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                            dashboardMode ? 'bg-emerald-400' : 'bg-blue-400'
                          }`}
                        />
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                      <span className="text-xs text-gray-500">{loadingLabel}</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 border-t border-surface-border bg-surface/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    dashboardMode ? 'Ask about analytics or campaign management…' : 'Ask for captions, slogans, or copy…'
                  }
                  className="input-field text-sm py-2.5 flex-1"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="btn-primary py-2.5 px-4 text-sm disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg shadow-brand-600/30 flex items-center justify-center transition-colors text-xl"
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>
    </>
  );
}
