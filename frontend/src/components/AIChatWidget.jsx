import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '../services/aiService';
import { MessageCircle, X } from './icons/AppIcons';

const WELCOME =
  "Hi! I'm your CampaignHub AI — powered by Gemini & GPT working together. Ask me about uploads, campaigns, sharing links, or growth tips.";

const LOADING_LABELS = [
  'Gemini analyzing…',
  'GPT refining…',
  'Combining insights…',
];

export default function AIChatWidget({ context = {} }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(LOADING_LABELS[0]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingLabel]);

  // Cycle loading labels for smooth dual-AI feel
  useEffect(() => {
    if (!loading) return;
    let i = 0;
    setLoadingLabel(LOADING_LABELS[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_LABELS.length;
      setLoadingLabel(LOADING_LABELS[i]);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

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
      const response = await aiService.ask(userMessage, {
        ...context,
        page,
        history,
      });

      const reply = response.reply || 'Sorry, I could not process that.';
      const mode = response.mode;
      const providers = response.providers || [];

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          meta: mode === 'collaborative' ? providers : null,
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
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-elevated">
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-1">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400">
                    G
                  </div>
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                    AI
                  </div>
                </div>
                <div>
                  <span className="font-medium text-sm block leading-tight">CampaignHub AI</span>
                  <span className="text-[10px] text-gray-500">Gemini + GPT</span>
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

            {/* Messages */}
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
                        {msg.meta.includes('openai') && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">GPT</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-surface-elevated px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                      <span className="text-xs text-gray-500">{loadingLabel}</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 border-t border-surface-border bg-surface/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about campaigns…"
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
