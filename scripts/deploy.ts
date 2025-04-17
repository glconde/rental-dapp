// deploy for integration
import { ethers } from "hardhat";

async function main() {
  const RentalAgreement = await ethers.getContractFactory("RentalAgreement");
  const contract = await RentalAgreement.deploy();
  await contract.waitForDeployment();

  console.log("RentalAgreement deployed to:", contract.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
