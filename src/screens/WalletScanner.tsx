import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { validateWalletAddress, getWalletBalance, getWalletTransactions } from '../utils/solana';
import { ConfirmedSignatureInfo } from '@solana/web3.js';
import TransactionList from '../components/TransactionList';

const WalletScanner = () => {
  const [walletAddress, setWalletAddress] = useState('AhzZc4d1MrNUbD6N3ZqyD8TviNzY67L8fgE63tRpRKHf');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<ConfirmedSignatureInfo[]>([]);

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
    try {
      const [walletBalance, walletTransactions] = await Promise.all([
        getWalletBalance(walletAddress),
        getWalletTransactions(walletAddress)
      ]);
      
      setBalance(walletBalance);
      setTransactions(walletTransactions.transactions);
    } catch (error) {
      setError('Error scanning wallet. Please try again.');
      console.error('Scan error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Wallet Scanner</Text>
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
        <TransactionList transactions={transactions} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1F2E',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default WalletScanner; 