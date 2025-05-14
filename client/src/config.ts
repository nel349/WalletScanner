// For local development, use your computer's IP address
// You can find this by running `ipconfig` on Windows or `ifconfig` on Mac/Linux
// Or by checking the server console output when it starts
export const LOCAL_IP = '192.168.1.173'; // Replace this with your actual local IP address

export const API_URL = __DEV__ 
  ? `http://${LOCAL_IP}:3000/api` 
  : 'https://your-production-api.com/api';

export const HELIUS_ENDPOINTS = {
  VALIDATE_WALLET: '/helius/validate',
  GET_BALANCE: '/helius/balance',
  GET_TRANSACTIONS: '/helius/transactions',
  GET_TRANSACTIONS_BY_TYPE: '/helius/transactions-by-type',
  GET_TRANSACTIONS_ALL: '/helius/transactions-all',
  GET_HISTORICAL_BALANCE: '/helius/historical-balance',
  GET_TOKEN_BALANCES: '/helius/token-balances',
};