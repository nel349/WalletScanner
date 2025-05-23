import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { HeliusTransaction } from '../../server/src/types';

interface TransactionListProps {
  transactions: HeliusTransaction[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'finalized':
        return '#2196F3';
      default:
        return '#FFC107';
    }
  };

  const handleTransactionPress = async (signature: string) => {
    const solscanUrl = `https://solscan.io/tx/${signature}`;
    
    try {
      const supported = await Linking.canOpenURL(solscanUrl);
      
      if (supported) {
        setTimeout(async () => {
          try {
            await Linking.openURL(solscanUrl);
          } catch (error) {
            console.error('Error opening URL:', error);
            Alert.alert(
              'Error',
              'An error occurred while trying to open Solscan.',
              [{ text: 'OK' }]
            );
          }
        }, 100);
      } else {
        Alert.alert(
          'Error',
          'Unable to open Solscan. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking URL support:', error);
      Alert.alert(
        'Error',
        'An error occurred while trying to open Solscan.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Transactions</Text>
      <ScrollView style={styles.scrollView}>
        {transactions.map((tx, index) => (
          <TouchableOpacity
            key={index}
            style={styles.transactionItem}
            onPress={() => handleTransactionPress(tx.signature)}
            activeOpacity={0.7}
          >
            <View style={styles.transactionHeader}>
              <Text style={styles.signature} numberOfLines={1} ellipsizeMode="middle">
                {tx.signature}
              </Text>
              {tx.type && (
                <Text style={[styles.status, { color: getStatusColor(tx.type) }]}>
                  {tx.type}
                </Text>
              )}
            </View>
            <Text style={styles.date}>{formatDate(tx.timestamp)}</Text>
            {tx.description && (
              <Text style={styles.memo} numberOfLines={2}>
                Description: {tx.description}
              </Text>
            )}
            {tx.transactionError && (
              <Text style={styles.error}>Error: {tx.transactionError.toString()}</Text>
            )}
            <Text style={styles.linkText}>Tap to view on Solscan</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scrollView: {
    maxHeight: 300,
  },
  transactionItem: {
    padding: 12,
    backgroundColor: '#3A4556',
    borderRadius: 6,
    marginBottom: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  signature: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    color: '#A0AEC0',
    fontSize: 12,
    marginBottom: 4,
  },
  memo: {
    color: '#A0AEC0',
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
  },
  linkText: {
    color: '#4B5CFA',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
});

export default TransactionList; 