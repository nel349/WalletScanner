import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, ScrollView, Modal, Pressable, Image } from 'react-native';
import { validateWalletAddress, getWalletBalance, getWalletTransactions } from '../utils/solana';
import { usePhantomWallet, getPhantomWalletBalance } from '../utils/phantom';
import TransactionList from '../components/TransactionList';
import BalanceChart from '../components/BalanceChart';
import TransactionTypeChart from '../components/TransactionTypeChart';
import TokenBalances from '../components/TokenBalances';
import { HeliusTransaction } from '../../server/src/types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalletScanner = () => {

  const DEFAULT_PAGES = 5;
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<HeliusTransaction[]>([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [nextTransactionBefore, setNextTransactionBefore] = useState<string | undefined>(undefined);
  const { isConnected, walletAddress: phantomAddress, connect, disconnect } = usePhantomWallet();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const resetFirstLaunch = async () => {
    try {
      await AsyncStorage.removeItem('hasLaunched');
      Alert.alert('Success', 'First launch state cleared. Restart the app to see the welcome screen.');
    } catch (error) {
      console.error('Error clearing first launch:', error);
      Alert.alert('Error', 'Failed to clear first launch state');
    }
  };

  // Check if it's first launch and set initial wallet address if Phantom is connected
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (!hasLaunched) {
          setShowWelcomeModal(true);
          await AsyncStorage.setItem('hasLaunched', 'true');
        }
      } catch (error) {
        console.error('Error checking first launch:', error);
      }
    };
    
    checkFirstLaunch();
    
    // If Phantom wallet is already connected on mount, set the wallet address
    if (isConnected && phantomAddress) {
      setWalletAddress(phantomAddress);
    }

  }, [isConnected, phantomAddress]); // Added dependencies to re-run if connection status or address changes after initial mount

  // When Phantom wallet connects via deep link AFTER initial mount, update the wallet address
  // This effect handles cases where the connection happens while the app is open
  useEffect(() => {
    if (isConnected && phantomAddress) {
      // walletAddress is already set by the previous effect or initial check
      setIsConnecting(false);
      console.log('Phantom wallet connected:', phantomAddress);
      // Auto-scan when wallet is connected
      // handleScan(); // Uncomment this line if you want to auto-scan on connection
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
        const walletTransactions = await getWalletTransactions(walletAddress, { pages: DEFAULT_PAGES });
        
        if (phantomBalance !== null) {
          setBalance(phantomBalance);
          setTransactions(walletTransactions.transactions as unknown as HeliusTransaction[]);
          setHasMoreTransactions(walletTransactions.hasMore);
          setNextTransactionBefore(walletTransactions.nextBefore);
        } else {
          throw new Error('Failed to fetch Phantom wallet balance');
        }
      } else {
        // Use regular API for non-connected wallets
        const [walletBalance, walletTransactions] = await Promise.all([
          getWalletBalance(walletAddress),
          getWalletTransactions(walletAddress, { pages: DEFAULT_PAGES })
        ]);
        
        setBalance(walletBalance);
        setTransactions(walletTransactions.transactions as unknown as HeliusTransaction[]);
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
        pages: DEFAULT_PAGES,
        before: nextTransactionBefore
      });
      
      // Append new transactions to existing ones
      setTransactions(prev => [...prev, ...(moreTransactions.transactions as unknown as HeliusTransaction[])]);
      
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
    contentContainerStyle={styles.scrollContentContainer}
    >
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Wallet Scanner</Text>
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => setShowPermissionsModal(true)}
          >
            <Ionicons name="information-circle-outline" size={24} color="#A0AEC0" />
          </TouchableOpacity>
        </View>
        
        {/* Debug button - only visible in development */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={resetFirstLaunch}
          >
            <Ionicons name="refresh-outline" size={14} color="#4B5CFA" />
            <Text style={styles.debugButtonText}>Reset First Launch</Text>
          </TouchableOpacity>
        )}
        
        {/* Welcome Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showWelcomeModal}
          onRequestClose={() => setShowWelcomeModal(false)}
        >
          <View style={styles.welcomeModalOverlay}>
            <View style={styles.welcomeModalContent}>
              <View style={styles.welcomeHeader}>
                <Ionicons name="shield-checkmark" size={40} color="#4B5CFA" />
                <Text style={styles.welcomeTitle}>Welcome to Wallet Scanner!</Text>
              </View>
              
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeSubtitle}>Your Privacy Matters</Text>
                <Text style={styles.welcomeText}>
                  We're committed to transparency and privacy. Here's what you should know:
                </Text>
              </View>

              <View style={styles.permissionItem}>
                <Ionicons name="eye-outline" size={24} color="#4B5CFA" />
                <Text style={styles.permissionText}>Read-only access to public blockchain data</Text>
              </View>

              <View style={styles.permissionItem}>
                <Ionicons name="wallet-outline" size={24} color="#4B5CFA" />
                <Text style={styles.permissionText}>View-only access when connecting Phantom wallet</Text>
              </View>

              <View style={styles.permissionItem}>
                <Ionicons name="lock-closed-outline" size={24} color="#4B5CFA" />
                <Text style={styles.permissionText}>No private keys or sensitive data stored</Text>
              </View>

              <TouchableOpacity
                style={styles.welcomeButton}
                onPress={() => setShowWelcomeModal(false)}
              >
                <Text style={styles.welcomeButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        {/* Existing Permissions Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showPermissionsModal}
          onRequestClose={() => setShowPermissionsModal(false)}
        >
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setShowPermissionsModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Permissions & Privacy</Text>
                <TouchableOpacity 
                  onPress={() => setShowPermissionsModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#A0AEC0" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalText}>
                • Basic scanning: Read-only access to public blockchain data{'\n\n'}
                • Phantom connection: View wallet address and balance{'\n\n'}
                • No private keys or sensitive data stored{'\n\n'}
                • All data is fetched in real-time from the blockchain{'\n\n'}
                • No data is stored on our servers
              </Text>
            </View>
          </Pressable>
        </Modal>
        
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

        {balance !== null && walletAddress && (
          <>
            <BalanceChart walletAddress={walletAddress} />
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Transaction Types</Text>
              <TransactionTypeChart address={walletAddress} pages={DEFAULT_PAGES} />
            </View>
          </>
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

        {balance !== null && walletAddress && (
          <TokenBalances walletAddress={walletAddress} />
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
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  chartContainer: {
    width: '100%',
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalText: {
    color: '#A0AEC0',
    fontSize: 14,
    lineHeight: 22,
  },
  welcomeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeModalContent: {
    backgroundColor: '#2D3748',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  welcomeSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeSubtitle: {
    color: '#4B5CFA',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    color: '#A0AEC0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  welcomeButton: {
    backgroundColor: '#4B5CFA',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    width: '100%',
  },
  welcomeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#3A4556',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4B5CFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButtonText: {
    color: '#A0AEC0',
    fontSize: 12,
    marginLeft: 4,
  },
});

export default WalletScanner; 