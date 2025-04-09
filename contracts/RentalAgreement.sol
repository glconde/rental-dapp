// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RentalAgreement {
    // Define the owner of the contract (landlord)
    address public owner;

    // Flag for emergency pause state (for emergencies like contract vulnerabilities)
    bool public paused; 

    // Enum for rental status (Pending, Active, Expired, Late)
    enum RentalStatus { Pending, Active, Expired, Late }

    // Struct to store rental agreement details
    struct Rental {
        string propertyId;        // Unique ID for the property
        address tenant;           // Tenant's wallet address
        uint256 rentAmount;       // Monthly rent amount
        uint256 depositAmount;    // Security deposit
        uint256 lateFee;          // Late fee for overdue rent
        uint256 rentDueDate;      // Timestamp of the next rent due
        uint256 rentInterval;     // Interval (in seconds) between rent payments
        RentalStatus status;      // Current status of the rental agreement
        uint256 startTime;        // Rental start timestamp
        uint256 endTime;          // Rental end timestamp (0 if not ended)
    }

    // Mapping to store rentals by property ID
    mapping(string => Rental) public rentals;

    // Mapping to track deposits held by the contract per tenant
    mapping(address => uint256) public deposits;

    // Events to log actions (useful for frontend)
    event RentalCreated(string propertyId, address tenant, uint256 rentAmount, uint256 depositAmount);
    event RentPaid(string propertyId, uint256 amount, uint256 timestamp);
    event RentalEnded(string propertyId, uint256 timestamp);
    event DepositRefunded(string propertyId, address tenant, uint256 amount);
    event RentalStatusChanged(string propertyId, RentalStatus newStatus);
    event ContractPaused(bool paused);

    // Constructor to set the deployer as the owner of the contract
    constructor() {
        owner = msg.sender;
        paused = false;
    }

    // Modifiers for access control and contract state checks
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier onlyTenant(string memory _propertyId) {
        require(msg.sender == rentals[_propertyId].tenant, "Only the tenant can call this function");
        _;
    }

    modifier rentalActive(string memory _propertyId) {
        require(rentals[_propertyId].status == RentalStatus.Active, "Rental must be active");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // Optional: Toggle the paused state of the contract for emergency situations
    function setPaused(bool _paused) public onlyOwner {
        paused = _paused;
        emit ContractPaused(_paused);
    }

    // Create a new rental agreement
    function createRental(
        string memory _propertyId,
        address _tenant,
        uint256 _rentAmount,
        uint256 _depositAmount,
        uint256 _lateFee,
        uint256 _rentInterval // e.g., 30 days in seconds
    ) public onlyOwner whenNotPaused {
        // Ensure that the property is not already rented
        require(rentals[_propertyId].tenant == address(0), "Property already rented");

        rentals[_propertyId] = Rental({
            propertyId: _propertyId,
            tenant: _tenant,
            rentAmount: _rentAmount,
            depositAmount: _depositAmount,
            lateFee: _lateFee,
            rentDueDate: 0, // To be set when activated
            rentInterval: _rentInterval,
            status: RentalStatus.Pending,
            startTime: 0,
            endTime: 0
        });

        emit RentalCreated(_propertyId, _tenant, _rentAmount, _depositAmount);
    }

    // Activate the rental (tenant pays deposit + first month's rent)
    function activateRental(string memory _propertyId) public payable onlyTenant(_propertyId) whenNotPaused {
        Rental storage rental = rentals[_propertyId];
        // Ensure the rental is pending
        require(rental.status == RentalStatus.Pending, "Rental must be pending");
        // Ensure sufficient payment (rent + deposit)
        require(msg.value >= rental.rentAmount + rental.depositAmount, "Insufficient payment (rent + deposit)");

        // Store the deposit in the contract (for refund later)
        deposits[msg.sender] += rental.depositAmount;

        // Activate the rental
        rental.status = RentalStatus.Active;
        rental.startTime = block.timestamp;
        rental.rentDueDate = block.timestamp + rental.rentInterval;

        // Transfer the rent (not deposit) to the owner
        payable(owner).transfer(rental.rentAmount);

        emit RentPaid(_propertyId, rental.rentAmount, block.timestamp);
        emit RentalStatusChanged(_propertyId, RentalStatus.Active);
    }

    // Pay rent (with late fee handling)
    function payRent(string memory _propertyId) public payable onlyTenant(_propertyId) rentalActive(_propertyId) whenNotPaused {
        Rental storage rental = rentals[_propertyId];
        uint256 totalDue = rental.rentAmount;

        // Check if rent is late and add the late fee
        if (block.timestamp > rental.rentDueDate) {
            rental.status = RentalStatus.Late;
            totalDue += rental.lateFee;
        }

        // Ensure sufficient payment
        require(msg.value >= totalDue, "Insufficient payment for rent and late fee");

        // Update the next rent due date
        rental.rentDueDate += rental.rentInterval;

        // Transfer rent payment to the owner
        payable(owner).transfer(msg.value);

        emit RentPaid(_propertyId, msg.value, block.timestamp);
        emit RentalStatusChanged(_propertyId, rental.status);
    }

    // End the rental and refund the deposit
    function endRental(string memory _propertyId) public onlyOwner rentalActive(_propertyId) whenNotPaused {
        Rental storage rental = rentals[_propertyId];
        rental.status = RentalStatus.Expired;
        rental.endTime = block.timestamp;

        // Refund the deposit to the tenant (if any)
        uint256 deposit = deposits[rental.tenant];
        if (deposit > 0) {
            deposits[rental.tenant] = 0;
            payable(rental.tenant).transfer(deposit);
            emit DepositRefunded(_propertyId, rental.tenant, deposit);
        }

        emit RentalEnded(_propertyId, block.timestamp);
        emit RentalStatusChanged(_propertyId, RentalStatus.Expired);
    }

    // Optional: Allow tenants to view their deposit balance
    function getDeposit(string memory _propertyId) public view onlyTenant(_propertyId) returns (uint256) {
        return deposits[msg.sender];
    }

    // Optional: Allow owner to withdraw funds (e.g., late fees)
    function withdrawFunds() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
    }
}
