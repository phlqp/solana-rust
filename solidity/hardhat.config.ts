import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          outputSelection: {
            "*": {
              "*": ["storageLayout"],
            },
          },
          optimizer: {
            enabled: true,
            runs: 20,
          },
        },
      },
    ],
  },
  networks: {
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
      timeout: 600000,
    },
    goerli : {
      chainId: 5,
      url: process.env.GOERLI_RPC_URL || "https://goerli.blockpi.network/v1/rpc/public",
      accounts: process.env.OWNER_PRIVATE_KEY?[process.env.OWNER_PRIVATE_KEY]:[],
    },
    ogoerli : {
      chainId: 420,
      url: process.env.OPTINISM_GOERLI_URL || "https://goerli.optimism.io/",
      accounts: process.env.OWNER_PRIVATE_KEY?[process.env.OWNER_PRIVATE_KEY]:[],
    },
  },
  etherscan: {
    apiKey: {
      goerli : process.env.GOERLI_ETHERSCAN_API_KEY || "J38CZNI82HYHR5Z93R36543AUFHVUM6D6E",
      optimisticGoerli : process.env.OPTINISM_GOERLI_ETHERSCAN_API_KEY || "7CYAHYMPWYX1Z93ST19Z4YES9R5PM39BQH",
    }
  },
  typechain: {
    outDir: "./typechain",
    target: "ethers-v5",
  },
  mocha: {
    timeout: 100000000
  },
};

export default config;
