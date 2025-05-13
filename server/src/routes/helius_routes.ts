import { Router } from 'express';
import { HeliusService } from '../services/helius';

const router = Router();
const heliusService = new HeliusService();

router.get('/validate/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await heliusService.validateWallet(address);
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await heliusService.getBalance(address);
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/historical-balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const timeWindow = req.query.timeWindow as string || '1m'; // Default to 1 month
    const result = await heliusService.getHistoricalBalance(address, timeWindow);
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pages = req.query.pages ? parseInt(req.query.pages as string, 10) : 1;
    console.log('Fetching transactions for address:', address, 'with pages:', pages);
    const result = await heliusService.fetchTransactions(address, { 
      pages,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/transactions-by-type/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const before = req.query.before as string | undefined;
    const fetchAll = req.query.fetchAll === 'true' || req.query.limit === 'all';
    const pages = req.query.pages ? parseInt(req.query.pages as string, 10) : 1;

    console.log('Fetching all transactions by type:', fetchAll);
    const result = await heliusService.getTransactionsByType(address, { 
      before,
      fetchAll,
      pages
    });
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/transactions-all/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await heliusService.fetchTransactions(address);

    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/token-balances/:address', async (req, res) => {
  try {
    const { address } = req.params;
    // Allow overriding the API key for testing
    const apiKey = req.query.apiKey as string;
    const result = await heliusService.getTokenBalances(address, apiKey);
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

export default router; 