import 'react-native-get-random-values';
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

// Use the public RPC endpoint
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
export const connection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});

export const validateWalletAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

export const getWalletTransactions = async (
  walletAddress: string,
  limit: number = 5 // Reduced default limit
): Promise<ParsedTransactionWithMeta[]> => {
  try {
    const publicKey = new PublicKey(walletAddress);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    
    // Process transactions sequentially with longer delays
    const transactions: (ParsedTransactionWithMeta | null)[] = [];
    for (let i = 0; i < signatures.length; i++) {
      try {
        const tx = await connection.getParsedTransaction(signatures[i].signature, {
          maxSupportedTransactionVersion: 0,
        });
        transactions.push(tx);
        
        // Add a longer delay between requests (1 second)
        if (i < signatures.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`Failed to fetch transaction ${i + 1}, skipping...`);
        transactions.push(null);
      }
    }

    return transactions.filter((tx): tx is ParsedTransactionWithMeta => tx !== null);
  } catch (error: any) {
    if (error.message?.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a few moments.');
    }
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getWalletBalance = async (walletAddress: string): Promise<number> => {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error: any) {
    if (error.message?.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a few moments.');
    }
    console.error('Error fetching balance:', error);
    throw error;
  }
}; 