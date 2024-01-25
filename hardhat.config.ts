require("dotenv").config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      // forking: {
      //   url: `https://mainnet.infura.io/v3/${INFURA_API_TOKEN}`,
      // },
      accounts: {
        count: 110,
        initialIndex: 0,
        accountsBalance: "2000000000000000000000"
      }
    },
  },
  gasReporter: {
    enabled: true
  }
};

export default config;
