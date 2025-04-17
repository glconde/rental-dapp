// tasks/showAccounts.ts
import { task } from "hardhat/config";
import { HDNodeWallet } from "ethers";

task("show:wallet", "Shows derived address from mnemonic").setAction(
  async () => {
    const mnemonic = process.env.HARDHAT_MNEMONIC!;
    const wallet =
      HDNodeWallet.fromPhrase(mnemonic).derivePath(`m/44'/60'/0'/0/0`);
    console.log("Expected Account #0:", wallet.address);
  }
);
