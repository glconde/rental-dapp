// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RentalAgreement {
    address public owner;
    bool public paused;

    enum RentalStatus { Pending, Active, Expired, Late }

    struct Rental {
        string propertyId;
        address tenant;
        uint256 rentAmount;
        uint256 depositAmount;
        uint256 lateFee;
        uint256 rentDueDate;
        uint256 rentInterval;
        RentalStatus status;
        uint256 startTime;
        uint256 endTime;
    }

    mapping(string => Rental) public rentals;
    mapping(address => uint256) public deposits;

    event RentalCreated(string propertyId, address tenant, uint256 rentAmount, uint256 depositAmount);
    event RentPaid(string propertyId, uint256 amount, uint256 timestamp);
    event RentalEnded(string propertyId, uint256 timestamp);
    event DepositRefunded(string propertyId, address tenant, uint256 amount);
    event RentalStatusChanged(string propertyId, RentalStatus newStatus);
    event ContractPaused(bool paused);

    constructor() {
        owner = msg.sender;
        paused = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier onlyTenant(string memory _propertyId) {
        require(msg.sender == rentals[_propertyId].tenant, "Only the tenant can call this function");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier rentalOngoing(string memory _propertyId) {
        RentalStatus s = rentals[_propertyId].status;
        require(s == RentalStatus.Active || s == RentalStatus.Late, "Rental must be active");
        _;
    }

    function setPaused(bool _paused) public onlyOwner {
        paused = _paused;
        emit ContractPaused(_paused);
    }

    function createRental(
        string memory _propertyId,
        address _tenant,
        uint256 _rentAmount,
        uint256 _depositAmount,
        uint256 _lateFee,
        uint256 _rentInterval
    ) public onlyOwner whenNotPaused {
        require(rentals[_propertyId].tenant == address(0), "Property already rented");

        rentals[_propertyId] = Rental({
            propertyId: _propertyId,
            tenant: _tenant,
            rentAmount: _rentAmount,
            depositAmount: _depositAmount,
            lateFee: _lateFee,
            rentDueDate: 0,
            rentInterval: _rentInterval,
            status: RentalStatus.Pending,
            startTime: 0,
            endTime: 0
        });

        emit RentalCreated(_propertyId, _tenant, _rentAmount, _depositAmount);
    }

    function activateRental(string memory _propertyId) public payable onlyTenant(_propertyId) whenNotPaused {
        Rental storage rental = rentals[_propertyId];
        require(rental.status == RentalStatus.Pending, "Rental must be pending");
        require(msg.value >= rental.rentAmount + rental.depositAmount, "Insufficient payment");

        deposits[msg.sender] += rental.depositAmount;

        rental.status = RentalStatus.Active;
        rental.startTime = block.timestamp;
        rental.rentDueDate = block.timestamp + rental.rentInterval;

        payable(owner).transfer(rental.rentAmount);

        emit RentPaid(_propertyId, rental.rentAmount, block.timestamp);
        emit RentalStatusChanged(_propertyId, RentalStatus.Active);
    }

    function payRent(string memory _propertyId) public payable onlyTenant(_propertyId) rentalOngoing(_propertyId) whenNotPaused {
        Rental storage rental = rentals[_propertyId];
        require(block.timestamp >= rental.rentDueDate - rental.rentInterval, "Too early to pay rent");

        uint256 totalDue = rental.rentAmount;

        if (block.timestamp > rental.rentDueDate) {
            rental.status = RentalStatus.Late;
            totalDue += rental.lateFee;
        } else {
            rental.status = RentalStatus.Active;
        }

        require(msg.value >= totalDue, "Insufficient payment");

        //rental.rentDueDate += rental.rentInterval;
        rental.rentDueDate = block.timestamp + rental.rentInterval;

        payable(owner).transfer(msg.value);

        emit RentPaid(_propertyId, msg.value, block.timestamp);
        emit RentalStatusChanged(_propertyId, rental.status);
    }

    function endRental(string memory _propertyId) public onlyOwner whenNotPaused {
        Rental storage rental = rentals[_propertyId];
        require(rental.status == RentalStatus.Active || rental.status == RentalStatus.Late, "Rental must be active or late");

        rental.status = RentalStatus.Expired;
        rental.endTime = block.timestamp;

        uint256 deposit = deposits[rental.tenant];
        if (deposit > 0) {
            deposits[rental.tenant] = 0;
            payable(rental.tenant).transfer(deposit);
            emit DepositRefunded(_propertyId, rental.tenant, deposit);
        }

        emit RentalEnded(_propertyId, block.timestamp);
        emit RentalStatusChanged(_propertyId, RentalStatus.Expired);
    }

    function getDeposit(string memory _propertyId) public view onlyTenant(_propertyId) returns (uint256) {
        return deposits[msg.sender];
    }

    function withdrawFunds() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
    }

    fallback() external {
        revert("Function does not exist");
    }

    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }
}
