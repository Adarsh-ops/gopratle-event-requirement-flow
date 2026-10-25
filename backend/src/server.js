import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';

const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and add your MongoDB connection string.');
  process.exit(1);
}

try {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB.');
  const server = app.listen(port, () => console.log(`API listening on port ${port}`));

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}
