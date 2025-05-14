import React, { useEffect } from 'react';
import { Linking, Button, View, Text, StyleSheet, Platform } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import WalletScanner from '../src/screens/WalletScanner';
import { SafeAreaView } from 'react-native-safe-area-context';

// Renamed from App to HomeScreen to better reflect its role in Expo Router
export default function HomeScreen() {
  // Set up additional deep link logging
  useEffect(() => {
    // Log any initial URL that opened the app
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with URL (from Home screen):', url);
      }
    });

    // Listen for new URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('App received URL (from Home screen):', url);
    });

    // Log the app's URL scheme for debugging
    const prefix = ExpoLinking.createURL('');
    console.log('App URL prefix:', prefix);

    return () => {
      subscription.remove();
    };
  }, []);

  // In development, this can be used to simulate a deep link from Phantom
  const simulatePhantomCallback = async () => {
    // This is just for testing and won't work with actual encryption
    // It helps verify that the deep link handler works
    const testUrl = ExpoLinking.createURL('', {
      queryParams: {
        data: 'testData',
        nonce: 'testNonce',
        phantom_encryption_public_key: 'testPublicKey'
      }
    });
    
    console.log('Simulating Phantom callback with URL:', testUrl);
    console.log('Current app prefix:', ExpoLinking.createURL(''));
    
    // Use the Linking API to simulate receiving the URL
    if (await Linking.canOpenURL(testUrl)) {
      await Linking.openURL(testUrl);
    }
  };

  // Only show the debug button in development
  const isDev = false;

  return (
    <View style={styles.container}>
      <WalletScanner />
      {isDev && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Tools</Text>
          <Button
            title="Simulate Phantom Callback"
            onPress={simulatePhantomCallback}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1F2E',
  },
  debugContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
  },
  debugTitle: {
    color: 'white',
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
  },
});
