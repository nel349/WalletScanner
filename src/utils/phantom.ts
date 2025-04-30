import { PublicKey } from '@solana/web3.js';
import { Linking, Platform } from 'react-native';
import { connection } from './solana';
import { useState, useEffect } from 'react';
import { PhantomWalletConnectionResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for connected wallet
const WALLET_STORAGE_KEY = 'PHANTOM_WALLET_ADDRESS';

// Deep link URL for your app
const APP_URL = 'walletscanner://onPhantomConnected';

// Function to create a demo wallet connection (simulating a wallet connection)
// In a real app, this would be replaced with actual Phantom deep linking
export const connectPhantomWallet = async (): Promise<PhantomWalletConnectionResponse> => {
  try {
    // Check if Phantom app is installed
    const phantomIsInstalled = await Linking.canOpenURL('https://phantom.app');
    
    if (!phantomIsInstalled) {
      return {
        success: false,
        error: 'Phantom wallet app is not installed on this device',
      };
    }
    
    // In a real implementation, this would use Phantom's deep linking API
    // For now, we'll simulate the connection with a demo wallet
    // This is just a placeholder to demonstrate the UI flow
    
    // Simulating opening Phantom app
    console.log('Opening Phantom app...');
    
    // For demo purposes, we'll use a hard-coded Solana address
    // In a real implementation, this would come from the Phantom wallet app
    const demoPublicKey = 'AhzZc4d1MrNUbD6N3ZqyD8TviNzY67L8fgE63tRpRKHf';
    
    // Store the wallet address
    await AsyncStorage.setItem(WALLET_STORAGE_KEY, demoPublicKey);
    
    return {
      success: true,
      publicKey: demoPublicKey,
    };
  } catch (error) {
    console.error('Error connecting to Phantom wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Disconnect from Phantom Wallet
export const disconnectPhantomWallet = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error disconnecting from Phantom wallet:', error);
    return false;
  }
};

// Hook to get wallet connection status and address
export const usePhantomWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Check for stored wallet address on mount
  useEffect(() => {
    const checkStoredWallet = async () => {
      try {
        const storedAddress = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
        if (storedAddress) {
          setIsConnected(true);
          setWalletAddress(storedAddress);
        }
      } catch (error) {
        console.error('Error checking stored wallet:', error);
      }
    };
    
    checkStoredWallet();
  }, []);

  return {
    isConnected,
    walletAddress,
    connect: connectPhantomWallet,
    disconnect: async () => {
      const success = await disconnectPhantomWallet();
      if (success) {
        setIsConnected(false);
        setWalletAddress(null);
      }
      return success;
    },
  };
};

// Get wallet balance using stored public key
export const getPhantomWalletBalance = async (): Promise<number | null> => {
  try {
    const storedAddress = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
    if (!storedAddress) {
      return null;
    }

    const publicKey = new PublicKey(storedAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error('Error fetching Phantom wallet balance:', error);
    return null;
  }
}; 