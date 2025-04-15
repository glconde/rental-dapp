// 📄 scripts/pause.ts
import { ethers } from "hardhat";

async function main() {
  // 🔐 Replace with actual deployed address
  const deployedAddress = "<DEPLOYED_CONTRACT_ADDRESS>";

  // 📡 Get signer and contract instance
  const [owner] = await ethers.getSigners();
  const contract = await ethers.getContractAt(
    "RentalAgreement",
    deployedAddress
  );

  // 🛑 Pause the contract (set to false to unpause)
  await contract.connect(owner).setPaused(true);
  console.log("✅ Contract is now paused");

  // 💡 Frontend provision:
  // In Next.js app, expose an owner-only button to call setPaused(bool)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
