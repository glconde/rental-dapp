import { ethers } from "hardhat";

// Change this value manually before each run
const DURATION_SECONDS = 29 * 86400;

async function main() {
  console.log(`⏩ Advancing time by ${DURATION_SECONDS} seconds`);

  console.log(`Sending evm_increaseTime with value: ${DURATION_SECONDS}`);
  await ethers.provider.send("evm_increaseTime", [DURATION_SECONDS]);

  console.log("Sending evm_mine to mine a new block...");
  await ethers.provider.send("evm_mine", []);

  console.log("✅ Time advanced.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
