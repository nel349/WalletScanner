import 'react-native-get-random-values';
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { WalletResponse, BalanceResponse, TransactionResponse, ParsedTransactionDetails, HistoricalBalanceResponse } from '../types';
import { HELIUS_ENDPOINTS, LOCAL_IP } from '../../client/src/config';

// Use the public RPC endpoint
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
export const connection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});

// Update the API base URL to use the correct port
const API_BASE_URL = `http://${LOCAL_IP}:3000/api`;

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
  options: { 
    pages?: number,
    before?: string,
    includeParsedDetails?: boolean
  } = {}
): Promise<TransactionResponse> => {
  try {
    const { pages = 1, before, includeParsedDetails = true } = options;
    let url = `${API_BASE_URL}/helius/transactions/${walletAddress}?pages=${pages}`;
      
    if (before) {
      url += `&before=${before}`;
    }
    
    if (includeParsedDetails === false) {
      url += '&includeParsedDetails=false';
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleApiError(response);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getTransactionDetails = async (signature: string): Promise<ParsedTransactionDetails> => {
  try {
    const response = await fetch(`${API_BASE_URL}/wallet/transaction/${signature}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleApiError(response);
  } catch (error) {
    console.error('Error fetching transaction details:', error);
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

export const getHistoricalBalance = async (
  walletAddress: string, 
  timeWindow: '24h' | '1w' | '1m' | '1y' | 'all' = '1m'
): Promise<HistoricalBalanceResponse> => {
  try {
    const url = `${API_BASE_URL}${HELIUS_ENDPOINTS.GET_HISTORICAL_BALANCE}/${walletAddress}?timeWindow=${timeWindow}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleApiError(response);
  } catch (error) {
    console.error('Error fetching historical balance:', error);
    throw error;
  }
};