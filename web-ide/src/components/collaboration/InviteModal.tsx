'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Link, Users, Share2 } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export function InviteModal({ isOpen, onClose, roomCode }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const { participants } = useCollaborationStore();

  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/editor/${roomCode}?room=true`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Invite Collaborators</h2>
                <p className="text-sm text-gray-400">Share this room with your team</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Room Code */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Room Code</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg font-mono text-2xl text-white text-center tracking-widest select-all">
                  {roomCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-3 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Invite Link */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Invite Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg text-sm text-gray-300 truncate">
                  {inviteUrl}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Current Participants */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-400">Currently in room ({participants.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#21262d] rounded-full"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: participant.color }}
                    />
                    <span className="text-sm text-gray-300">{participant.name}</span>
                  </div>
                ))}
                {participants.length === 0 && (
                  <p className="text-sm text-gray-500">No participants yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#161b22] border-t border-[#30363d]">
            <p className="text-xs text-gray-500 text-center">
              Anyone with this link can join and collaborate in real-time
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
