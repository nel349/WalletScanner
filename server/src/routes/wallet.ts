import { Router } from 'express';
import { SolanaService } from '../services/solana';

const router = Router();
const solanaService = new SolanaService();

router.get('/validate/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await solanaService.validateWallet(address);
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await solanaService.getBalance(address);
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await solanaService.getTransactions(address);
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

export default router; 