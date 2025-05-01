import { ConfirmedSignatureInfo, Connection, PublicKey } from '@solana/web3.js';
import { WalletResponse, BalanceResponse, TransactionResponse, ErrorResponse } from '../types';

export class SolanaService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
  }

  async validateWallet(address: string): Promise<WalletResponse> {
    try {
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
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return {
        balance: balance / 1e9, // Convert lamports to SOL
        address: publicKey.toString()
      };
    } catch (error) {
      throw {
        error: 'BALANCE_ERROR',
        message: 'Failed to fetch balance'
      } as ErrorResponse;
    }
  }

  async getTransactions(
    address: string, 
    options: { limit?: number; before?: string } = {}
  ): Promise<TransactionResponse> {
    try {
      const { limit = 20, before } = options;
      const publicKey = new PublicKey(address);
      
      // Get one extra transaction to determine if there are more
      const fetchLimit = limit + 1;
      
      // Prepare options for getSignaturesForAddress
      const fetchOptions: any = { limit: fetchLimit };
      if (before) {
        fetchOptions.before = before;
      }
      
      // Fetch transactions with pagination
      const transactions: ConfirmedSignatureInfo[] = 
        await this.connection.getSignaturesForAddress(publicKey, fetchOptions);
      
      // Determine if there are more transactions
      const hasMore = transactions.length > limit;
      
      // Remove the extra transaction if needed
      const paginatedTransactions = hasMore 
        ? transactions.slice(0, limit) 
        : transactions;
      
      // Get the signature of the last transaction for the next batch
      const nextBefore = paginatedTransactions.length > 0
        ? paginatedTransactions[paginatedTransactions.length - 1].signature
        : undefined;
      
      return {
        transactions: paginatedTransactions,
        address: publicKey.toString(),
        hasMore,
        nextBefore
      };
    } catch (error) {
      throw {
        error: 'TRANSACTIONS_ERROR',
        message: 'Failed to fetch transactions'
      } as ErrorResponse;
    }
  }
} 