'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff, Github, ArrowRight, Command } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (activeTab === 'login') {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Login failed');
        } else {
          onClose();
          resetForm();
        }
      } else {
        if (!name.trim()) {
          setError('Name is required');
          setIsLoading(false);
          return;
        }
        const result = await register(email, password, name);
        if (!result.success) {
          setError(result.error || 'Registration failed');
        } else {
          onClose();
          resetForm();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError(null);
  };

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[420px] bg-[#0A0A0A] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden"
        >
          {/* Subtle noise texture overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-md transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center z-10 relative">
             <div className="mx-auto w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-6 shadow-glow">
                <Command className="w-5 h-5 text-black" />
             </div>
            <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
              {activeTab === 'login' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-zinc-500 text-sm">
              {activeTab === 'login' 
                ? 'Enter your credentials to access your workspace' 
                : 'Start building fully collaborative projects today'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4 z-10 relative">
            
            {/* Social Login Placeholders */}
            <div className="grid grid-cols-2 gap-3 mb-6">
               <button 
                  type="button" 
                  className="flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 hover:text-white transition-all"
                >
                  <Github className="w-4 h-4" />
                  GitHub
               </button>
               <button 
                  type="button" 
                  className="flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 hover:text-white transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
               </button>
            </div>

            <div className="relative flex items-center justify-center mb-6">
               <div className="absolute inset-x-0 h-px bg-zinc-800" />
               <span className="relative z-10 px-2 bg-[#0A0A0A] text-xs text-zinc-500 uppercase font-mono">Or continue with</span>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2"
              >
                 <div className="w-1 h-3 rounded-full bg-red-500" />
                {error}
              </motion.div>
            )}

            {/* Name field (register only) */}
            <AnimatePresence mode="popLayout">
              {activeTab === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-all font-sans"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email field */}
            <div>
               <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">Email Address</label>
               <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password field */}
             <div>
               <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">Password</label>
               <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
               </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 mt-2 bg-white hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {activeTab === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {activeTab === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Footer switcher */}
             <div className="text-center mt-6 pt-4 border-t border-zinc-900">
               <span className="text-zinc-500 text-sm">
                 {activeTab === 'login' ? "Don't have an account? " : "Already have an account? "}
               </span>
               <button
                 type="button"
                 onClick={() => switchTab(activeTab === 'login' ? 'register' : 'login')}
                 className="text-white hover:underline text-sm font-medium ml-1"
               >
                 {activeTab === 'login' ? 'Sign Up' : 'Sign In'}
               </button>
             </div>

          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

