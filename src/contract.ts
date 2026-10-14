import artifact from '../contracts/contract-metadata/RevenueSplitter.json';
import { getUsdc, requireChain } from '@/onchain-facts';

export const ARC_MAINNET_CHAIN_ID = 5042;

export const arcMainnet = requireChain(ARC_MAINNET_CHAIN_ID);
export const arcUsdc = getUsdc(ARC_MAINNET_CHAIN_ID)!;

export const REVENUE_SPLITTER = {
  address: '0x735E73d2Ed491B0BEfE961eCDce116c7bbDdfb28' as `0x${string}`,
  abi: artifact.abi,
} as const;