'use client';

import { useCollaborationStore } from '@/stores/collaborationStore';
import { Users as UsersIcon, Crown } from 'lucide-react';

export function ParticipantsList() {
  const { participants, userName } = useCollaborationStore();

  return (
    <div className="p-4 bg-[#252526] border-b border-[#3c3c3c]">
      <div className="flex items-center gap-2 mb-3">
        <UsersIcon className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-300">
          Participants ({participants.length})
        </h3>
      </div>

      <div className="space-y-2">
        {participants.map((participant, index) => {
          const isCurrentUser = participant.name === userName || participant.id === userName;
          
          return (
            <div
              key={participant.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1e1e1e] hover:bg-[#2d2d2d] transition-colors"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: participant.color }}
              />
              <span className="text-sm text-gray-300 flex-1 truncate">
                {participant.name}
                {isCurrentUser && ' (You)'}
              </span>
              {index === 0 && (
                <span title="Room creator"><Crown className="w-4 h-4 text-yellow-500" /></span>
              )}
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
            </div>
          );
        })}
      </div>

      {participants.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          Waiting for participants...
        </p>
      )}
    </div>
  );
}
