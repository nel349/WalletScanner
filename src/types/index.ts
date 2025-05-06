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

export interface ParsedTransactionDetails {
  signature: string;
  blockTime?: string;
  slot?: number;
  fee: number;
  status: 'success' | 'failed';
  type: string;
  amount: number;
  sender: string;
  receiver: string;
  tokenAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenLogo?: string;
  tokenDecimals?: number;
  instructions: ParsedInstruction[];
  raw?: any;
}

export interface ParsedInstruction {
  programId: string;
  program: string;
  type: string;
  amount?: number;
  sender?: string;
  receiver?: string;
  tokenAddress?: string;
  tokenDecimals?: number;
  index: number;
  raw?: any;
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