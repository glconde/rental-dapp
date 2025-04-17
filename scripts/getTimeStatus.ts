import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const PROPERTY_ID = "c172922c-5a28-44f1-84b7-3fdab8b7f3bc";

const ABI = [
  "function rentals(string) view returns (string propertyId, address tenant, uint256 rentAmount, uint256 depositAmount, uint256 lateFee, uint256 rentDueDate, uint256 rentInterval, uint8 status, uint256 startTime, uint256 endTime)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  const rental = await contract.rentals(PROPERTY_ID);
  const startTime = Number(rental.startTime);
  const latestBlock = await provider.getBlock("latest");
  if (!latestBlock || latestBlock.timestamp === undefined) {
    throw new Error("Failed to fetch current block or timestamp");
  }
  const now = latestBlock.timestamp;

  const secondsPassed = now - startTime;
  const daysPassed = secondsPassed / 86400;

  console.log("⏱️ Time Since Rental Start:");
  console.log(`Start Time (Unix): ${startTime}`);
  console.log(`Current Block Time: ${now}`);
  console.log(
    `Elapsed: ${secondsPassed} seconds (~${daysPassed.toFixed(2)} days)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
