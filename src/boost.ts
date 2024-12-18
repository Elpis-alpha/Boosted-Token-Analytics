import { Connection, PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import {
  basicBoostAPIResponse,
  basicBoostParsedResponse,
  DetectedToken,
} from "./types";

const getBoosted = async () => {
  try {
    const response = await fetch(
      "https://api.dexscreener.com/token-boosts/latest/v1",
      {
        method: "GET",
        headers: {},
      }
    );
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as basicBoostAPIResponse[];
    if (!data) return null;
    if (!Array.isArray(data)) {
      console.error("Invalid API response: Data is not an array");
      return null;
    }
    if (!Array.isArray(data)) return null;
    return data
      .filter((item) => item.chainId === "solana")
      .map((item) => {
        return {
          address: item.tokenAddress,
          url: item.url,
          boost: item.totalAmount,
        } as basicBoostParsedResponse;
      })
      .sort((a, b) => b.boost - a.boost);
  } catch (err) {
    console.error(err);
    return null;
  }
};

const detectedTokens = new Map<string, DetectedToken>();
const detectedTokenMarketCap = new Map<string, number>();
const moreThan2MTokens = new Map<string, number>();

const checkAndSaveTokens = async () => {
  let changed = false;
  const boostedTokens = await getBoosted();
  if (!boostedTokens) return;

  for (let i = 0; i < boostedTokens.length; i++) {
    const token = boostedTokens[i];
    const existingToken = detectedTokens.get(token.address);
    if (moreThan2MTokens.has(token.address)) {
      // console.log(
      //   chalk.redBright(`\nToken ${token.address} MC is more than 2M`)
      // );
      continue;
    }

    if (existingToken && existingToken.intialBoost === token.boost) {
      // console.log(chalk.yellow(`\nToken ${token.address} boost is the same`));
      continue;
    } else if (
      existingToken &&
      existingToken.history[existingToken.history.length - 1]?.boost ===
        token.boost
    ) {
      // console.log(chalk.yellow(`\nToken ${token.address} boost is the same`));
      continue;
    }

    const MC = await fetchMarketCap(token.address);
    if (!MC || typeof MC !== "number" || MC <= 0) continue;
    if (MC > 2_000_000) {
      moreThan2MTokens.set(token.address, 1);
      // console.log(
      //   chalk.redBright(`\nToken ${token.address} MC is more than 2M`)
      // );
      continue;
    }
    detectedTokenMarketCap.set(token.address, MC);

    if (!existingToken) {
      const hpData = await getTopHolderInfo(token.address);
      // New token detected
      console.log(chalk.cyan(`\nNew Token Detected`));
      console.log(chalk.cyanBright(`- Address: ${token.address}`));
      console.log(chalk.cyanBright(`- Boost: ${token.boost}`));
      console.log(chalk.cyanBright(`- Market Cap: ${shortenNumber(MC)} USD\n`));

      const newToken: DetectedToken = {
        address: token.address,
        url: token.url,
        hpData,
        initialMC: {
          MC: MC,
          date: new Date(),
        },
        highestMC: {
          MC: MC,
          date: new Date(),
        },
        currentMC: {
          MC: MC,
          date: new Date(),
        },
        intialBoost: token.boost,
        history: [],
      };

      detectedTokens.set(token.address, newToken);
      changed = true;
    } else {
      // Existing token detected
      const bostChanged = token.boost !== existingToken.intialBoost;
      const boostChangedInHistory =
        token.boost !==
        existingToken.history[existingToken.history.length - 1]?.boost;
      if (!bostChanged && !boostChangedInHistory) continue;

      console.log(chalk.green(`\nUpdated Token Detected`));
      console.log(chalk.greenBright(`- Address: ${token.address}`));
      console.log(chalk.greenBright(`- New Boost: ${token.boost}`));
      console.log(
        chalk.greenBright(`- Old Boost: ${existingToken.intialBoost}`)
      );
      console.log(
        chalk.greenBright(`- Market Cap: ${shortenNumber(MC)} USD\n`)
      );

      existingToken.history.push({
        MC: MC,
        boost: token.boost,
        date: new Date(),
      });
      detectedTokens.set(token.address, existingToken);
      changed = true;
    }
  }

  return changed;
};

const checkDetectedTokensMarketCapChange = async () => {
  const allTokens = Array.from(detectedTokens.keys());

  for (let i = 0; i < allTokens.length; i++) {
    const token = allTokens[i];
    const MC =
      detectedTokenMarketCap.get(token) || (await fetchMarketCap(token));
    if (!MC || typeof MC !== "number" || MC <= 0) continue;
    if (MC > 2_000_000) {
      moreThan2MTokens.set(token, 1);
      // console.log(chalk.redBright(`\nToken ${token} MC is more than 2M`));
      continue;
    }

    const existingToken = detectedTokens.get(token);
    if (!existingToken) continue;

    existingToken.currentMC = {
      MC: MC,
      date: new Date(),
    };

    const isHighest = MC > existingToken.highestMC.MC;
    if (isHighest) {
      existingToken.highestMC = {
        MC: MC,
        date: new Date(),
      };
    }

    detectedTokens.set(token, existingToken);
  }
};

const fetchMarketCap = async (contractAddress: string) => {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`
    );
    const data = await response.json();
    const marketCap = data.pairs[0].fdv;
    return marketCap as number;
  } catch (error) {
    console.error("Error fetching market cap:", error);
    return null;
  }
};

const shortenNumber = (number: number) => {
  const SI_POSTFIXES = ["", "k", "M", "B", "T", "P", "E"];
  const sign = number < 0 ? "-1" : "";
  const absNumber = Math.abs(number);
  const tier = (Math.log10(absNumber) / 3) | 0;
  if (tier == 0) return `${absNumber}`;
  const postfix = SI_POSTFIXES[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = absNumber / scale;
  const floored = Math.floor(scaled * 10) / 10;
  let str = floored.toFixed(1);
  str = /\.0$/.test(str) ? str.substr(0, str.length - 2) : str;
  if (number > 900000000000000000000) return "∞";
  if (number < -900000000000000000000) return "-∞";
  if (number > 0 && number < 1) return number.toString();
  if (number < 0 && number > -1) return number.toString();
  return `${sign}${str}${postfix}`;
};

export const analyzePerformance = async () => {
  const baseDir = path.join(__dirname, "data");
  let folderNumber = 1;
  let numberOfRoundsLeftToCheckMarketCapChange = 0;
  const start = new Date();
  if (!process.env.RPC) {
    console.error("RPC environment variable is not set");
    process.exit(1);
  }

  const nextFolder = getNextFolderName(baseDir);
  const folderPath = path.join(baseDir, nextFolder);
  fs.mkdirSync(folderPath);

  while (true) {
    try {
      detectedTokenMarketCap.clear();
      console.log(chalk.blueBright("\nChecking for boosted tokens...\n"));

      const changed = await checkAndSaveTokens();
      if (!changed) console.log(chalk.yellow(`No changes detected\n`));

      if (numberOfRoundsLeftToCheckMarketCapChange <= 0) {
        numberOfRoundsLeftToCheckMarketCapChange = 20;
        console.log(chalk.greenBright("Checking for market cap change...\n"));
        await checkDetectedTokensMarketCapChange();

        const data = Array.from(detectedTokens.values());
        createFile(folderNumber, data, folderPath);
        const savedAt = `data/${nextFolder}/${folderNumber}.json`;
        console.log(chalk.greenBright(`Data saved to ${savedAt}`));
        folderNumber++;
      } else {
        console.log(
          chalk.magentaBright(
            `Waiting for ${numberOfRoundsLeftToCheckMarketCapChange} rounds to check market cap change...`
          )
        );
        numberOfRoundsLeftToCheckMarketCapChange--;
      }

      const timeString = getTimeString(start);
      detectedTokenMarketCap.clear();
      console.log(
        chalk.blueBright(`${timeString}. Waiting for 5 seconds...\n\n`)
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.log("Error in main loop:", error);
    }
  }
};

const getTimeString = (start: Date) => {
  const current = new Date();
  const timePassed = Math.floor((current.getTime() - start.getTime()) / 1000);
  const secondsPassed = timePassed % 60;
  const minutesPassed = Math.floor(timePassed / 60) % 60;
  const hoursPassed = Math.floor(timePassed / 3600);
  const timeString = `\nTime elapsed: ${hoursPassed}h ${minutesPassed}m ${secondsPassed}s`;
  return timeString;
};
function getNextFolderName(baseDir: string) {
  let folderNumber = 1;
  while (fs.existsSync(path.join(baseDir, folderNumber.toString()))) {
    folderNumber++;
  }
  return folderNumber.toString();
}

function createFile(
  fileNumber: number,
  data: DetectedToken[],
  folderPath: string
) {
  const nextFile = `${fileNumber}.json`;
  const filePath = path.join(folderPath, nextFile);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const getTopHolderInfo = async (mint: string) => {
  const connection = new Connection(process.env.RPC ?? "", "finalized");
  const tokenPublicKey = new PublicKey(mint);
  const mintInfo = await getMint(connection, tokenPublicKey);
  const supply = Number(mintInfo.supply);

  const allAccounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 }, // Size of token account
      { memcmp: { offset: 0, bytes: mint } }, // Filter for token mint
    ],
  });

  const holders = allAccounts
    .map((accountInfo) => {
      const data = accountInfo.account.data;
      const amount = Number(data.readBigUInt64LE(64));
      const ownerAddress = new PublicKey(data.slice(32, 64)).toBase58();
      if (ownerAddress === "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1") {
        // RAYDIUM.AUTHORITY_V4
        return null;
      }
      const percentage = (amount / supply) * 100;

      //   if (ownerAddress === BURN_ADDRESS) {
      //     console.log(`Skipping burn address: ${BURN_ADDRESS}`);
      //     return null;
      //   }

      return {
        walletAddress: ownerAddress,
        amount,
        percentage,
      };
    })
    .filter((holder) => holder !== null);

  holders.sort((a, b) => b.amount - a.amount);

  const top10 = holders.slice(0, 10);
  const top25 = holders.slice(0, 25);
  const top50 = holders.slice(0, 50);

  interface TopHolder {
    walletAddress: string;
    amount: number;
    percentage: number;
  }

  const calculateTotalPercentage = (holders: TopHolder[]) => {
    return holders.reduce((total, holder) => total + holder.percentage, 0);
  };

  const top10HP = calculateTotalPercentage(top10);
  const top25HP = calculateTotalPercentage(top25);
  const top50HP = calculateTotalPercentage(top50);

  return {
    top10HP,
    top25HP,
    top50HP,
  };
};

analyzePerformance();
