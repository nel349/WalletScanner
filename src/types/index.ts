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
  transactions: ConfirmedSignatureInfo[]; // You might want to type this more specifically based on your needs
  address: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
} 