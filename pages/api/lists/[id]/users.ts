import { getServerSession } from 'next-auth/next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid list id' });

  if (req.method === 'GET') {
    const users = await prisma.listUser.findMany({
      where: { listId: id },
      include: { user: true },
    });
    return res.json(users);
  }

  if (req.method === 'POST') {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Проверка на дублирование
    const exists = await prisma.listUser.findFirst({ where: { listId: id, userId: user.id } });
    if (exists) return res.status(409).json({ error: 'User already in list' });
    const listUser = await prisma.listUser.create({ data: { listId: id, userId: user.id } });
    return res.status(201).json(listUser);
  }

  if (req.method === 'DELETE') {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User id required' });
    await prisma.listUser.deleteMany({ where: { listId: id, userId } });
    return res.status(204).end();
  }

  if (req.method === 'PATCH') {
    // Пользователь выходит сам
    await prisma.listUser.deleteMany({ where: { listId: id, userId: session.user.id } });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 