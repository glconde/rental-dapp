// 📄 scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  // 🌐 Get default accounts
  const [owner, tenant] = await ethers.getSigners();

  // 🛠 Deploy the RentalAgreement contract
  const RentalAgreement = await ethers.getContractFactory("RentalAgreement");
  const rentalContract = await RentalAgreement.deploy();
  await rentalContract.waitForDeployment();
  console.log("RentalAgreement deployed to:", rentalContract.target);

  // 🧾 Define rental terms
  const propertyId = "property1";
  const rentAmount = ethers.parseEther("1");
  const depositAmount = ethers.parseEther("2");
  const lateFee = ethers.parseEther("0.1");
  const rentInterval = 30 * 24 * 60 * 60; // 30 days

  // 🏠 Create rental agreement
  await rentalContract
    .connect(owner)
    .createRental(
      propertyId,
      tenant.address,
      rentAmount,
      depositAmount,
      lateFee,
      rentInterval
    );
  console.log("Rental created:", propertyId);

  // 🔑 Tenant activates rental by paying deposit + 1st rent
  await rentalContract.connect(tenant).activateRental(propertyId, {
    value: rentAmount + depositAmount,
  });
  console.log("Rental activated at t=0");

  // ⏱ Helper for enum decoding
  const RentalStatus = ["Pending", "Active", "Expired", "Late"];

  // 📅 Simulate 6 months of rent payments
  for (let month = 1; month <= 6; month++) {
    const balanceBefore = await ethers.provider.getBalance(
      rentalContract.target
    );

    if (month === 3) {
      // ❗ Simulate late rent
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      await rentalContract.connect(tenant).payRent(propertyId, {
        value: rentAmount + lateFee,
      });
      console.log(`Month ${month}: Late rent paid with fee`);
    } else {
      // ✅ On-time rent
      await ethers.provider.send("evm_increaseTime", [29 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      await rentalContract.connect(tenant).payRent(propertyId, {
        value: rentAmount,
      });
      console.log(`Month ${month}: Rent paid on time`);
    }

    const balanceAfter = await ethers.provider.getBalance(
      rentalContract.target
    );
    const rental = await rentalContract.rentals(propertyId);
    console.log(
      `  Status: ${RentalStatus[Number(rental.status)]} | Due: ${new Date(
        Number(rental.rentDueDate) * 1000
      ).toISOString()}`
    );
    console.log("  Contract balance:", ethers.formatEther(balanceAfter), "ETH");
  }

  // 🔚 End rental and refund deposit
  const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);
  await rentalContract.connect(owner).endRental(propertyId);
  const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);

  console.log(
    "Rental ended. Deposit refunded:",
    ethers.formatEther(tenantBalanceAfter - tenantBalanceBefore),
    "ETH"
  );

  const rental = await rentalContract.rentals(propertyId);
  console.log("Final rental state:", rental);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
