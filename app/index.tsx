import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Linking, Button, View, Text, StyleSheet } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import WalletScanner from '../src/screens/WalletScanner';

function App() {
  // Set up additional deep link logging at app level
  useEffect(() => {
    // Log any initial URL that opened the app
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with URL (from App component):', url);
      }
    });

    // Listen for new URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('App received URL (from App component):', url);
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
    
    // Use the Linking API to simulate receiving the URL
    if (await Linking.canOpenURL(testUrl)) {
      await Linking.openURL(testUrl);
    }
  };

  // Only show the debug button in development
  const isDev = true;

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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

export default App;