// SampleContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IAIOracle {
    /// @notice AICallbackRequest without DA for compatibling with old version
    event AICallbackRequest(
        address indexed account,
        uint256 indexed requestId,
        uint256 modelId,
        bytes input,
        address callbackContract,
        uint64 gasLimit,
        bytes callbackData
    );

    /// @notice Event emitted upon receiving a callback request through requestCallback.
    event AICallbackRequest(
        address indexed account,
        uint256 indexed requestId,
        uint256 modelId,
        bytes input,
        address callbackContract,
        uint64 gasLimit,
        bytes callbackData,
        DA inputDA,
        DA outputDA,
        uint256 batchSize
    );

    /// @notice Event emitted when the result is uploaded or update.
    event AICallbackResult(
        address indexed account,
        uint256 indexed requestId,
        address invoker,
        bytes output
    );

    /**
     * initiate a request in OAO
     * @param modelId ID for AI model
     * @param input input for AI model
     * @param callbackContract address of callback contract
     * @param gasLimit gas limitation of calling the callback function
     * @param callbackData optional, user-defined data, will send back to the callback function
     * @return requestID
     */
    function requestCallback(
        uint256 modelId,
        bytes memory input,
        address callbackContract,
        uint64 gasLimit,
        bytes memory callbackData
    ) external payable returns (uint256);

    /**
     * initiate a request in OAO with DA
     * @param modelId ID for AI model
     * @param input input for AI model
     * @param callbackContract address of callback contract
     * @param gasLimit gas limitation of calling the callback function
     * @param callbackData optional, user-defined data, will send back to the callback function
     * @param inputDA DA of input
     * @param outputDA DA of output
     * @return requestID
     */
    function requestCallback(
        uint256 modelId,
        bytes memory input,
        address callbackContract,
        uint64 gasLimit,
        bytes memory callbackData,
        DA inputDA,
        DA outputDA
    ) external payable returns (uint256);

    /**
     * initiate a request in OAO with batch size
     * @param batchSize batch size
     * @param modelId ID for AI model
     * @param input input for AI model
     * @param callbackContract address of callback contract
     * @param gasLimit gas limitation of calling the callback function
     * @param callbackData optional, user-defined data, will send back to the callback function
     * @param inputDA DA of input
     * @param outputDA DA of output
     * @return requestID
     */
    function requestBatchInference(
        uint256 batchSize,
        uint256 modelId,
        bytes memory input,
        address callbackContract,
        uint64 gasLimit,
        bytes memory callbackData,
        DA inputDA,
        DA outputDA
    ) external payable returns (uint256);

    function estimateFee(uint256 modelId, uint256 gasLimit) external view returns (uint256);
    function estimateFeeBatch(uint256 modelId, uint256 gasLimit, uint256 batchSize) external view returns (uint256);
    function getModel(uint256 modelId) external view returns (
        bytes32 modelHash,
        bytes32 programHash,
        uint256 fee,
        address receiver,
        uint256 receiverPercentage,
        uint256 accumulateRevenue,
        address token,
        bool unverifiable
    );
    function isFinalized(uint256 requestId) external view returns (bool);

    enum DA {
        Calldata,
        Blob,
        IPFS
    }
    
    enum AIOracleError {
        InvalidInput, // the input data can't be parsed due to wrong format
        InvalidBatchSize // batchSize can't cover actual batch inference number
    }

    // In the AIOracle contract, this event should also be emitted. 
    // This allows Dune(or any other tool) to receive the Confirm event without additional modifications 
    // when the opml contract address is updated.
    event Confirm(address indexed user, uint256 requestId, bytes32 responseHash);
}