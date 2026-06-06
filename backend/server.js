import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initFirebase } from './config/firebaseConfig.js';
import { startExpiryScheduler } from './services/expiryService.js';
import campaignRoutes from './routes/campaignRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/uploadRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase and expiry scheduler
initFirebase();
startExpiryScheduler();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'CampaignHub API is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', aiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CampaignHub API running on http://localhost:${PORT}`);
});

export default app;
