import jwt from 'jsonwebtoken';
import { requireAuth, requireRole, JWT_SECRET } from '../src/middleware/auth';

const response = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const request = (authorization?: string): any => ({ headers: authorization ? { authorization } : {} });

describe('auth middleware', () => {
  test('rejects a missing token', () => {
    const res = response();
    const next = jest.fn();
    requireAuth(request(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects malformed and expired tokens', () => {
    for (const token of ['not-a-jwt', jwt.sign({ userId: 1, role: 'BD' }, JWT_SECRET, { expiresIn: -1 })]) {
      const res = response();
      const next = jest.fn();
      requireAuth(request(`Bearer ${token}`), res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    }
  });

  test('attaches a verified user and allows an authorized role', () => {
    const token = jwt.sign({ userId: 7, role: 'BD' }, JWT_SECRET);
    const req = request(`Bearer ${token}`);
    const res = response();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(req.user).toEqual({ userId: 7, role: 'BD' });
    expect(next).toHaveBeenCalled();

    const roleNext = jest.fn();
    requireRole('BD' as any)(req, res, roleNext);
    expect(roleNext).toHaveBeenCalled();
  });

  test('rejects a wrong role with 403', () => {
    const req = { user: { userId: 7, role: 'BD' } } as any;
    const res = response();
    const next = jest.fn();
    requireRole('FINANCE' as any)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});