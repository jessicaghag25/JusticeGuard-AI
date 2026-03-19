import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import apiRouter from './routes/index.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const uploadDir = process.env.UPLOAD_DIR || 'uploads';

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Serve locally uploaded files for quick Replit testing.
app.use('/uploads', express.static(path.resolve(process.cwd(), 'backend', uploadDir)));

// Health check endpoint helpful for Replit deployment verification.
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: '96ply-backend' });
});

app.use('/api', apiRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`96ply backend listening on http://0.0.0.0:${port}`);
});
