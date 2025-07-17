import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Явная проверка на null и наличие server
  if (res.socket && (res.socket as any).server) {
    if (!(res.socket as any).server.io) {
      const io = new Server((res.socket as any).server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: '*',
        },
      });

      io.on('connection', (socket) => {
        socket.on('join-list', (listId) => {
          socket.join(listId);
        });
        // Новое событие: тип и данные
        socket.on('list-event', (listId, event) => {
          socket.to(listId).emit('list-event', event);
        });
      });

      (res.socket as any).server.io = io;
    }
  }
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 