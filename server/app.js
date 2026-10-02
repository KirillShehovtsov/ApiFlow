// app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { errorHandler } from './src/middleware/errorHandler.js';
import authRoutes from './src/routes/auth.routes.js';
import collectionRoutes from './src/routes/collection.routes.js';
import requestRoutes from './src/routes/request.routes.js';
import proxyRoutes from './src/routes/proxy.routes.js';
import historyRoutes from './src/routes/history.routes.js';
import environmentRoutes from './src/routes/environment.routes.js';
import curlRoutes from './src/routes/curl.routes.js';
import testScriptRoutes from './src/routes/testscript.routes.js';
import loadTestRoutes from './src/routes/loadtest.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/curl', curlRoutes);
app.use('/api/test-scripts', testScriptRoutes);
app.use('/api/load-tests', loadTestRoutes);

app.use(errorHandler);

export default app;