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
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const before = req.query.before as string | undefined;
    const includeParsedDetails = req.query.includeParsedDetails !== 'false'; // default to true
    
    const result = await heliusService.getTransactions(address, { 
      limit, 
      before,
      includeParsedDetails
    });
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/transactions-by-type/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const before = req.query.before as string | undefined;
    const fetchAll = req.query.fetchAll === 'true' || req.query.limit === 'all';

    console.log('Fetching all transactions by type:', fetchAll);
    const result = await heliusService.getTransactionsByType(address, { 
      limit, 
      before,
      fetchAll
    });
    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get('/transactions-all/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await heliusService.fetchAllTransactions(address);

    res.json(result);
  } catch (error) {
    res.status(400).json(error);
  }
});

export default router; 