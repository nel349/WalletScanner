import express from 'express';
import cors from 'cors';
import { Connection, PublicKey } from '@solana/web3.js';

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

// Validate wallet address
app.get('/validate/:address', async (req, res) => {
  try {
    new PublicKey(req.params.address);
    res.json({ valid: true });
  } catch (error) {
    res.json({ valid: false });
  }
});

// Get wallet balance
app.get('/balance/:address', async (req, res) => {
  try {
    const publicKey = new PublicKey(req.params.address);
    const balance = await connection.getBalance(publicKey);
    res.json({ balance: balance / 1e9 }); // Convert lamports to SOL
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Get wallet transactions
app.get('/transactions/:address', async (req, res) => {
  try {
    const publicKey = new PublicKey(req.params.address);
    const limit = parseInt(req.query.limit as string) || 5;
    
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    const transactions = [];
    
    for (const sig of signatures) {
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (tx) transactions.push(tx);
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 