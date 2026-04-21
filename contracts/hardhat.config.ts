import { config as loadEnv } from "dotenv";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import type { HardhatUserConfig } from "hardhat/config";

loadEnv({ path: "../.env" });
loadEnv();

const deployerPrivateKey = process.env.PRIVATE_KEY;
const arbitrumSepoliaRpcUrl =
  process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";

const config: HardhatUserConfig = {
  plugins: [hardhatViem],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    }
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1"
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op"
    },
    arbitrumSepolia: {
      type: "http",
      chainType: "generic",
      url: arbitrumSepoliaRpcUrl,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
      chainId: 421614
    }
  }
};

export default config;
