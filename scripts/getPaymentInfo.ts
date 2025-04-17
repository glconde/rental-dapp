import { ethers } from "hardhat";

const txHash =
  "0x3723a7a7a47a10ac7bdc2044c62362e6a54b5f01865c4c54dd73b75700154cec"; // replace if needed

async function main() {
  const provider = ethers.provider;
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    console.error("Transaction not found.");
    return;
  }

  const block = await provider.getBlock(receipt.blockNumber);
  if (!block) {
    console.error("Block not found.");
    return;
  }

  const timestamp = new Date(block.timestamp * 1000).toISOString();

  console.log("✅ Payment Info");
  console.log("Block Number:", receipt.blockNumber);
  console.log("Timestamp:", timestamp);
  console.log("Transaction Hash:", txHash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
