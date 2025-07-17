import { getServerSession } from 'next-auth/next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Получить все списки пользователя
    const lists = await prisma.list.findMany({
      where: {
        users: {
          some: { userId: session.user.id },
        },
      },
      include: { users: true },
    });
    return res.json(lists);
  }

  if (req.method === 'POST') {
    // Создать новый список
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const list = await prisma.list.create({
      data: {
        name,
        ownerId: session.user.id,
        users: {
          create: { userId: session.user.id },
        },
      },
    });
    return res.status(201).json(list);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 