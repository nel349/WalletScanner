export interface WalletResponse {
  isValid: boolean;
  address: string;
}

export interface BalanceResponse {
  balance: number;
  address: string;
}

export interface TransactionResponse {
  transactions: any[];
  address: string;
  hasMore: boolean;
  nextBefore?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
} 