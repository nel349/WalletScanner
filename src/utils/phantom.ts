import { PublicKey } from '@solana/web3.js';
import { Linking, Platform } from 'react-native';
import { connection } from './solana';
import { useState, useEffect } from 'react';
import { PhantomWalletConnectionResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Storage keys
const WALLET_STORAGE_KEY = 'PHANTOM_WALLET_ADDRESS';
const SESSION_KEY = 'PHANTOM_SESSION';

// Deep link URL for your app - this must match the scheme in app.json
const APP_URL = 'walletscanner://onPhantomConnected';

// Generate a new keypair for this session
const generateKeypair = () => {
  const keypair = nacl.box.keyPair();
  return {
    publicKey: bs58.encode(keypair.publicKey),
    secretKey: bs58.encode(keypair.secretKey)
  };
};

// Decrypt the payload from Phantom
const decryptPayload = (data: string, nonce: string, sharedSecret: Uint8Array): any => {
  try {
    const decryptedData = nacl.box.open.after(
      bs58.decode(data),
      bs58.decode(nonce),
      sharedSecret
    );
    
    if (!decryptedData) {
      throw new Error('Unable to decrypt data');
    }
    
    const decoder = new TextDecoder();
    const decoded = decoder.decode(decryptedData);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decrypting payload:', error);
    throw error;
  }
};

// Create a shared secret for communication with Phantom
const createSharedSecret = (privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array => {
  return nacl.box.before(publicKey, privateKey);
};

// Connect to Phantom Wallet using deep linking
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
    
    // Generate keypair for this session
    const keypair = generateKeypair();
    
    // Store keypair for later use
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(keypair));
    
    // Create the deep link URL to open Phantom
    const params = new URLSearchParams({
      dapp_encryption_public_key: keypair.publicKey,
      redirect_link: APP_URL,
      cluster: 'mainnet-beta'
    });
    
    const url = `https://phantom.app/ul/v1/connect?${params.toString()}`;
    
    // Open Phantom app
    await Linking.openURL(url);
    
    // Return a temporary success - actual connection will be handled when app returns via deep link
    return {
      success: true,
      publicKey: 'Connecting to Phantom...',
    };
  } catch (error) {
    console.error('Error connecting to Phantom wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Handle the deep link response from Phantom
export const handlePhantomResponse = async (url: string): Promise<PhantomWalletConnectionResponse> => {
  try {
    // Parse the URL to get the data, nonce, and phantom_encryption_public_key
    const urlObj = new URL(url);
    const data = urlObj.searchParams.get('data');
    const nonce = urlObj.searchParams.get('nonce');
    const phantomEncryptionPublicKey = urlObj.searchParams.get('phantom_encryption_public_key');
    
    if (!data || !nonce || !phantomEncryptionPublicKey) {
      return {
        success: false,
        error: 'Invalid response from Phantom',
      };
    }
    
    // Get the stored session keypair
    const sessionData = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionData) {
      return {
        success: false,
        error: 'No session data found',
      };
    }
    
    const { secretKey } = JSON.parse(sessionData);
    
    // Create shared secret
    const sharedSecret = createSharedSecret(
      bs58.decode(secretKey),
      bs58.decode(phantomEncryptionPublicKey)
    );
    
    // Decrypt the payload
    const payload = decryptPayload(data, nonce, sharedSecret);
    
    if (payload.session) {
      // Store the wallet public key
      const walletPublicKey = payload.public_key;
      await AsyncStorage.setItem(WALLET_STORAGE_KEY, walletPublicKey);
      
      return {
        success: true,
        publicKey: walletPublicKey,
      };
    } else {
      return {
        success: false,
        error: 'User rejected connection',
      };
    }
  } catch (error) {
    console.error('Error handling Phantom response:', error);
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
    await AsyncStorage.removeItem(SESSION_KEY);
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

  // Check for stored wallet address on mount and set up deep link handler
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
    
    // Handle deep link responses from Phantom
    const handleUrl = async ({ url }: { url: string }) => {
      if (url.includes('onPhantomConnected')) {
        const result = await handlePhantomResponse(url);
        if (result.success && result.publicKey) {
          setIsConnected(true);
          setWalletAddress(result.publicKey);
        }
      }
    };
    
    // Add the event listener for handling deep links
    const subscription = Linking.addEventListener('url', handleUrl);
    
    // Check for deep links that may have opened the app
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl && initialUrl.includes('onPhantomConnected')) {
        handleUrl({ url: initialUrl });
      }
    });
    
    // Clean up the event listener
    return () => {
      subscription.remove();
    };
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