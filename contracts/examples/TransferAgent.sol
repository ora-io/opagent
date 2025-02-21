// SampleContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../OPAgent.sol";

contract TransferAgent is OPAgent {

  event Transfer(uint256 requestId, address to, uint256 amount);

  /// @notice Initialize the contract, binding it to a specified AIOracle contract
  constructor(IAIOracle _aiOracle, string memory _modelName, string memory _systemPrompt) OPAgent(_aiOracle, _modelName, _systemPrompt) {}

  /**
   * This function is called by the OP Agent.
   * It transfers the specified amount of ETH to the specified address.
   *
   * @param requestId uint256, the request ID in AI Oracle
   * @param to address, the address to transfer to
   * @param amount uint256, the amount to transfer
   */
  function transferETH(uint256 requestId, address to, uint256 amount) public onlyOPAgentCallback {
    // transfer ETH to the specified address
    (bool success, ) = to.call{value: amount}("");
    require(success, "Transfer failed");
    emit Transfer(requestId, to, amount);
  }
}