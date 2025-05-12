import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { API_URL, HELIUS_ENDPOINTS } from '../../client/src/config';

interface TransactionType {
  type: string;
  count: number;
}

interface TransactionTypeChartProps {
  address: string;
  pages: number; // Number of pages to fetch from transactions-by-type endpoint
}

const TransactionTypeChart: React.FC<TransactionTypeChartProps> = ({ address, pages }) => {
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionTypes = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // TODO: Remove this after increasing Helius API limit
        setLoading(true);
        const response = await fetch(`${API_URL}${HELIUS_ENDPOINTS.GET_TRANSACTIONS_BY_TYPE}/${address}?pages=${pages}`);
        if (!response.ok) {
          throw new Error('Failed to fetch transaction types');
        }
        const data = await response.json();
        setTransactionTypes(data.types);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchTransactionTypes();
    }
  }, [address]);

  const chartData = transactionTypes.map((type, index) => ({
    name: type.type,
    count: type.count,
    color: [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
    ][index % 10],
    legendFontColor: '#FFFFFF',
    legendFontSize: 12,
  }));

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4B5CFA" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: '#FF4444' }}>Error: {error}</Text>
      </View>
    );
  }

  if (transactionTypes.length === 0) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: '#A0AEC0' }}>No transaction data available</Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <PieChart
        data={chartData}
        width={Dimensions.get('window').width - 70}
        height={220}
        chartConfig={{
          backgroundColor: '#2D3748',
          backgroundGradientFrom: '#2D3748',
          backgroundGradientTo: '#2D3748',
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        }}
        accessor="count"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  );
};

export default TransactionTypeChart; 