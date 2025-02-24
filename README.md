# OPAgent: Onchain Perpetual Agent

![image](/image/ora-sun.png)

To gain a deeper understanding of the OP Agent's design, please refer to [this article](./article.md).

## Prerequisites

Prepare your environment:
```shell
cp .env.example .env
```
Then, update the `.env` file with your own values.
```shell
PRIVATE_KEY=xx
BASE_MAINNET_RPC=xx
ETHERSCAN_API_KEY=xx
ORA_API_KEY=xx
```
You can get your `ORA_API_KEY` from [here](https://rms.ora.io/).

## Customize your opAgent

Each opAgent corresponds to a smart contract on the blockchain. Take `contracts/examples/SimpleAgent.sol` as an example. 
By inheriting from `OPAgent.sol`, you can get a very simple opAgent onchain.
```js
contract SimpleAgent is OPAgent {

  /// @notice Initialize the contract, binding it to a specified AIOracle contract
  constructor(IAIOracle _aiOracle, string memory _modelName, string memory _systemPrompt) OPAgent(_aiOracle, _modelName, _systemPrompt) {}

}
```
In op agent framework, we support highly customized onchain actions. So you can customize your op agent onchain action by writing any solidity function with the `onlyOPAgentCallback` modifier. In this way, we can support various of onchain actions of the opAgent such as trading on DEX, transfering token, and even deploying a new contract.

Take `contracts/examples/TransferAgent.sol` as an example. It inherits from `OPAgent.sol` and implements the `transferETH` function. When the opAgent calls the `transferETH` function, it will transfer the specified amount of ETH to the specified address.

```js
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
```


There are some examples of opAgent shown in `contracts/examples`.

When you customize your opAgent, you need to specify the contract name in the `contractName` field of the `deploy-config.json` file. The contract name should be the same as the file name of the solidity contract. And the solidity contract should be located in the `contracts/examples` folder.

## Deploy your opAgent

Prepare the configuration file `deploy-config.json` in the `config` folder.

```shell
cp config/deploy-config.example.json config/deploy-config.json
```
Fill in the `deploy-config.json` file with your own values.
```shell
{
  "network": "base",
  "aiOracleAddress": "0x0A0f4321214BB6C7811dD8a71cF587bdaF03f0A0",
  "modelName": "ora/opagent",
  "systemPrompt": "Your system prompt here",
  "contractName": "SimpleAgent",
  "utilsLibAddr": "",
  "opAgentContract": "",
  "isVerified": false
}
```

- network: the blockchain network to deploy your opAgent. We only support `base` now. Don't change it.
- aiOracleAddress: the address of the AI Oracle contract. Don't change it.
- modelName: the name of the model. We only support `ora/opagent` now. Don't change it.
- systemPrompt: the system prompt for the model. You can customize it. If you don't want to customize it, you can leave it empty as "".
- contractName: the name of your contract.
- utilsLibAddr: the address of the utils library. If you want to deploy one by yourself, you can leave it empty as "". If you want to use the default utils library, you can leave it as "0xD06CEfaE49f5c92733Bb4dcF1a7b20482E3D2AE3".
- opAgentContract: the address of your opAgent contract. If you have not deployed it, you can leave it empty as "". After deployment, we will automatically update it.
- isVerified: whether the opAgent is verified. If you not sure whether it is verified, you should leave it as false.

After the configuration file is prepared, you can create your opAgent by running the following command:
```shell
npx hardhat run scripts/createAgent.ts 
```

## On-chain chat

The on-chat chatting functionality is supported by OAO (Onchain AI Oracle). You can learn more about OAO from [here](https://github.com/ora-io/OAO). You can chat with your opAgent on-chain by calling the `singleChat` function in the OPAgent contract.
```js
  function singleChat(
    string calldata prompt,
    uint64 gaslimit
  ) external payable;
```
The opAgent will respond back through `aiOracleCallback` function. By default, it will call the following function to respond back to the user:
```js
function chatRespond(
  uint256 requestId,
  string calldata message
) public virtual onlyOPAgentCallback {
  emit OPAgentChatResponse(requestId, message);
}
```
When the opAgent responds with function calling, it will trigger the customized onchain action of the opAgent.

Here is a simple script for you to chat with your opAgent using OAO:
```shell
PROMPT="hello" npx hardhat run scripts/onchainChat.ts 
```

## Off-chain chat

The off-chain chatting functionality is supported by RMS (Resilient Model Services). You can learn more about RMS from [here](https://rms.ora.io/). For the off-chain chatting, you can get the response by the following command:
```shell
curl -X POST "https://api.ora.io/v1/agents/chat" \
  -H "Authorization: Bearer $ORA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ora/opagent",
    "messages": [{"role": "user", "content": "who are you?"}],
    "registerHash": $registerHash,
    "contractAddress": $opAgentContract
  }'
```
Here is a simple script for you to chat with your opAgent through RMS:
```shell
npx ts-node ./scripts/offchainChat.ts "who are you?"
```