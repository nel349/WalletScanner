import { ConfirmedSignatureInfo, Transaction } from "@solana/web3.js";

export interface WalletResponse {
  isValid: boolean;
  address: string;
}

export interface BalanceResponse {
  balance: number;
  address: string;
}

export interface TransactionResponse {
  transactions: ConfirmedSignatureInfo[];
  address: string;
  hasMore: boolean;
  nextBefore?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export interface PhantomWalletConnectionResponse {
  success: boolean;
  publicKey?: string;
  error?: string;
} 