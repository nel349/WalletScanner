import { TokenBalancesResponse } from '../../server/src/types';
import { HELIUS_ENDPOINTS, API_URL } from '../../client/src/config';


/**
 * Fetches token balances for a given wallet address from the backend API
 * @param address Solana wallet address
 * @returns Promise resolving to token balances data
 */
export const fetchTokenBalances = async (address: string): Promise<TokenBalancesResponse> => {
  try {
    const response = await fetch(`${API_URL}${HELIUS_ENDPOINTS.GET_TOKEN_BALANCES}/${address}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch token balances');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    throw error;
  }
}; 