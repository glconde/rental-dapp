import { ethers } from "hardhat";
import { expect } from "chai";
import { RentalAgreement } from "../typechain";

describe("RentalAgreement Contract", function () {
  let rentalContract: RentalAgreement;
  let owner: any; // Signer
  let tenant: any; // Signer
  let other: any; // Signer
  const isDemo = false;
  const demoInterval: number = isDemo ? 24 * 60 * 60 : 1;

  beforeEach(async function () {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    tenant = accounts[1];
    other = accounts[2];

    const RentalAgreement = await ethers.getContractFactory("RentalAgreement");
    rentalContract = await RentalAgreement.deploy();
    await rentalContract.waitForDeployment();
  });

  it("should deploy the contract and set the owner", async function () {
    expect(await rentalContract.owner()).to.equal(owner.address);
  });

  it("should allow the owner to create a rental", async function () {
    const propertyId = "property1";
    const rentAmount = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const lateFee = ethers.parseEther("0.1");
    const rentInterval = 30 * demoInterval;

    await rentalContract.createRental(
      propertyId,
      tenant.address,
      rentAmount,
      depositAmount,
      lateFee,
      rentInterval
    );

    const rental = await rentalContract.rentals(propertyId);
    expect(rental.propertyId).to.equal(propertyId);
    expect(rental.tenant).to.equal(tenant.address);
    expect(rental.rentAmount).to.equal(rentAmount);
    expect(rental.depositAmount).to.equal(depositAmount);
    expect(rental.status).to.equal(0); // Pending = 0
  });

  it("should allow the tenant to activate the rental and pay the rent", async function () {
    const propertyId = "property1";
    const rentAmount = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const lateFee = ethers.parseEther("0.1");
    const rentInterval = 30 * demoInterval;

    await rentalContract.createRental(
      propertyId,
      tenant.address,
      rentAmount,
      depositAmount,
      lateFee,
      rentInterval
    );

    await rentalContract.connect(tenant).activateRental(propertyId, {
      value: rentAmount + depositAmount,
    });

    const rental = await rentalContract.rentals(propertyId);
    expect(rental.status).to.equal(1); // Active = 1
    expect(rental.startTime).to.be.greaterThan(0n);
    expect(rental.rentDueDate).to.be.greaterThan(0n);
  });

  it("should allow the tenant to pay rent on time", async function () {
    const propertyId = "property1";
    const rentAmount = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const lateFee = ethers.parseEther("0.1");
    const rentInterval = 30 * demoInterval;

    await rentalContract.createRental(
      propertyId,
      tenant.address,
      rentAmount,
      depositAmount,
      lateFee,
      rentInterval
    );
    await rentalContract.connect(tenant).activateRental(propertyId, {
      value: rentAmount + depositAmount,
    });

    await rentalContract.connect(tenant).payRent(propertyId, {
      value: rentAmount,
    });

    const rental = await rentalContract.rentals(propertyId);
    expect(rental.rentDueDate).to.be.greaterThan(
      rental.startTime + BigInt(rentInterval)
    );
  });

  it("should allow the tenant to pay late rent with a late fee", async function () {
    const propertyId = "property1";
    const rentAmount = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const lateFee = ethers.parseEther("0.1");
    const rentInterval = 30 * demoInterval;

    await rentalContract.createRental(
      propertyId,
      tenant.address,
      rentAmount,
      depositAmount,
      lateFee,
      rentInterval
    );
    await rentalContract.connect(tenant).activateRental(propertyId, {
      value: rentAmount + depositAmount,
    });

    await ethers.provider.send("evm_increaseTime", [31 * demoInterval]);
    await ethers.provider.send("evm_mine", []);

    const totalDue = rentAmount + lateFee;
    await rentalContract.connect(tenant).payRent(propertyId, {
      value: totalDue,
    });

    const rental = await rentalContract.rentals(propertyId);
    expect(rental.status).to.equal(3); // Late = 3
    expect(rental.rentDueDate).to.be.greaterThan(0n);
  });

  it("should allow the owner to end the rental and refund the deposit", async function () {
    const propertyId = "property1";
    const rentAmount = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const lateFee = ethers.parseEther("0.1");
    const rentInterval = 30 * demoInterval;

    await rentalContract.createRental(
      propertyId,
      tenant.address,
      rentAmount,
      depositAmount,
      lateFee,
      rentInterval
    );
    await rentalContract.connect(tenant).activateRental(propertyId, {
      value: rentAmount + depositAmount,
    });

    const tenantBalanceBefore = await ethers.provider.getBalance(
      tenant.address
    );
    await rentalContract.connect(owner).endRental(propertyId);
    const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);

    const rental = await rentalContract.rentals(propertyId);
    expect(rental.status).to.equal(2); // Expired = 2
    expect(rental.endTime).to.be.greaterThan(0n);
    expect(tenantBalanceAfter).to.be.greaterThan(tenantBalanceBefore);
  });

  it("should only allow the owner to end the rental", async function () {
    const propertyId = "property1";
    const rentAmount = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const lateFee = ethers.parseEther("0.1");
    const rentInterval = 30 * demoInterval;

    await rentalContract.createRental(
      propertyId,
      tenant.address,
      rentAmount,
      depositAmount,
      lateFee,
      rentInterval
    );
    await rentalContract.connect(tenant).activateRental(propertyId, {
      value: rentAmount + depositAmount,
    });

    await expect(
      rentalContract.connect(tenant).endRental(propertyId)
    ).to.be.revertedWith("Only the owner can call this function");
  });

  it("should allow the owner to pause the contract", async function () {
    await rentalContract.connect(owner).setPaused(true);
    expect(await rentalContract.paused()).to.equal(true);
  });

  it("should prevent actions when paused", async function () {
    await rentalContract.connect(owner).setPaused(true);
    await expect(
      rentalContract.createRental(
        "property1",
        tenant.address,
        ethers.parseEther("1"),
        ethers.parseEther("2"),
        ethers.parseEther("0.1"),
        30 * demoInterval
      )
    ).to.be.revertedWith("Contract is paused");
  });

  it("should return the tenant's deposit balance", async function () {
    const propertyId = "property1";
    const depositAmount = ethers.parseEther("2");
    await rentalContract.createRental(
      propertyId,
      tenant.address,
      ethers.parseEther("1"),
      depositAmount,
      ethers.parseEther("0.1"),
      30 * demoInterval
    );
    await rentalContract
      .connect(tenant)
      .activateRental(propertyId, { value: ethers.parseEther("3") });
    expect(
      await rentalContract.connect(tenant).getDeposit(propertyId)
    ).to.equal(depositAmount);

    it("should emit RentalCreated event", async function () {
      const propertyId = "property1";
      const rentAmount = ethers.parseEther("1");
      await expect(
        rentalContract.createRental(
          propertyId,
          tenant.address,
          rentAmount,
          ethers.parseEther("2"),
          ethers.parseEther("0.1"),
          30 * demoInterval
        )
      )
        .to.emit(rentalContract, "RentalCreated")
        .withArgs(
          propertyId,
          tenant.address,
          rentAmount,
          ethers.parseEther("2")
        );
    });
  });
});
