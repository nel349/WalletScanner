// Test script to verify dotenv loading
require('dotenv').config();

console.log('Environment variables loading test:');
console.log('HELIUS_API_KEY exists:', process.env.HELIUS_API_KEY ? 'Yes' : 'No');
console.log('HELIUS_API_KEY length:', process.env.HELIUS_API_KEY ? process.env.HELIUS_API_KEY.length : 0);
console.log('First character:', process.env.HELIUS_API_KEY ? process.env.HELIUS_API_KEY.charAt(0) : 'N/A');
console.log('Last character:', process.env.HELIUS_API_KEY ? process.env.HELIUS_API_KEY.charAt(process.env.HELIUS_API_KEY.length - 1) : 'N/A');

// List all env variables without revealing values
console.log('\nAll environment variables (names only):');
Object.keys(process.env).forEach(key => {
  console.log(`- ${key}: ${key.includes('KEY') ? '[HIDDEN]' : process.env[key]}`);
}); 