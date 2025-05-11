// Load environment variables at the very beginning
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { Connection } from '@solana/web3.js';
import solanaRoutes from './routes/solana_routes';
import heliusRoutes from './routes/helius_routes';
import { networkInterfaces } from 'os';

const app = express();
const port = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Solana connection
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/solana', solanaRoutes);
app.use('/api/helius', heliusRoutes);

// Get local IP address
const getLocalIpAddress = () => {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const localIp = getLocalIpAddress();

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on:`);
  console.log(`- Local: http://localhost:${port}`);
  console.log(`- Network: http://${localIp}:${port}`);
});