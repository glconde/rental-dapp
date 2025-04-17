import { ethers } from "hardhat";
import { expect } from "chai";
import { RentalAgreement } from "../typechain";

describe("RentalAgreement Contract", function () {
  let rentalContract: RentalAgreement;
  let owner: any;
  let tenant: any;
  let other: any;
  const demoInterval = 24 * 60 * 60;

  beforeEach(async function () {
    [owner, tenant, other] = await ethers.getSigners();
    const RentalAgreementFactory = await ethers.getContractFactory(
      "RentalAgreement"
    );
    rentalContract = await RentalAgreementFactory.deploy();
    await rentalContract.waitForDeployment();
  });

  const setupRental = async (propertyId: string) => {
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

    return { rentAmount, depositAmount, lateFee, rentInterval };
  };

  it("should deploy and set owner", async () => {
    expect(await rentalContract.owner()).to.equal(owner.address);
  });

  it("should create a rental", async () => {
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
    expect(rental.status).to.equal(0);
  });

  it("should activate rental", async () => {
    const propertyId = "property1";
    await setupRental(propertyId);
    const rental = await rentalContract.rentals(propertyId);
    expect(rental.status).to.equal(1);
  });

  it("should allow timely rent payment", async () => {
    const propertyId = "property1";
    const { rentAmount, rentInterval } = await setupRental(propertyId);
    await rentalContract
      .connect(tenant)
      .payRent(propertyId, { value: rentAmount });
    const rental = await rentalContract.rentals(propertyId);
    expect(rental.rentDueDate).to.be.gt(
      rental.startTime + BigInt(rentInterval)
    );
  });

  it("should charge late fee after due date", async () => {
    const propertyId = "property1";
    const { rentAmount, lateFee } = await setupRental(propertyId);
    await ethers.provider.send("evm_increaseTime", [31 * demoInterval]);
    await ethers.provider.send("evm_mine", []);
    await rentalContract
      .connect(tenant)
      .payRent(propertyId, { value: rentAmount + lateFee });
    const rental = await rentalContract.rentals(propertyId);
    expect(rental.status).to.equal(3); // Late
  });

  it("should end rental and refund deposit", async () => {
    const propertyId = "property1";
    const { depositAmount } = await setupRental(propertyId);
    const before = await ethers.provider.getBalance(tenant.address);
    await rentalContract.connect(owner).endRental(propertyId);
    const after = await ethers.provider.getBalance(tenant.address);
    const rental = await rentalContract.rentals(propertyId);
    expect(rental.status).to.equal(2); // Expired
    expect(after).to.be.gt(before);
  });

  it("should restrict endRental to owner", async () => {
    const propertyId = "property1";
    await setupRental(propertyId);
    await expect(
      rentalContract.connect(tenant).endRental(propertyId)
    ).to.be.revertedWith("Only the owner can call this function");
  });

  it("should pause and prevent actions", async () => {
    await rentalContract.setPaused(true);
    expect(await rentalContract.paused()).to.be.true;

    await expect(
      rentalContract.createRental(
        "property2",
        tenant.address,
        ethers.parseEther("1"),
        ethers.parseEther("2"),
        ethers.parseEther("0.1"),
        30 * demoInterval
      )
    ).to.be.revertedWith("Contract is paused");
  });

  it("should return deposit balance", async () => {
    const propertyId = "property1";
    const { depositAmount } = await setupRental(propertyId);
    expect(
      await rentalContract.connect(tenant).getDeposit(propertyId)
    ).to.equal(depositAmount);
  });

  it("should emit RentalCreated", async () => {
    const propertyId = "property1";
    const rentAmount = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const lateFee = ethers.parseEther("0.1");
    const rentInterval = 30 * demoInterval;

    await expect(
      rentalContract.createRental(
        propertyId,
        tenant.address,
        rentAmount,
        depositAmount,
        lateFee,
        rentInterval
      )
    )
      .to.emit(rentalContract, "RentalCreated")
      .withArgs(propertyId, tenant.address, rentAmount, depositAmount);
  });
});
