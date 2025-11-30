import express from 'express';
import cors from 'cors';
import { elwaScheduler } from './elwa-scheduler.js';

// Import routers
import readingsRouter from './routes/readings.routes.js';
import tariffsRouter from './routes/tariffs.routes.js';
import elwaRouter from './routes/elwa.routes.js';
import settingsRouter from './routes/settings.routes.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mount routers
app.use('/api/readings', readingsRouter);
app.use('/api/tariffs', tariffsRouter);
app.use('/api/elwa', elwaRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`For mobile access use: http://<your-ip>:${PORT}`);

  // Start ELWA scheduler
  elwaScheduler.start();
  console.log('✓ ELWA Cloud scheduler started');
});
