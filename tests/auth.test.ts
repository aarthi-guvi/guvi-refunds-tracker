import request from 'supertest';
import express from 'express';
import { signJwt } from '../src/middleware/auth';
import { requireAuth, requireRole, Role } from '../src/middleware/auth';

const app = express();
app.use(express.json());

app.get('/protected', requireAuth, (req, res) => {
  res.json({ userId: req.user?.userId, role: req.user?.role });
});

app.get('/admin', requireAuth, requireRole(Role.ADMIN), (req, res) => {
  res.json({ ok: true });
});

describe('Auth & Role middleware', () => {
  const token = signJwt({ userId: 1, role: Role.ADMIN });

  it('rejects missing token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('accepts valid token', async () => {
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(1);
    expect(res.body.role).toBe('ADMIN');
  });

  it('rejects wrong role', async () => {
    const userToken = signJwt({ userId: 2, role: Role.COORDINATOR });
    const res = await request(app).get('/admin').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
