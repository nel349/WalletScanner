import { Connection, PublicKey } from '@solana/web3.js';
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

  async getTransactions(address: string): Promise<TransactionResponse> {
    try {
      const publicKey = new PublicKey(address);
      const transactions = await this.connection.getSignaturesForAddress(publicKey);
      return {
        transactions,
        address: publicKey.toString()
      };
    } catch (error) {
      throw {
        error: 'TRANSACTIONS_ERROR',
        message: 'Failed to fetch transactions'
      } as ErrorResponse;
    }
  }
} 