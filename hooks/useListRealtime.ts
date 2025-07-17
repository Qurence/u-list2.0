import { useEffect } from 'react';
import { getSocket } from '../lib/socketClient';

export function useListRealtime(listId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!listId) return;
    const socket = getSocket();
    socket.emit('join-list', listId);
    socket.on('list-updated', onUpdate);
    return () => {
      socket.off('list-updated', onUpdate);
      socket.emit('leave-list', listId);
    };
  }, [listId, onUpdate]);
} 