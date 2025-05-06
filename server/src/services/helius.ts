import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { WalletResponse, BalanceResponse, TransactionResponse, ErrorResponse, HeliusTransaction } from '../types';

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