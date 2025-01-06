import { PublicKey } from "@solana/web3.js";

interface basicBoostAPIResponse {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon: string;
  header: string;
  openGraph: string;
  description: string;
  links: {
    type: string;
    label: string;
    url: string;
  }[];
  totalAmount: number;
  amount: number;
}

interface basicBoostParsedResponse {
  address: string;
  url: string;
  boost: number;
}

interface DetectedToken {
  url: string;
  address: string;
  initialMC: number;
  initialVolume: number;
  hpData: {
    top10HP: number;
    top25HP: number;
    top50HP: number;
    total: number;
  };

  initialPrice: {
    price: number;
    date: Date;
  };
  highestPrice: {
    price: number;
    date: Date;
  };
  currentPrice: {
    price: number;
    date: Date;
  };
  intialBoost: number;
  history: {
    MC: number;
    price: number;
    boost: number;
    date: Date;
    volume: number;
  }[];
}

interface basicMCRawData {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: {
      buys: number;
      sells: number;
    };
    h1: {
      buys: number;
      sells: number;
    };
    h6: {
      buys: number;
      sells: number;
    };
    h24: {
      buys: number;
      sells: number;
    };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info: {
    imageUrl: string;
    header: string;
    openGraph: string;
    websites: {
      label: string;
      url: string;
    }[];
    socials: {
      type: string;
      url: string;
    }[];
  };
}

type PKEY = PublicKey;
