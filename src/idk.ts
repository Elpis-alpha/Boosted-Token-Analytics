import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, AccountLayout, NATIVE_MINT, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { generatePubKey } from "@raydium-io/raydium-sdk";


// RPC Endpoint
const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_ENDPOINT);

// Liquidity Pool Accounts (Replace with actual pool addresses)
const SPL_TOKEN_RESERVE = "5DQSDg6SGkbsbykq4mQstpcL4d5raEHc6rY7LgBwpump"; // Replace with the SPL Token reserve account in the pool
const USDC_RESERVE = NATIVE_MINT.toBase58(); // Replace with the USDC reserve account in the pool

async function getReserveBalance(reserveAddress: string): Promise<number> {
  try {
    const reservePublicKey = new PublicKey(reserveAddress);

    // Fetch account info for the reserve
    const accountInfo = await connection.getAccountInfo(reservePublicKey);

    if (!accountInfo) {
      throw new Error("Account info not found");
    }

    // Parse account data to get the reserve balance
    const data = AccountLayout.decode(accountInfo.data);
    const balance = Number(data.amount);

    return balance;
  } catch (error) {
    console.error(`Error fetching balance for ${reserveAddress}:`, error);
    return 0;
  }
}

async function calculateTokenPrice() {
  try {
    const c = generatePubKey({
      fromPublicKey: new PublicKey("5DQSDg6SGkbsbykq4mQstpcL4d5raEHc6rY7LgBwpump"),
      programId: TOKEN_2022_PROGRAM_ID
    })
  } catch (error) {
    console.error("Error calculating token price:", error);
  }
}

calculateTokenPrice();
