import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ConfirmedSignatureInfo } from '@solana/web3.js';

interface TransactionListProps {
  transactions: ConfirmedSignatureInfo[];
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Transactions</Text>
      <ScrollView style={styles.scrollView}>
        {transactions.map((tx, index) => (
          <View key={index} style={styles.transactionItem}>
            <View style={styles.transactionHeader}>
              <Text style={styles.signature} numberOfLines={1} ellipsizeMode="middle">
                {tx.signature}
              </Text>
              {tx.confirmationStatus && (
                <Text style={[styles.status, { color: getStatusColor(tx.confirmationStatus) }]}>
                  {tx.confirmationStatus}
                </Text>
              )}
            </View>
            <Text style={styles.date}>{formatDate(tx.blockTime)}</Text>
            {tx.memo && (
              <Text style={styles.memo} numberOfLines={2}>
                Memo: {tx.memo}
              </Text>
            )}
            {tx.err && (
              <Text style={styles.error}>Error: {tx.err.toString()}</Text>
            )}
          </View>
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
});

export default TransactionList; 