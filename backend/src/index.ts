import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { searchRouter } from './routes/search';
import { resultsRouter } from './routes/results';
import { userRouter } from './routes/user';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/search', searchRouter);
app.use('/api/results', resultsRouter);
app.use('/api/user', userRouter);

// Error Handler
app.use(errorHandler);

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
app.listen(PORT, () => {
  console.log(`
  🚀 GoViral Backend Server
  ═══════════════════════════════════════
  📡 Server running on http://localhost:${PORT}
  🔌 Database connected via Prisma
  📊 Ready to discover viral content!
  ═══════════════════════════════════════
  `);
});

export default app;
