// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PaymentRequest
 * @dev A contract for creating and managing payment requests between addresses
 * @notice This contract allows users to request payments from specific addresses
 */
contract PaymentRequest {
    
    // Custom errors (more gas efficient than require strings)
    error RequestNotFound();
    error Unauthorized();
    error AlreadyPaid();
    error AlreadyCancelled();
    error InvalidAmount();
    error InvalidPayer();
    error RequestExpired();
    error PaymentFailed();
    error InsufficientPayment();

    // Payment request statuses
    enum RequestStatus {
        Pending,
        Paid,
        Cancelled,
        Expired
    }

    // Payment request structure
    struct Request {
        uint256 id;
        address payable requester;  // Who is requesting payment
        address payer;              // Who should pay
        uint256 amount;             // Amount in wei
        uint256 deadline;           // Timestamp deadline (0 = no deadline)
        RequestStatus status;
        uint256 paidAt;            // Timestamp when paid
        string description;         // Optional description/memo
    }

    // State variables
    uint256 private nextRequestId;
    mapping(uint256 => Request) public requests;
    mapping(address => uint256[]) private requesterRequests;  // Requests created by an address
    mapping(address => uint256[]) private payerRequests;      // Requests assigned to an address

    // Events
    event RequestCreated(
        uint256 indexed requestId,
        address indexed requester,
        address indexed payer,
        uint256 amount,
        uint256 deadline,
        string description
    );

    event RequestPaid(
        uint256 indexed requestId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );

    event RequestCancelled(
        uint256 indexed requestId,
        address indexed requester,
        uint256 timestamp
    );

    /**
     * @dev Create a new payment request
     * @param _payer Address that should make the payment
     * @param _amount Amount to request in wei
     * @param _deadline Unix timestamp deadline (0 for no deadline)
     * @param _description Optional description of the payment request
     * @return requestId The ID of the created request
     */
    function createRequest(
        address _payer,
        uint256 _amount,
        uint256 _deadline,
        string calldata _description
    ) external returns (uint256 requestId) {
        if (_payer == address(0)) revert InvalidPayer();
        if (_amount == 0) revert InvalidAmount();
        if (_deadline != 0 && _deadline <= block.timestamp) revert RequestExpired();

        requestId = nextRequestId++;

        Request storage newRequest = requests[requestId];
        newRequest.id = requestId;
        newRequest.requester = payable(msg.sender);
        newRequest.payer = _payer;
        newRequest.amount = _amount;
        newRequest.deadline = _deadline;
        newRequest.status = RequestStatus.Pending;
        newRequest.description = _description;

        // Track requests
        requesterRequests[msg.sender].push(requestId);
        payerRequests[_payer].push(requestId);

        emit RequestCreated(
            requestId,
            msg.sender,
            _payer,
            _amount,
            _deadline,
            _description
        );
    }

    /**
     * @dev Pay a pending payment request
     * @param _requestId The ID of the request to pay
     */
    function payRequest(uint256 _requestId) external payable {
        Request storage request = requests[_requestId];
        
        if (request.requester == address(0)) revert RequestNotFound();
        if (msg.sender != request.payer) revert Unauthorized();
        if (request.status != RequestStatus.Pending) {
            if (request.status == RequestStatus.Paid) revert AlreadyPaid();
            if (request.status == RequestStatus.Cancelled) revert AlreadyCancelled();
            revert RequestExpired();
        }
        if (request.deadline != 0 && block.timestamp > request.deadline) {
            request.status = RequestStatus.Expired;
            revert RequestExpired();
        }
        if (msg.value < request.amount) revert InsufficientPayment();

        // Effects: Update state before external call
        request.status = RequestStatus.Paid;
        request.paidAt = block.timestamp;

        emit RequestPaid(_requestId, msg.sender, request.amount, block.timestamp);

        // Interactions: External call last (Checks-Effects-Interactions pattern)
        (bool success, ) = request.requester.call{value: request.amount}("");
        if (!success) revert PaymentFailed();

        // Refund excess payment if any
        if (msg.value > request.amount) {
            uint256 refund = msg.value - request.amount;
            (bool refundSuccess, ) = payable(msg.sender).call{value: refund}("");
            if (!refundSuccess) revert PaymentFailed();
        }
    }

    /**
     * @dev Cancel a pending payment request (only by requester)
     * @param _requestId The ID of the request to cancel
     */
    function cancelRequest(uint256 _requestId) external {
        Request storage request = requests[_requestId];
        
        if (request.requester == address(0)) revert RequestNotFound();
        if (msg.sender != request.requester) revert Unauthorized();
        if (request.status != RequestStatus.Pending) {
            if (request.status == RequestStatus.Paid) revert AlreadyPaid();
            revert AlreadyCancelled();
        }

        request.status = RequestStatus.Cancelled;

        emit RequestCancelled(_requestId, msg.sender, block.timestamp);
    }

    /**
     * @dev Get all request IDs created by an address
     * @param _requester The requester address
     * @return Array of request IDs
     */
    function getRequesterRequests(address _requester) external view returns (uint256[] memory) {
        return requesterRequests[_requester];
    }

    /**
     * @dev Get all request IDs assigned to a payer
     * @param _payer The payer address
     * @return Array of request IDs
     */
    function getPayerRequests(address _payer) external view returns (uint256[] memory) {
        return payerRequests[_payer];
    }

    /**
     * @dev Get full details of a request
     * @param _requestId The request ID
     * @return The request struct
     */
    function getRequest(uint256 _requestId) external view returns (Request memory) {
        if (requests[_requestId].requester == address(0)) revert RequestNotFound();
        return requests[_requestId];
    }

    /**
     * @dev Check if a request is expired
     * @param _requestId The request ID
     * @return True if expired
     */
    function isExpired(uint256 _requestId) external view returns (bool) {
        Request storage request = requests[_requestId];
        if (request.requester == address(0)) revert RequestNotFound();
        
        return request.deadline != 0 && 
               block.timestamp > request.deadline && 
               request.status == RequestStatus.Pending;
    }

    /**
     * @dev Get the current request ID counter
     * @return The next request ID that will be created
     */
    function getNextRequestId() external view returns (uint256) {
        return nextRequestId;
    }
}
