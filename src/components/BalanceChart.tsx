import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getHistoricalBalance } from '../utils/solana';
import { HistoricalBalanceResponse } from '../types';

interface BalanceChartProps {
  walletAddress: string;
}

type TimeWindow = '24h' | '1w' | '1m' | '1y' | 'all';

const BalanceChart: React.FC<BalanceChartProps> = ({ walletAddress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<HistoricalBalanceResponse | null>(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<TimeWindow>('1m');

  const fetchBalanceHistory = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getHistoricalBalance(walletAddress, selectedTimeWindow);
      setBalanceData(data);
    } catch (err) {
      console.error('Error fetching balance history:', err);
      setError('Failed to load balance history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceHistory();
  }, [walletAddress, selectedTimeWindow]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    
    switch(selectedTimeWindow) {
      case '24h':
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      case '1w':
        return date.toLocaleDateString(undefined, { weekday: 'short' });
      case '1m':
        return `${(date.getDate()).toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      case '1y':
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().substring(2)}`;
      case 'all':
        // Use a more compact format: MM/YY
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().substring(2)}`;
      default:
        return date.toLocaleDateString();
    }
  };

  const getChartData = () => {
    if (!balanceData || balanceData.dataPoints.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }]
      };
    }

    // For the chart we need to ensure we don't have too many data points
    // Let's limit it to a reasonable number based on the time window
    const dataPoints = balanceData.dataPoints;
    let filteredPoints = dataPoints;
    
    // If we have too many points, sample them
    let maxPoints = 6; // Default number of points
    
    switch(selectedTimeWindow) {
      case '24h':
        maxPoints = 6;
        break;
      case '1w':
        maxPoints = 7; // One point per day
        break;
      case '1m':
        maxPoints = 6; // About one point per 5 days
        break;
      case '1y':
        maxPoints = 6; // About one point per 2 months
        break;
      case 'all':
        maxPoints = 5; // Fewer points for all time to avoid crowding
        break;
    }
    
    if (dataPoints.length > maxPoints) {
      const step = Math.floor(dataPoints.length / maxPoints);
      filteredPoints = dataPoints.filter((_, index) => index % step === 0);
      
      // Always include the latest point
      if (filteredPoints.length > 0 && 
          filteredPoints[filteredPoints.length - 1] !== dataPoints[dataPoints.length - 1]) {
        filteredPoints.push(dataPoints[dataPoints.length - 1]);
      }
      
      // Always include the first point
      if (filteredPoints.length > 0 && filteredPoints[0] !== dataPoints[0]) {
        filteredPoints.unshift(dataPoints[0]);
      }
      
      // Sort points by timestamp to ensure correct order
      filteredPoints.sort((a, b) => a.timestamp - b.timestamp);
    }

    return {
      labels: filteredPoints.map(point => formatDate(point.timestamp)),
      datasets: [{ 
        data: filteredPoints.map(point => point.balance),
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  // Find min, max, and current balance for display
  const getBalanceStats = () => {
    if (!balanceData || balanceData.dataPoints.length === 0) {
      return { min: 0, max: 0, current: 0 };
    }
    
    const balances = balanceData.dataPoints.map(p => p.balance);
    return {
      min: Math.min(...balances),
      max: Math.max(...balances),
      current: balanceData.dataPoints[balanceData.dataPoints.length - 1].balance
    };
  };

  const balanceStats = getBalanceStats();

  const chartConfig = {
    backgroundGradientFrom: '#1E2923',
    backgroundGradientTo: '#08130D',
    color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 1,
    yAxisMin: 0, // Ensure y-axis always starts from 0
    yAxisSuffix: ' SOL',
    xAxisLabelRotation: 30, // Rotate labels to prevent overlap
    propsForDots: {
      r: '4', // Smaller dots
      strokeWidth: '2',
      stroke: '#ffa726'
    },
    propsForLabels: {
      fontSize: 9, // Smaller font size for labels
      rotation: -30
    },
    formatYLabel: (value: string) => {
      // Format large numbers more concisely
      const num = parseFloat(value);
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
      return value;
    },
    style: {
      borderRadius: 16
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SOL Balance History</Text>
      
      <View style={styles.timeWindowSelector}>
        <TouchableOpacity
          style={[styles.timeWindowButton, selectedTimeWindow === '24h' && styles.selectedTimeWindow]}
          onPress={() => setSelectedTimeWindow('24h')}
        >
          <Text style={styles.timeWindowText}>24h</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeWindowButton, selectedTimeWindow === '1w' && styles.selectedTimeWindow]}
          onPress={() => setSelectedTimeWindow('1w')}
        >
          <Text style={styles.timeWindowText}>1w</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeWindowButton, selectedTimeWindow === '1m' && styles.selectedTimeWindow]}
          onPress={() => setSelectedTimeWindow('1m')}
        >
          <Text style={styles.timeWindowText}>1m</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeWindowButton, selectedTimeWindow === '1y' && styles.selectedTimeWindow]}
          onPress={() => setSelectedTimeWindow('1y')}
        >
          <Text style={styles.timeWindowText}>1y</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeWindowButton, selectedTimeWindow === 'all' && styles.selectedTimeWindow]}
          onPress={() => setSelectedTimeWindow('all')}
        >
          <Text style={styles.timeWindowText}>All</Text>
        </TouchableOpacity>
      </View>
      
      {!isLoading && balanceData && balanceData.dataPoints.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={styles.statValue}>{balanceStats.min.toFixed(4)} SOL</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={[styles.statValue, styles.currentValue]}>{balanceStats.current.toFixed(4)} SOL</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={styles.statValue}>{balanceStats.max.toFixed(4)} SOL</Text>
          </View>
        </View>
      )}
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8641F4" />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : balanceData && balanceData.dataPoints.length > 0 ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={getChartData()}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            fromZero={true}
            withVerticalLines={false}
            withHorizontalLabels={true}
            withVerticalLabels={true}
            withDots={true}
            horizontalLabelRotation={-30} // Rotate x-axis labels
            verticalLabelRotation={0}
          />
        </View>
      ) : (
        <Text style={styles.noDataText}>No balance history data available</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  timeWindowSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  timeWindowButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  selectedTimeWindow: {
    backgroundColor: '#8641F4',
  },
  timeWindowText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6666',
    textAlign: 'center',
    marginVertical: 16,
  },
  noDataText: {
    color: '#AAAAAA',
    textAlign: 'center',
    marginVertical: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
    marginBottom: 16,
    paddingBottom: 15, // Add extra padding at the bottom for rotated labels
  },
  chart: {
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentValue: {
    color: '#4CAF50',
  },
});

export default BalanceChart;