'use client';

import { useState } from 'react';
import { Users, Share2, LogOut, Copy, Check } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { InviteModal } from './InviteModal';
import { cn } from '@/lib/utils';

interface CollaborationTopbarProps {
  roomCode: string;
  onLeaveRoom?: () => void;
}

export function CollaborationTopbar({ roomCode, onLeaveRoom }: CollaborationTopbarProps) {
  const { participants, status, userName, leaveRoom } = useCollaborationStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLeaveRoom = () => {
    leaveRoom();
    onLeaveRoom?.();
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

  // Connection status indicator
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <>
      <div className="h-10 px-4 flex items-center justify-between bg-[#161b22] border-b border-[#30363d]">
        {/* Left side - Room info */}
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor(), status === 'reconnecting' && 'animate-pulse')} />
            <span className="text-xs text-gray-400">
              {status === 'connected' ? 'Live' : status === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
            </span>
          </div>

          {/* Room code badge */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-2 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded text-xs font-mono text-gray-300 transition-colors"
            title="Click to copy room code"
          >
            <span className="text-blue-400">{roomCode}</span>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {/* Center - Participants */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-2">
            {participants.slice(0, 5).map((participant) => (
              <div
                key={participant.id}
                className="relative group"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#161b22] cursor-default"
                  style={{ backgroundColor: participant.color }}
                  title={participant.name}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {participant.name}
                  {participant.name === userName && ' (You)'}
                </div>
              </div>
            ))}
            {participants.length > 5 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#21262d] text-gray-400 text-xs font-bold border-2 border-[#161b22]">
                +{participants.length - 5}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 ml-2">
            {participants.length} {participants.length === 1 ? 'person' : 'people'} in room
          </span>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Invite button */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Invite
          </button>

          {/* Leave room button */}
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#21262d] hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs font-medium rounded border border-[#30363d] hover:border-red-500/50 transition-colors"
            title="Leave room"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomCode={roomCode}
      />
    </>
  );
}
