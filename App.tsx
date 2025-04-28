import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WalletScanner from './src/screens/WalletScanner';

export default function App() {
  return (
    <SafeAreaProvider>
      <WalletScanner />
    </SafeAreaProvider>
  );
}
