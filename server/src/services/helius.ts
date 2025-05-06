import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { WalletResponse, BalanceResponse, TransactionResponse, ErrorResponse, HeliusTransaction } from '../types';

// Interface for historical balance response
interface HistoricalBalanceResponse {
  address: string;
  dataPoints: {
    timestamp: number;
    balance: number;
  }[];
}

export class HeliusService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.HELIUS_API_URL || 'https://api.helius.xyz';
    
    // Only use environment variable for API key - never hardcode in source
    this.apiKey = process.env.HELIUS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        'HELIUS_API_KEY environment variable is not set. ' +
        'Please create a .env file in the server directory with your Helius API key: ' +
        'HELIUS_API_KEY=your_key_here'
      );
    }
  }

  async validateWallet(address: string): Promise<WalletResponse> {
    try {
      // Still use PublicKey to validate the address format
      const publicKey = new PublicKey(address);
      return {
        isValid: true,
        address: publicKey.toString()
      };
    } catch (error) {
      return {
        isValid: false,
        address
      };
    }
  }

  async getBalance(address: string): Promise<BalanceResponse> {
    try {
      // Use direct connection to get the balance instead of Helius
      // This will be more accurate than trying to derive it from transaction data
      const url = `https://api.mainnet-beta.solana.com`;
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      });

      if (response.data && response.data.result) {
        // Convert from lamports to SOL (1 SOL = 1,000,000,000 lamports)
        const balanceInLamports = response.data.result.value;
        const balanceInSol = balanceInLamports / 1_000_000_000;
        
        return {
          balance: balanceInSol,
          address: address
        };
      }

      // If we can't get the balance, return 0
      return {
        balance: 0,
        address: address
      };
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      throw {
        error: 'BALANCE_ERROR',
        message: 'Failed to fetch balance'
      } as ErrorResponse;
    }
  }

  async getHistoricalBalance(address: string, timeWindow: string): Promise<HistoricalBalanceResponse> {
    try {
      // Calculate start timestamp based on timeWindow
      const now = new Date();
      let startTimestamp: number;
      
      switch(timeWindow) {
        case '24h':
          // 24 hours ago
          startTimestamp = new Date(now.getTime() - 24 * 60 * 60 * 1000).getTime();
          break;
        case '1w':
          // 1 week ago
          startTimestamp = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
          break;
        case '1m':
          // 1 month ago (approx 30 days)
          startTimestamp = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
          break;
        case '1y':
          // 1 year ago
          startTimestamp = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).getTime();
          break;
        case 'all':
          // For 'all', set to earliest possible date (just set to a very old date)
          startTimestamp = new Date(2020, 0, 1).getTime(); // Solana mainnet launched in 2020
          break;
        default:
          // Default to 1 month
          startTimestamp = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
      }
      
      // Fetch all transactions since startTimestamp using pagination
      const transactions: any[] = [];
      let hasMoreTransactions = true;
      let beforeSignature: string | undefined = undefined;
      const limit = 100; // Maximum limit allowed by Helius API
      let oldestTimestamp = now.getTime();
      
      // Fetch transactions in batches until we've reached the start timestamp
      while (hasMoreTransactions && oldestTimestamp >= startTimestamp) {
        // Prepare URL and parameters for Helius API
        const url = `${this.baseUrl}/v0/addresses/${address}/transactions`;
        const params: any = {
          'api-key': this.apiKey,
          limit
        };
        
        if (beforeSignature) {
          params.before = beforeSignature;
        }
        
        // Make the request to Helius API
        const response = await axios.get(url, { params });
        
        if (!response.data || !response.data.length) {
          hasMoreTransactions = false;
          break;
        }
        
        // Get the oldest transaction in this batch
        const batch = response.data;
        const oldestTx = batch[batch.length - 1];
        oldestTimestamp = oldestTx.timestamp * 1000;
        
        // Set the before parameter for the next request
        beforeSignature = oldestTx.signature;
        
        // Add transactions that are after our startTimestamp
        const validTransactions = batch.filter((tx: any) => tx.timestamp * 1000 >= startTimestamp);
        transactions.push(...validTransactions);
        
        // If we got fewer transactions than the limit or the oldest transaction is already
        // before our start timestamp, we've reached the end
        if (batch.length < limit || oldestTimestamp < startTimestamp) {
          hasMoreTransactions = false;
        }
        
        // Add a small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Get current balance using direct RPC call
      const balanceResponse = await this.getBalance(address);
      let currentBalance = balanceResponse.balance;

      // Create data points array with current balance as first point
      const dataPoints = [
        {
          timestamp: now.getTime(),
          balance: currentBalance
        }
      ];
      
      // Sort transactions newest to oldest
      transactions.sort((a: any, b: any) => b.timestamp - a.timestamp);
      
      // Work backwards through transactions
      for (const tx of transactions) {
        // We need to account for both native transfers and token transfers
        let balanceChange = 0;

        // Check for native SOL transfers
        for (const transfer of tx.nativeTransfers || []) {
          if (transfer.fromUserAccount === address) {
            // Outgoing transfer (sent SOL)
            balanceChange -= transfer.amount / 1_000_000_000; // Convert lamports to SOL
          } else if (transfer.toUserAccount === address) {
            // Incoming transfer (received SOL)
            balanceChange += transfer.amount / 1_000_000_000; // Convert lamports to SOL
          }
        }

        // Also account for fees if this address paid them
        if (tx.feePayer === address) {
          balanceChange -= tx.fee / 1_000_000_000; // Convert lamports to SOL
        }

        // Compute previous balance by subtracting the balance change
        currentBalance -= balanceChange;
        currentBalance = Math.max(0, currentBalance); // Ensure we never go below 0
        
        // Add this as a data point
        dataPoints.push({
          timestamp: tx.timestamp * 1000, // Convert to milliseconds
          balance: currentBalance
        });
      }
      
      // Reverse to get chronological order (oldest to newest)
      dataPoints.reverse();
      
      return {
        address,
        dataPoints
      };
    } catch (error) {
      console.error('Failed to fetch historical balance:', error);
      throw {
        error: 'HISTORICAL_BALANCE_ERROR',
        message: 'Failed to fetch historical balance'
      } as ErrorResponse;
    }
  }

  async getTransactions(
    address: string, 
    options: { limit?: number; before?: string; includeParsedDetails?: boolean } = {}
  ): Promise<TransactionResponse> {
    try {
      const { limit = 20, before } = options;
      
      // Prepare URL and parameters for Helius API
      const url = `${this.baseUrl}/v0/addresses/${address}/transactions`;
      const params: any = {
        'api-key': this.apiKey,
        limit: limit + 1  // Get one extra to determine if there are more
      };

      if (before) {
        // Helius uses 'before' as a parameter too, but it might be implementation-specific
        params.before = before;
      }

      // Make the request to Helius API
      const response = await axios.get(url, { params });
      
      if (!response.data) {
        throw new Error('No data returned from Helius API');
      }

      // Process the response
      const transactions = response.data;
      const hasMore = transactions.length > limit;
      
      // Remove the extra transaction if needed
      const paginatedTransactions = hasMore 
        ? transactions.slice(0, limit) 
        : transactions;
      
      // Get the last transaction's signature for pagination
      const nextBefore = paginatedTransactions.length > 0
        ? paginatedTransactions[paginatedTransactions.length - 1].signature
        : undefined;
      
      return {
        transactions: paginatedTransactions,
        address: address,
        hasMore,
        nextBefore
      };
    } catch (error) {
      console.error('Failed to fetch transactions from Helius:', error);
      throw {
        error: 'TRANSACTIONS_ERROR',
        message: 'Failed to fetch transactions'
      } as ErrorResponse;
    }
  }
}