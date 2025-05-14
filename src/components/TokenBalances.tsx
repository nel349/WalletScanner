import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTokenBalances } from '../utils/tokens';
import { TokenInfo } from '../../server/src/types';

interface TokenBalancesProps {
  walletAddress: string;
}

const TokenBalances: React.FC<TokenBalancesProps> = ({ walletAddress }) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);

  useEffect(() => {
    const loadTokenBalances = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const tokenBalances = await fetchTokenBalances(walletAddress);
        
        // Sort tokens by value (descending)
        const sortedTokens = tokenBalances.tokens.sort((a, b) => {
          const valueA = a.totalPrice || (a.uiAmount * (a.pricePerToken || 0));
          const valueB = b.totalPrice || (b.uiAmount * (b.pricePerToken || 0));
          return valueB - valueA;
        });
        
        setTokens(sortedTokens);
      } catch (err) {
        console.error('Error fetching token balances:', err);
        setError('Failed to load token balances');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (walletAddress) {
      loadTokenBalances();
    }
  }, [walletAddress]);

  const toggleTokenExpand = (tokenId: string) => {
    if (expandedTokenId === tokenId) {
      setExpandedTokenId(null);
    } else {
      setExpandedTokenId(tokenId);
    }
  };

  // Format large numbers with appropriate suffix (K, M, B)
  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toFixed(num < 0.01 ? 6 : 2);
    }
  };

  // Fallback image for tokens without logos
  const renderTokenLogo = (token: TokenInfo) => {
    if (token.logo) {
      // Try to render the logo image, with a fallback to colored circle if loading fails
      return (
        <View>
          <Image 
            source={{ uri: token.logo }} 
            style={styles.tokenLogo}
            onError={() => {
              console.log(`Failed to load logo for ${token.symbol}`);
              // Fallback handled by having a default component
            }}
          />
          {/* Render the colored circle as a backup in case the image fails to load */}
          <View style={[styles.tokenLogoFallback, { 
            backgroundColor: getColorFromSymbol(token.symbol || 'T'),
            position: 'absolute',
            opacity: 0 // Start hidden
          }]}>
            <Text style={styles.tokenLogoText}>{(token.symbol || 'T').charAt(0)}</Text>
          </View>
        </View>
      );
    } else {
      // Create a circle with the first letter of the token symbol
      const symbol = token.symbol || 'T';
      return (
        <View style={[styles.tokenLogoFallback, { backgroundColor: getColorFromSymbol(symbol) }]}>
          <Text style={styles.tokenLogoText}>{symbol.charAt(0)}</Text>
        </View>
      );
    }
  };

  // Generate a color based on token symbol
  const getColorFromSymbol = (symbol: string) => {
    const colors = ['#F44336', '#3F51B5', '#4CAF50', '#FFC107', '#9C27B0', '#03A9F4', '#FF9800'];
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderTokenCard = ({ item }: { item: TokenInfo }) => {
    const isExpanded = expandedTokenId === item.mint;
    const totalValue = item.totalPrice || (item.uiAmount * (item.pricePerToken || 0));
    const displayName = item.name || item.symbol || 'Unknown Token';
    const displaySymbol = item.symbol || '';
    
    // Mock data for sparkline and price change - would be replaced with real data
    const priceChange = Math.random() * 10 - 5; // Random between -5% and +5%
    const isPriceUp = priceChange >= 0;

    return (
      <TouchableOpacity 
        style={[styles.tokenCard, isExpanded && styles.tokenCardExpanded]}
        onPress={() => toggleTokenExpand(item.mint)}
        activeOpacity={0.7}
      >
        <View style={styles.tokenCardHeader}>
          {renderTokenLogo(item)}
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenName} numberOfLines={1} ellipsizeMode="tail">
              {displayName}
            </Text>
            <Text style={styles.tokenSymbol}>{displaySymbol}</Text>
          </View>
          <View style={styles.tokenAmount}>
            <Text style={styles.tokenBalance} numberOfLines={1} ellipsizeMode="tail">
              {formatNumber(item.uiAmount)} {displaySymbol}
            </Text>
            {item.pricePerToken && (
              <Text style={styles.tokenValue}>${formatNumber(totalValue)}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.tokenCardFooter}>
          <View style={styles.priceInfo}>
            {item.pricePerToken ? (
              <>
                <Text style={styles.tokenPrice}>${item.pricePerToken.toFixed(item.pricePerToken < 0.01 ? 6 : 4)}</Text>
                <View style={styles.priceChange}>
                  <Ionicons 
                    name={isPriceUp ? 'caret-up' : 'caret-down'} 
                    size={14} 
                    color={isPriceUp ? '#4CAF50' : '#F44336'} 
                  />
                  <Text style={[
                    styles.priceChangeText, 
                    { color: isPriceUp ? '#4CAF50' : '#F44336' }
                  ]}>
                    {Math.abs(priceChange).toFixed(2)}%
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.noPrice}>No price data</Text>
            )}
          </View>
          
          {/* This would ideally be a real sparkline chart */}
          <View style={styles.sparklineContainer}>
            <View style={styles.sparkline}>
              {/* Mock sparkline - would be replaced with a real chart */}
              {Array(10).fill(0).map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.sparklineBar, 
                    { 
                      height: 5 + Math.random() * 15,
                      backgroundColor: isPriceUp ? '#4CAF50' : '#F44336' 
                    }
                  ]} 
                />
              ))}
            </View>
          </View>
        </View>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.expandedRow}>
              <Text style={styles.expandedLabel}>Total Holdings</Text>
              <Text style={styles.expandedValue}>{item.uiAmount.toLocaleString()} {displaySymbol}</Text>
            </View>
            {item.pricePerToken && (
              <>
                <View style={styles.expandedRow}>
                  <Text style={styles.expandedLabel}>Price</Text>
                  <Text style={styles.expandedValue}>${item.pricePerToken.toFixed(6)}</Text>
                </View>
                <View style={styles.expandedRow}>
                  <Text style={styles.expandedLabel}>Value</Text>
                  <Text style={styles.expandedValue}>${totalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</Text>
                </View>
              </>
            )}
            {item.supply && (
              <View style={styles.expandedRow}>
                <Text style={styles.expandedLabel}>Token Supply</Text>
                <Text style={styles.expandedValue}>{(parseInt(item.supply) / Math.pow(10, item.decimals)).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.expandedRow}>
              <Text style={styles.expandedLabel}>Token Address</Text>
              <Text style={styles.expandedValue} numberOfLines={1} ellipsizeMode="middle">{item.mint}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B5CFA" />
        <Text style={styles.loadingText}>Loading token balances...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={24} color="#FF4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (tokens.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="wallet-outline" size={40} color="#A0AEC0" />
        <Text style={styles.emptyText}>No tokens found in this wallet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Token Balances</Text>
      <FlatList
        data={tokens}
        renderItem={renderTokenCard}
        keyExtractor={(item) => item.mint}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  listContainer: {
    paddingBottom: 20,
  },
  tokenCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: width - 40,
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tokenCardExpanded: {
    backgroundColor: '#313D54',
  },
  tokenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  tokenLogoFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenLogoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tokenInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tokenName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tokenSymbol: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  tokenAmount: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tokenValue: {
    color: '#4B5CFA',
    fontSize: 14,
  },
  tokenCardFooter: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(160, 174, 192, 0.2)',
    justifyContent: 'space-between',
  },
  priceInfo: {
    flexDirection: 'column',
  },
  tokenPrice: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  priceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceChangeText: {
    fontSize: 12,
    marginLeft: 2,
  },
  noPrice: {
    color: '#A0AEC0',
    fontSize: 12,
    fontStyle: 'italic',
  },
  sparklineContainer: {
    width: 100,
    height: 30,
    justifyContent: 'flex-end',
  },
  sparkline: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sparklineBar: {
    width: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(160, 174, 192, 0.2)',
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  expandedLabel: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  expandedValue: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  loadingContainer: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 40,
    alignSelf: 'center',
    marginTop: 20,
  },
  loadingText: {
    color: '#A0AEC0',
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 40,
    alignSelf: 'center',
    marginTop: 20,
  },
  errorText: {
    color: '#FF4444',
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 40,
    alignSelf: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: '#A0AEC0',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default TokenBalances; 