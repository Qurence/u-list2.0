import { getServerSession } from 'next-auth/next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import Ably from "ably";

if (!process.env.ABLY_API) {
  throw new Error("ABLY_API env variable is not set");
}
const ably = new Ably.Rest(process.env.ABLY_API);

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid list id' });

  if (req.method === 'GET') {
    const products = await prisma.product.findMany({ where: { listId: id } });
    return res.json(products);
  }

  if (req.method === 'POST') {
    const { name, quantity } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const product = await prisma.product.create({
      data: { name, quantity: quantity || 1, listId: id },
    });
    await ably.channels.get(`list-${id}`).publish("product-add", product);
    return res.status(201).json(product);
  }

  if (req.method === 'PATCH') {
    const { productId, name, quantity, checked } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product id required' });
    const product = await prisma.product.update({
      where: { id: productId },
      data: { name, quantity, checked },
    });
    await ably.channels.get(`list-${id}`).publish("product-edit", product);
    return res.json(product);
  }

  if (req.method === 'DELETE') {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product id required' });
    await prisma.product.delete({ where: { id: productId } });
    await ably.channels.get(`list-${id}`).publish("product-delete", { productId });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 