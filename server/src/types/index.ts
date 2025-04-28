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
}

export interface ErrorResponse {
  error: string;
  message: string;
} 