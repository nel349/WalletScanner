import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { 
  WalletResponse, 
  BalanceResponse, 
  TransactionResponse, 
  ErrorResponse, 
  HeliusTransaction,
  TransactionsByTypeResponse, 
  HeliusTransactionResponse
} from '../types';

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
        count: paginatedTransactions.length,
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

  // Fetch all transactions from Helius API
  // by iterating over all pages until there are no more transactions
  // and then returning the total count of transactions
  // and the transactions themselves
  async fetchAllTransactions(
    address: string
  ): Promise<TransactionResponse> {
    
    try {
        
        // Prepare URL and parameters for Helius API
        const url = `${this.baseUrl}/v0/addresses/${address}/transactions`;
        const params: any = {
          'api-key': this.apiKey,
          limit: 100
        };
  
        
        let transactions: HeliusTransaction[] = [];
        let lastSignature: string | null = null;
        let page = 0;
        while (true) {
            // print the number of page we are on
            console.log('Page: ', page);
            if (lastSignature) {
                params.before = lastSignature;
            }

            // Make the request to Helius API
            const response = await axios.get(url, { params });
            
            if (!response.data) {
              throw new Error('No data returned from Helius API');
            }

            const newTransactions: HeliusTransaction[] = response.data;

            // Process the response
            const hasMore = newTransactions.length >= 100;
            lastSignature = newTransactions[newTransactions.length - 1].signature;

            // Add the new transactions to the list

            if ( newTransactions && newTransactions.length > 0) {
                console.log('newTransactions Count: ', newTransactions.length);
                transactions.push(...newTransactions);
            }

            if (!hasMore) {
                break;
            }

            page++;


            
            // set a delay so that we don't hit the rate limit
            // I have a limit of 10 RPC requests per second so we need to slow down
            await new Promise(resolve => setTimeout(resolve, 300));

        }

        return {
          count: transactions.length,
          transactions,
          address,
          hasMore: false,
          nextBefore: undefined
        };
        

      } catch (error) {
        console.error('Failed to fetch transactions from Helius:', error);
        throw {
          error: 'TRANSACTIONS_ERROR',
          message: 'Failed to fetch transactions'
        } as ErrorResponse;
      }
  }

  async getTransactionsByType(
    address: string,
    options: { limit?: number; before?: string; fetchAll?: boolean } = {}
  ): Promise<TransactionsByTypeResponse> {
    try {
      // Get transactions using existing method
      const { transactions } = await this.getTransactions(address, { 
        ...options,
        includeParsedDetails: true 
      });
      
      // Group transactions by type
      const transactionsByType: { [type: string]: HeliusTransaction[] } = {};
      
      transactions.forEach(transaction => {
        const type = transaction.type || 'UNKNOWN';
        if (!transactionsByType[type]) {
          transactionsByType[type] = [];
        }
        transactionsByType[type].push(transaction);
      });

      return {
        address,
        transactionsByType,
        types: Object.keys(transactionsByType).map(type => ({
          type,
          count: transactionsByType[type].length || 0
        })),
        totalTransactions: transactions.length
      };
    } catch (error) {
      console.error('Failed to fetch transactions by type:', error);
      throw {
        error: 'TRANSACTIONS_BY_TYPE_ERROR',
        message: 'Failed to fetch transactions by type'
      } as ErrorResponse;
    }
  }
}