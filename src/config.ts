/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { arc, arcTestnet } from 'viem/chains';
import { getDefaultConfig } from 'connectkit';
import { registerChain } from './tracing';

registerChain(arc.id, arc.rpcUrls.default.http[0]);

const projectId = import.meta.env.VITE_WC_PROJECT_ID as string;

export const config = createConfig(
  getDefaultConfig({
    chains: [arc, arcTestnet, mainnet],
    transports: {
      [arc.id]: http('https://rpc.mainnet.arc.io'),
      [arcTestnet.id]: http(),
      [mainnet.id]: http(),
    },
    walletConnectProjectId: projectId,
    appName: 'Revenue Splitter',
    appDescription: 'Programmable USDC revenue splitting on Arc Mainnet',
  })
);