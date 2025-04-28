import express from 'express';
import cors from 'cors';
import { Connection, PublicKey } from '@solana/web3.js';
import walletRoutes from './routes/wallet';

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use('/api/wallet', walletRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 