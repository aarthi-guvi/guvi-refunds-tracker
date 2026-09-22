import { Router } from 'express';
// JWT handling moved to dedicated auth middleware
import { signJwt, requireAuth } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';

const router = Router();


router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signJwt({ userId: user.id, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  res.json({ id: user?.id, name: user?.name, role: user?.role, email: user?.email });
});

export default router;
