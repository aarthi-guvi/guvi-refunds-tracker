import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, requireRole(Role.ADMIN), async (req, res) => {
  const { email, password, name, role } = req.body as { email?: string; password?: string; name?: string; role?: Role };
  if (!email || !password || !name || !role || !Object.values(Role).includes(role)) {
    return res.status(400).json({ error: 'email, password, name, and a valid role are required' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash, name, role }, select: { id: true, email: true, name: true, role: true } });
    return res.status(201).json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'A user with that email already exists' });
    console.error(error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;