export interface WalletResponse {
  isValid: boolean;
  address: string;
}

export interface BalanceResponse {
  balance: number;
  address: string;
}

export interface HistoricalBalanceResponse {
  address: string;
  dataPoints: {
    timestamp: number;
    balance: number;
  }[];
}

export interface TransactionResponse {
  transactions: HeliusTransaction[];
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

// Helius API Types
export interface HeliusTransaction {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  tokenTransfers: HeliusTokenTransfer[];
  nativeTransfers: HeliusNativeTransfer[];
  accountData: HeliusAccountData[];
  transactionError: any;
  instructions: HeliusInstruction[];
  events: Record<string, any>;
}

export interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

export interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: any[];
}

export interface HeliusInstruction {
  accounts: string[];
  data: string;
  programId: string;
  innerInstructions: any[];
}

export interface ErrorResponse {
  error: string;
  message: string;
} 