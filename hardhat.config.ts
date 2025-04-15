import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
import { HDNodeWallet, Mnemonic } from "ethers";

dotenv.config();
console.log("⚠️ USING CUSTOM CONFIG - CHECK CHAIN ID + MNEMONIC");
console.log("Mnemonic:", process.env.HARDHAT_MNEMONIC);

const testMnemonic = process.env.HARDHAT_MNEMONIC!;
const m = Mnemonic.fromPhrase(testMnemonic);

// For index 0
const wallet = HDNodeWallet.fromMnemonic(m); // No .derivePath here
console.log("Expected Address:", wallet.address); // should be 0x1090...

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: {
        mnemonic: process.env.HARDHAT_MNEMONIC ?? "",
      },
    },
  },
};

export default config;
