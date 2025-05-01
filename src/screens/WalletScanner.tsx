import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { validateWalletAddress, getWalletBalance, getWalletTransactions } from '../utils/solana';
import { usePhantomWallet, getPhantomWalletBalance } from '../utils/phantom';
import { ConfirmedSignatureInfo } from '@solana/web3.js';
import TransactionList from '../components/TransactionList';

const WalletScanner = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<ConfirmedSignatureInfo[]>([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [nextTransactionBefore, setNextTransactionBefore] = useState<string | undefined>(undefined);
  const { isConnected, walletAddress: phantomAddress, connect, disconnect } = usePhantomWallet();

  // When Phantom wallet connects, update the wallet address
  useEffect(() => {
    if (isConnected && phantomAddress) {
      setWalletAddress(phantomAddress);
      setIsConnecting(false);
      
      console.log('Phantom wallet connected:', phantomAddress);
      // Auto-scan when wallet is connected
      // handleScan();
    }
  }, [isConnected, phantomAddress]);

  const handleScan = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    if (!validateWalletAddress(walletAddress)) {
      setError('Invalid Solana wallet address');
      return;
    }

    setIsLoading(true);
    setError(null);
    // Reset pagination state when doing a new scan
    setNextTransactionBefore(undefined);
    setHasMoreTransactions(false);
    
    try {
      // If using connected Phantom wallet, fetch balance directly
      if (isConnected && walletAddress === phantomAddress) {
        const phantomBalance = await getPhantomWalletBalance();
        const walletTransactions = await getWalletTransactions(walletAddress, { limit: 20 });
        
        if (phantomBalance !== null) {
          setBalance(phantomBalance);
          setTransactions(walletTransactions.transactions);
          setHasMoreTransactions(walletTransactions.hasMore);
          setNextTransactionBefore(walletTransactions.nextBefore);
        } else {
          throw new Error('Failed to fetch Phantom wallet balance');
        }
      } else {
        // Use regular API for non-connected wallets
        const [walletBalance, walletTransactions] = await Promise.all([
          getWalletBalance(walletAddress),
          getWalletTransactions(walletAddress, { limit: 20 })
        ]);
        
        setBalance(walletBalance);
        setTransactions(walletTransactions.transactions);
        setHasMoreTransactions(walletTransactions.hasMore);
        setNextTransactionBefore(walletTransactions.nextBefore);
      }
    } catch (error) {
      setError('Error scanning wallet. Please try again.');
      console.error('Scan error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMoreTransactions = async () => {
    if (!nextTransactionBefore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const moreTransactions = await getWalletTransactions(walletAddress, {
        limit: 20,
        before: nextTransactionBefore
      });
      
      // Append new transactions to existing ones
      setTransactions(prev => [...prev, ...moreTransactions.transactions]);
      
      // Update pagination state
      setHasMoreTransactions(moreTransactions.hasMore);
      setNextTransactionBefore(moreTransactions.nextBefore);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      Alert.alert('Error', 'Failed to load more transactions.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleConnectWallet = async () => {
    setError(null);
    setIsConnecting(true);
    
    try {
      const supported = await Linking.canOpenURL('https://phantom.app');
      
      if (!supported) {
        setError('Phantom wallet app is not installed on this device');
        setIsConnecting(false);
        Alert.alert(
          'Phantom Not Found',
          'Please install the Phantom wallet app from the App Store or Google Play Store.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      await connect();
      
      // Note: Connection result will be handled by the useEffect that watches phantomAddress
      // The UI will automatically update when the deep link returns
      
    } catch (error) {
      setError('Error connecting to Phantom wallet');
      setIsConnecting(false);
      console.error('Connect error:', error);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
      // Clear balance and transactions when disconnecting
      setBalance(null);
      setTransactions([]);
      setHasMoreTransactions(false);
      setNextTransactionBefore(undefined);
    } catch (error) {
      setError('Error disconnecting from Phantom wallet');
      console.error('Disconnect error:', error);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer}
    contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.title}>Wallet Scanner</Text>
        
        {isConnected ? (
          <View style={styles.connectedContainer}>
            <Text style={styles.connectedText}>Connected to Phantom</Text>
            <TouchableOpacity
              style={styles.phantomButton}
              onPress={handleDisconnectWallet}
            >
              <Text style={styles.buttonText}>Disconnect Wallet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.phantomButton}
              onPress={handleConnectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Connect Phantom Wallet</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.infoText}>
              Phantom is a popular Solana wallet. Connect your wallet to see your balance and transactions.
            </Text>
          </>
        )}
        
        <Text style={styles.subtitle}>Enter a Solana wallet address to scan</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter wallet address"
          placeholderTextColor="#666"
          value={walletAddress}
          onChangeText={(text) => {
            setWalletAddress(text);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleScan}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Scan Wallet</Text>
          )}
        </TouchableOpacity>

        {balance !== null && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Wallet Balance</Text>
            <Text style={styles.balanceText}>{balance.toFixed(4)} SOL</Text>
          </View>
        )}

        {transactions.length > 0 && (
          <>
            <TransactionList transactions={transactions} />
            
            {hasMoreTransactions && (
              <TouchableOpacity
                style={[styles.loadMoreButton, isLoadingMore && styles.buttonDisabled]}
                onPress={handleLoadMoreTransactions}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More Transactions</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#1A1F2E',
  },
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    marginBottom: 30,
    textAlign: 'center',
    marginTop: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#4B5CFA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  phantomButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#B829F8', // Purple for Phantom
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF4444',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultContainer: {
    width: '100%',
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  balanceText: {
    color: '#4B5CFA',
    fontSize: 24,
    fontWeight: 'bold',
  },
  connectedContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  connectedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: '#A0AEC0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadMoreButton: {
    width: '100%',
    height: 40,
    backgroundColor: '#3A4556',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default WalletScanner; 