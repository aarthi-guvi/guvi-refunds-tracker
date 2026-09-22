import 'express';

declare global {
  namespace Express {
    interface Request {
      file?: any;
      files?: any[];
      user?: {
        userId: number;
        role: string;
      };
    }
  }
}