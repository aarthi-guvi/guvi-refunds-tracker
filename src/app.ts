import express from 'express';
import cors from 'cors';
import path from 'path';
import { prisma } from './prisma';
import { auditMiddleware } from './middleware/auditMiddleware';
import refundRoutes from './routes/refundRoutes';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import userRoutes from './routes/userRoutes';
import configRoutes from './routes/configRoutes';
import adminRoutes from './routes/adminRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

// Apply audit middleware globally for RefundRequest updates
auditMiddleware(prisma);

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.set('json replacer', (_key: string, value: unknown) => typeof value === 'bigint' ? Number(value) : value);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Simple health check
app.get('/health', (_req, res) => res.send({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

export default app;
