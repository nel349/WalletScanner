// For local development, use your computer's IP address
// You can find this by running `ipconfig` on Windows or `ifconfig` on Mac/Linux
// Or by checking the server console output when it starts
const LOCAL_IP = '192.168.1.175'; // Replace this with your actual local IP address

export const API_URL = __DEV__ 
  ? `http://${LOCAL_IP}:3000/api` 
  : 'https://your-production-api.com/api';

export const ENDPOINTS = {
  VALIDATE_WALLET: '/wallet/validate',
  GET_BALANCE: '/wallet/balance',
  GET_TRANSACTIONS: '/wallet/transactions',
};