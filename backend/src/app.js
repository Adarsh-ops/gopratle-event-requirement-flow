import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { Requirement } from './Requirement.js';
import { requirementSchema } from './validation.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '32kb' }));

const configuredOrigins = (process.env.FRONTEND_URLS || 'http://localhost:3000')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('This origin is not allowed to access the API.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
}));

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again in a little while.' },
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'event-requirements-api',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/requirements', submissionLimiter, async (req, res, next) => {
  const parsed = requirementSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ success: false, message: 'Please check the form fields.', errors });
  }

  try {
    const referenceCode = `GP-${randomBytes(3).toString('hex').toUpperCase()}`;
    const requirement = await Requirement.create({ ...parsed.data, referenceCode });
    return res.status(201).json({
      success: true,
      message: 'Your event requirement has been received.',
      data: {
        id: requirement._id.toString(),
        referenceCode: requirement.referenceCode,
        category: requirement.category,
        createdAt: requirement.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

app.use((error, _req, res, _next) => {
  if (error.message === 'This origin is not allowed to access the API.') {
    return res.status(403).json({ success: false, message: error.message });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body must be valid JSON.' });
  }
  console.error('[api-error]', error.message);
  return res.status(500).json({ success: false, message: 'Something went wrong while saving your request. Please try again.' });
});
