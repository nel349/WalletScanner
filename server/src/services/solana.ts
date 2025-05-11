import { ConfirmedSignatureInfo, Connection, PublicKey, ParsedTransactionWithMeta, PartiallyDecodedInstruction, ParsedInstruction } from '@solana/web3.js';
import { WalletResponse, BalanceResponse, TransactionResponse, ErrorResponse, ParsedTransactionDetails } from '../types';

export class SolanaService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
  }

  async validateWallet(address: string): Promise<WalletResponse> {
    try {
      const publicKey = new PublicKey(address);
      return {
        isValid: true,
        address: publicKey.toString()
      };
    } catch (error) {
      return {
        isValid: false,
        address
      };
    }
  }

  async getBalance(address: string): Promise<BalanceResponse> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return {
        balance: balance / 1e9, // Convert lamports to SOL
        address: publicKey.toString()
      };
    } catch (error) {
      throw {
        error: 'BALANCE_ERROR',
        message: 'Failed to fetch balance'
      } as ErrorResponse;
    }
  }

  async getTransactions(
    address: string, 
    options: { limit?: number; before?: string; includeParsedDetails?: boolean } = {}
  ): Promise<TransactionResponse> {
    try {
      const { limit = 20, before, includeParsedDetails = true } = options;
      const publicKey = new PublicKey(address);
      
      // Get one extra transaction to determine if there are more
      const fetchLimit = limit + 1;
      
      // Prepare options for getSignaturesForAddress
      const fetchOptions: any = { limit: fetchLimit };
      if (before) {
        fetchOptions.before = before;
      }
      
      // Fetch transactions with pagination
      const signatures: ConfirmedSignatureInfo[] = 
        await this.connection.getSignaturesForAddress(publicKey, fetchOptions);
      
      // Determine if there are more transactions
      const hasMore = signatures.length > limit;
      
      // Remove the extra transaction if needed
      const paginatedSignatures = hasMore 
        ? signatures.slice(0, limit) 
        : signatures;

      let transactions = paginatedSignatures;
      
      // Parse transaction details if requested
      if (includeParsedDetails && paginatedSignatures.length > 0) {
        // Get the full transaction details for each signature
        const parsedTransactions = await Promise.all(
          paginatedSignatures.map(async (sig) => {
            try {
              // Enrich the transaction info with parsed details
              const parsedDetails = await this.parseTransaction(sig.signature);
              return {
                ...sig,
                parsedDetails
              };
            } catch (error) {
              console.error(`Error parsing transaction ${sig.signature}:`, error);
              return sig; // Return original signature info if parsing fails
            }
          })
        );
        
        transactions = parsedTransactions;
      }
      
      // Get the signature of the last transaction for the next batch
      const nextBefore = paginatedSignatures.length > 0
        ? paginatedSignatures[paginatedSignatures.length - 1].signature
        : undefined;
      
      return {
        count: transactions.length,
        transactions,
        address: publicKey.toString(),
        hasMore,
        nextBefore
      };
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw {
        error: 'TRANSACTIONS_ERROR',
        message: 'Failed to fetch transactions'
      } as ErrorResponse;
    }
  }

  async parseTransaction(signature: string): Promise<ParsedTransactionDetails> {
    try {
      // Fetch the parsed transaction data
      const parsedTransaction = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      
      if (!parsedTransaction) {
        throw new Error('Transaction not found');
      }
      
      return this.extractTransactionInfo(parsedTransaction);
    } catch (error) {
      console.error(`Error parsing transaction ${signature}:`, error);
      throw error;
    }
  }

  private extractTransactionInfo(parsedTx: ParsedTransactionWithMeta): ParsedTransactionDetails {
    // Extract basic transaction info
    const result: ParsedTransactionDetails = {
      signature: parsedTx.transaction.signatures[0],
      blockTime: parsedTx.blockTime ? new Date(parsedTx.blockTime * 1000).toISOString() : undefined,
      slot: parsedTx.slot,
      fee: parsedTx.meta?.fee || 0,
      status: parsedTx.meta?.err ? 'failed' : 'success',
      type: 'unknown',
      amount: 0,
      sender: '',
      receiver: '',
      instructions: []
    };

    try {
      // Extract all instructions
      const instructions = parsedTx.transaction.message.instructions;
      if (!instructions.length) return result;
      
      // Process all instructions
      result.instructions = instructions.map((instruction, index) => {
        const parsedInstruction: any = {
          index,
          program: 'unknown',
          type: 'unknown',
          programId: ''
        };

        console.log(JSON.stringify(instruction, null, 2));

        // Check if it's a parsed instruction with program information
        if ('program' in instruction) {
          const instructionData = instruction as ParsedInstruction;
          parsedInstruction.program = instructionData.program;
          parsedInstruction.programId = instructionData.programId.toString();
          
          // Handle different program types
          if (instructionData.program === 'system') {
            parsedInstruction.type = instructionData.parsed.type;
            
            // For transfer instructions
            if (instructionData.parsed.type === 'transfer') {
              parsedInstruction.amount = instructionData.parsed.info.lamports / 1000000000; // Convert from lamports to SOL
              parsedInstruction.sender = instructionData.parsed.info.source;
              parsedInstruction.receiver = instructionData.parsed.info.destination;
              
              // Use the first system transfer as the main transaction info if not set
              if (result.type === 'unknown' || result.type.includes('unknown')) {
                result.type = instructionData.parsed.type;
                result.amount = parsedInstruction.amount;
                result.sender = parsedInstruction.sender;
                result.receiver = parsedInstruction.receiver;
              }
            }
          } 
          // Handle SPL token transfers
          else if (instructionData.program === 'spl-token') {
            parsedInstruction.type = instructionData.parsed.type;
            
            if (instructionData.parsed.type === 'transferChecked' || instructionData.parsed.type === 'transfer') {
              parsedInstruction.amount = instructionData.parsed.info.tokenAmount?.uiAmount || 0;
              parsedInstruction.sender = instructionData.parsed.info.source;
              parsedInstruction.receiver = instructionData.parsed.info.destination;
              
              // Add token mint info if available
              if (instructionData.parsed.info.mint) {
                parsedInstruction.tokenAddress = instructionData.parsed.info.mint;
              }
              
              // Add token decimals if available
              if (instructionData.parsed.info.tokenAmount?.decimals) {
                parsedInstruction.tokenDecimals = instructionData.parsed.info.tokenAmount.decimals;
              }
              
              // Use the first token transfer as the main transaction info if not already a system transfer
              if (result.type === 'unknown' || !result.type.includes('transfer')) {
                result.type = `spl-token:${instructionData.parsed.type}`;
                result.amount = parsedInstruction.amount;
                result.sender = parsedInstruction.sender;
                result.receiver = parsedInstruction.receiver;
                result.tokenAddress = parsedInstruction.tokenAddress;
                result.tokenDecimals = parsedInstruction.tokenDecimals;
              }
            }
          } 
          // Add other program types as needed
          else {
            parsedInstruction.type = instructionData.parsed.type || 'unknown';
            parsedInstruction.raw = instructionData.parsed;

            
            
            // If we haven't identified a meaningful type yet, use this
            if (result.type === 'unknown') {
              result.type = `${instructionData.program}:${parsedInstruction.type}`;
            }
          }
        } else if ('accounts' in instruction) {
          // Handle partially decoded instructions
          const partialInstruction = instruction as PartiallyDecodedInstruction;
          parsedInstruction.programId = partialInstruction.programId.toString();
          parsedInstruction.type = 'raw';
          parsedInstruction.raw = {
            data: partialInstruction.data,
            accounts: partialInstruction.accounts.map(a => a.toString())
          };
          
          // If this is the first instruction and we don't have a meaningful type yet
          if (index === 0 && result.type === 'unknown') {
            result.type = `program:${parsedInstruction.programId}`;
          }
        }

        
        return parsedInstruction;
      });

      // If we still couldn't identify parties from the instructions, try using token balances
      if (!result.sender || !result.receiver) {
        const preBalances = parsedTx.meta?.preBalances || [];
        const postBalances = parsedTx.meta?.postBalances || [];
        const accountKeys = parsedTx.transaction.message.accountKeys.map(key => key.toString());
        
        // Find accounts with decreased and increased balances
        for (let i = 0; i < accountKeys.length; i++) {
          if (preBalances[i] > postBalances[i] && i !== 0) { // Exclude fee payer
            result.sender = accountKeys[i];
          } else if (postBalances[i] > preBalances[i]) {
            result.receiver = accountKeys[i];
          }
        }
      }

      // Check for token transfers in post token balances
      if (result.type.includes('spl-token') && parsedTx.meta?.postTokenBalances?.length) {
        const tokenBalances = parsedTx.meta.postTokenBalances;
        if (tokenBalances.length > 0) {
          const tokenInfo = tokenBalances[0];
          result.tokenAddress = tokenInfo.mint;
          
          if (tokenInfo.uiTokenAmount) {
            result.tokenDecimals = tokenInfo.uiTokenAmount.decimals;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error extracting transaction info:', error);
      // Even if there's an error, return the basic info and whatever instructions we parsed
      return result;
    }
  }
} 