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
  hpData: {
    top10HP: number;
    top25HP: number;
    top50HP: number;
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
  }[];
}

type PKEY = PublicKey;
