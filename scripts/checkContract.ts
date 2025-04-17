import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const PROPERTY_ID = "c172922c-5a28-44f1-84b7-3fdab8b7f3bc"; // Update as needed

const ABI = [
  "function rentals(string memory) view returns (string memory propertyId, address tenant, uint256 rentAmount, uint256 depositAmount, uint256 lateFee, uint256 rentDueDate, uint256 rentInterval, uint8 status, uint256 startTime, uint256 endTime)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  const rental = await contract.rentals(PROPERTY_ID);

  console.log("🔎 Rental Info:");
  console.log("Property ID:   ", rental.propertyId);
  console.log("Tenant:        ", rental.tenant);
  console.log("Rent Amount:   ", ethers.formatEther(rental.rentAmount), "ETH");
  console.log(
    "Deposit:       ",
    ethers.formatEther(rental.depositAmount),
    "ETH"
  );
  console.log("Late Fee:      ", ethers.formatEther(rental.lateFee), "ETH");
  console.log(
    "Due Date:      ",
    new Date(Number(rental.rentDueDate) * 1000).toISOString()
  );
  console.log("Interval (s):  ", rental.rentInterval.toString());
  console.log("Status Code:   ", rental.status);
  console.log("🧾 Status Map: 0 = Pending, 1 = Active, 2 = Expired, 3 = Late");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
