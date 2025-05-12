import { PublicKey } from '@solana/web3.js';
import { Linking, Platform } from 'react-native';
import { connection } from './solana';
import { useState, useEffect } from 'react';
import { PhantomWalletConnectionResponse } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { LOCAL_IP } from '../../client/src/config';

// see example here: https://ritikchhipa5.medium.com/connecting-solana-network-on-react-native-with-phantom-wallet-5af46095fe61

// Storage keys
const WALLET_STORAGE_KEY = 'PHANTOM_WALLET_ADDRESS';
const SESSION_KEY = 'PHANTOM_SESSION';

// Deep link URL for your app - this must match the scheme in app.json
// Format should be: scheme:// (no path)
const APP_URL = Platform.OS === 'web' 
  ? 'walletscanner://' 
  : __DEV__ 
    ? `exp://${LOCAL_IP}:8081/` // Use the Expo development URL with path during development 
    : 'walletscanner://'; // Use the app's scheme in production

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
      console.error('Phantom wallet app is not installed');
      return {
        success: false,
        error: 'Phantom wallet app is not installed on this device',
      };
    }
    
    // Generate keypair for this session
    const keypair = generateKeypair();
    console.log('Generated keypair with public key:', keypair.publicKey);
    
    // Store keypair for later use
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(keypair));
    
    // Create the deep link URL to open Phantom
    const params = new URLSearchParams({
      dapp_encryption_public_key: keypair.publicKey,
      redirect_link: APP_URL,
      cluster: 'mainnet-beta',
      app_url: APP_URL // Add this for better visibility
    });
    
    const url = `https://phantom.app/ul/v1/connect?${params.toString()}`;
    console.log('Opening Phantom with URL:', url);
    
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
    console.log('Parsing Phantom response URL:', url);
    
    // Handle the development environment Expo URL which might be slightly different
    const isDev = url.startsWith('exp://');
    
    // Parse the URL to get the data, nonce, and phantom_encryption_public_key
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      console.error('Invalid URL format:', e);
      // Handle URLs that might not have proper protocol
      if (url.startsWith('walletscanner://') || url.startsWith('exp://')) {
        // Try to parse it manually
        const paramsString = url.split('?')[1];
        if (!paramsString) {
          return {
            success: false,
            error: 'No params in URL',
          };
        }
        
        // Create a simpler parser for the URL
        const searchParams = new URLSearchParams(paramsString);
        const data = searchParams.get('data');
        const nonce = searchParams.get('nonce');
        const phantomEncryptionPublicKey = searchParams.get('phantom_encryption_public_key');
        
        if (!data || !nonce || !phantomEncryptionPublicKey) {
          console.error('Missing required params:', { data, nonce, phantomEncryptionPublicKey });
          return {
            success: false,
            error: 'Missing required parameters from Phantom',
          };
        }
        
        return await processPhantomResponse(data, nonce, phantomEncryptionPublicKey);
      }
      
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }
    
    const data = urlObj.searchParams.get('data');
    const nonce = urlObj.searchParams.get('nonce');
    const phantomEncryptionPublicKey = urlObj.searchParams.get('phantom_encryption_public_key');
    
    if (!data || !nonce || !phantomEncryptionPublicKey) {
      console.error('Missing required params:', { data, nonce, phantomEncryptionPublicKey });
      return {
        success: false,
        error: 'Invalid response from Phantom',
      };
    }
    
    return await processPhantomResponse(data, nonce, phantomEncryptionPublicKey);
  } catch (error) {
    console.error('Error handling Phantom response:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Process the Phantom response parameters
const processPhantomResponse = async (
  data: string,
  nonce: string,
  phantomEncryptionPublicKey: string
): Promise<PhantomWalletConnectionResponse> => {
  try {
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
    console.log('Decrypted Phantom payload:', payload);
    
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
    console.error('Error processing Phantom response:', error);
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
      console.log('Received deep link:', url);
      
      // For development mode, we might get a callback without the expected parameters
      if (__DEV__ && url.startsWith('exp://') && !url.includes('data=')) {
        console.log('Development mode detected - using simulated Phantom connection');
        // In development mode, we'll simulate a successful connection
        // Store a test address for development
        const testWalletAddress = 'G19yP5LGpKwVipr2VLcg25e1iSJTJwtxeuaHvsRoxJn6';
        await AsyncStorage.setItem(WALLET_STORAGE_KEY, testWalletAddress);
        setIsConnected(true);
        setWalletAddress(testWalletAddress);
        return;
      }
      
      // Both Expo development URL and walletscanner:// URL can be phantom callbacks
      const isPhantomCallback = (
        (url.includes('data=') && url.includes('nonce=')) || 
        (url.includes('phantom_encryption_public_key='))
      );
      
      if (isPhantomCallback) {
        console.log('Phantom callback detected, parsing parameters...');
        const result = await handlePhantomResponse(url);
        if (result.success && result.publicKey) {
          console.log('Successfully connected Phantom wallet with public key:', result.publicKey);
          setIsConnected(true);
          setWalletAddress(result.publicKey);
        } else {
          console.error('Failed to connect Phantom wallet:', result.error);
        }
      }
    };
    
    // Add the event listener for handling deep links
    const subscription = Linking.addEventListener('url', handleUrl);
    
    // Check for deep links that may have opened the app
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        console.log('App opened with URL:', initialUrl);
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