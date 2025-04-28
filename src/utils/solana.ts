import 'react-native-get-random-values';
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { WalletResponse, BalanceResponse, TransactionResponse } from '../types';

// Use the public RPC endpoint
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
export const connection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});

// Update the API base URL to use the correct port
const API_BASE_URL = 'http://192.168.1.175:3000/api';

const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const validateWalletAddress = async (address: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/validate/${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify({ address }),
    });
    const data: WalletResponse = await handleApiError(response);
    return data.isValid;
  } catch (error) {
    console.error('Error validating wallet:', error);
    return false;
  }
};

export const getWalletTransactions = async (
  walletAddress: string,
  limit: number = 5
): Promise<TransactionResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/transactions/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify({ address: walletAddress, limit }),
    });
    return handleApiError(response);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getWalletBalance = async (walletAddress: string, limit: number = 3): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/balance/${walletAddress}?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify({ address: walletAddress }),
    });
    const data: BalanceResponse = await handleApiError(response);
    return data.balance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw error;
  }
}; 