'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [roomCode, setRoomCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!isAuthenticated && !guestName.trim()) {
      setError('Please enter your name to join as a guest');
      return;
    }

    setIsLoading(true);

    try {
      // Use regex-ready code or as typed
      const code = roomCode.trim();
      
      let shouldProceed = false;

      if (isAuthenticated) {
        // Join as authenticated user
        const result = await api.joinRoom(code);
        if (result.error) {
          // If room not found in DB, it might be ephemeral (socket-only). Allow join.
          if (result.error.toLowerCase().includes('not found')) {
            shouldProceed = true;
          } else {
            setError(result.error);
            return;
          }
        } else {
          shouldProceed = true;
        }
      } else {
        // Join as guest - make a direct request without auth
        const result = await api.joinRoomGuest(code, guestName.trim());
        if (result.error) {
           // If room not found in DB, it might be ephemeral (socket-only). Allow join.
           if (result.error.toLowerCase().includes('not found')) {
             shouldProceed = true;
           } else {
             setError(result.error);
             return;
           }
        } else {
          shouldProceed = true;
        }
        
        // Store guest info regardless of DB status (for ephemeral support)
        localStorage.setItem('clouddev_guest_name', guestName.trim());
      }

      if (shouldProceed) {
        // Navigate to the room
        router.push(`/editor/${code}?room=true`);
        onClose();
      }
    } catch (err) {
      // If network error, maybe try to navigate anyway? 
      // For now, keep error message but log it.
      console.error(err);
      setError('Failed to join room. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Limit to 6 characters, allow alphanumeric
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    setRoomCode(value);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0d1117] rounded-xl border border-[#30363d] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Join Room</h2>
                <p className="text-sm text-gray-400">Enter a room code to collaborate</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleJoinRoom} className="p-6 space-y-4">
            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Room Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={handleCodeChange}
                placeholder="ABCD12"
                className="w-full px-4 py-4 bg-[#161b22] border border-[#30363d] rounded-lg text-center font-mono text-2xl text-white placeholder-gray-600 tracking-widest focus:outline-none focus:border-blue-500 transition-colors"
                maxLength={6}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the 6-character room code
              </p>
            </div>

            {/* Guest Name Input (only if not authenticated) */}
            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">
                  You're joining as a guest. <button type="button" className="text-blue-400 hover:underline">Sign in</button> for more features.
                </p>
              </motion.div>
            )}

            {/* Authenticated user info */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-3 p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-white">{user.name}</p>
                  <p className="text-xs text-gray-500">Joining as {user.email}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !roomCode.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Room
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
