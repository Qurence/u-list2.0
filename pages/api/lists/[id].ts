import { getServerSession } from 'next-auth/next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });

  if (req.method === 'GET') {
    const list = await prisma.list.findUnique({
      where: { id },
      include: { users: { include: { user: true } }, products: true },
    });
    if (!list) return res.status(404).json({ error: 'Not found' });
    return res.json(list);
  }

  if (req.method === 'PATCH') {
    const { name } = req.body;
    const list = await prisma.list.update({
      where: { id },
      data: { name },
    });
    return res.json(list);
  }

  if (req.method === 'DELETE') {
    await prisma.list.delete({ where: { id } });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 