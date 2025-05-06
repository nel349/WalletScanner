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
      // Helius doesn't have a direct balance endpoint, so we fetch recent transactions 
      // and extract the balance from the account data
      const url = `${this.baseUrl}/v0/addresses/${address}/transactions`;
      const response = await axios.get(url, {
        params: {
          'api-key': this.apiKey,
          limit: 1
        }
      });

      if (response.data && response.data.length > 0) {
        // Find the account data for the requested address
        const transaction = response.data[0];
        const accountData = transaction.accountData.find(
          (account: any) => account.account === address
        );

        if (accountData) {
          // Balance is in lamports, convert to SOL
          return {
            balance: accountData.nativeBalanceChange / 1e9,
            address: address
          };
        }
      }

      // If we can't get the balance from transactions, return 0
      return {
        balance: 0,
        address: address
      };
    } catch (error) {
      console.error('Failed to fetch balance from Helius:', error);
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
      
      // Fetch transactions since startTimestamp
      // Helius doesn't have a native historical balance API, so we need to build it
      // from transaction history
      const url = `${this.baseUrl}/v0/addresses/${address}/transactions`;
      const response = await axios.get(url, {
        params: {
          'api-key': this.apiKey,
          // Set a large limit to get as many transactions as possible
          // For 'all' time window, try to get more transactions
          limit: timeWindow === 'all' ? 200 : 100
        }
      });

      if (!response.data) {
        throw new Error('No data returned from Helius API');
      }

      // Filter transactions that are after our startTimestamp
      const transactions = response.data.filter((tx: any) => {
        return tx.timestamp * 1000 >= startTimestamp;
      });

      // To calculate balance at each transaction point, we need the latest balance
      // and work backwards through the transactions
      let currentBalance = 0;
      
      // Get current balance first
      const balanceResponse = await this.getBalance(address);
      currentBalance = balanceResponse.balance;
      
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
        // Find the balance change for this address in the transaction
        const accountData = tx.accountData.find(
          (account: any) => account.account === address
        );
        
        if (accountData) {
          // Subtract the balance change to get the balance before this transaction
          // (note: balance change could be positive or negative, so we're subtracting it)
          // Convert from lamports to SOL
          const balanceChange = accountData.nativeBalanceChange / 1e9;
          currentBalance -= balanceChange;
          
          // Add this as a data point
          dataPoints.push({
            timestamp: tx.timestamp * 1000, // Convert to milliseconds
            balance: currentBalance
          });
        }
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