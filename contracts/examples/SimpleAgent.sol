// SampleContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../OPAgent.sol";

contract SimpleAgent is OPAgent {

  /// @notice Initialize the contract, binding it to a specified AIOracle contract
  constructor(IAIOracle _aiOracle, string memory _modelName, string memory _systemPrompt) OPAgent(_aiOracle, _modelName, _systemPrompt) {}

}