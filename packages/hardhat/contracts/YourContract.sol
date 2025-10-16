//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging on local networks. Remove or guard console logs for production.
import "hardhat/console.sol";

/**
 * Student Government Finance Tracker
 * - Records income and expenses with categories and descriptions
 * - Allows owner/admins to record expenses (contract pays out)
 * - Anyone can record an income by sending ETH to the contract via recordIncome
 */
contract YourContract {
    address public immutable owner;

    // Role management
    mapping(address => bool) public admins;

    // Finance transaction structure
    struct FinanceTx {
        uint256 id;
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string category;
        string description;
        bool isExpense; // true = expense (outgoing), false = income (incoming)
    }

    FinanceTx[] public transactions;

    // Events
    event TransactionRecorded(
        uint256 indexed id,
        address indexed from,
        address indexed to,
        uint256 amount,
        bool isExpense,
        string category,
        string description
    );

    event AdminUpdated(address indexed account, bool enabled);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the Owner");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner || admins[msg.sender], "Only admin or owner");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
        admins[_owner] = true;
    }

    // Admin management
    function setAdmin(address account, bool enabled) external onlyOwner {
        admins[account] = enabled;
        emit AdminUpdated(account, enabled);
    }

    // Get number of recorded transactions
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    // Record incoming funds. Sender must send ETH with the call equal to amount.
    function recordIncome(string calldata category, string calldata description) external payable {
        require(msg.value > 0, "Must send ETH for income");

        uint256 id = transactions.length;

        transactions.push(
            FinanceTx({
                id: id,
                from: msg.sender,
                to: address(this),
                amount: msg.value,
                timestamp: block.timestamp,
                category: category,
                description: description,
                isExpense: false
            })
        );

        emit TransactionRecorded(id, msg.sender, address(this), msg.value, false, category, description);
    }

    // Record an expense and transfer funds to the recipient. Only admin/owner can call.
    function recordExpense(
        address payable to,
        uint256 amount,
        string calldata category,
        string calldata description
    ) external onlyAdmin {
        require(amount > 0, "Amount must be > 0");
        require(address(this).balance >= amount, "Insufficient contract balance");

        uint256 id = transactions.length;

        // Perform transfer
        (bool success, ) = to.call{ value: amount }("");
        require(success, "Transfer failed");

        transactions.push(
            FinanceTx({
                id: id,
                from: address(this),
                to: to,
                amount: amount,
                timestamp: block.timestamp,
                category: category,
                description: description,
                isExpense: true
            })
        );

        emit TransactionRecorded(id, address(this), to, amount, true, category, description);
    }

    // Allow owner to withdraw contract balance entirely
    function withdraw() public onlyOwner {
        (bool success, ) = owner.call{ value: address(this).balance }("");
        require(success, "Failed to send Ether");
    }

    // Convenience getter for contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Fallback/receive to accept plain ETH transfers
    receive() external payable {
        // treat plain receives as anonymous income entries
        uint256 id = transactions.length;

        transactions.push(
            FinanceTx({
                id: id,
                from: msg.sender,
                to: address(this),
                amount: msg.value,
                timestamp: block.timestamp,
                category: "anonymous",
                description: "receive() deposit",
                isExpense: false
            })
        );

        emit TransactionRecorded(id, msg.sender, address(this), msg.value, false, "anonymous", "receive() deposit");
    }
}


