// onchainChat.ts
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Path to your JSON config file
const configFilePath = "config/deploy-config.json";

// Helper function to read the JSON configuration
function readConfig() {
  const configRaw = fs.readFileSync(configFilePath, "utf8");
  return JSON.parse(configRaw);
}

async function main() {
  // Read configuration parameters
  const config = readConfig();
  if (!config.opAgentContract || config.opAgentContract === "") {
    console.error("OPAgent contract address not found in config file.");
    process.exit(1);
  }

  const prompt: string = process.env.PROMPT ? process.env.PROMPT : "hello";
  // Optional gasLimit (default to 0 so that the contract uses its default value)
  const gasLimit = 0;

  // Get the deployed OPAgent contract instance using its ABI and address from config.
  const opAgent = await ethers.getContractAt(config.contractName, config.opAgentContract);

  // Use the function to fetch the token address and fee required for registration
  const [token, fee] = await opAgent.estimateERC20ModelFee();

  // Get the callback gas fee
  const callbackGasFee = await opAgent.estimateFee();

  // Define the zero address constant
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  if (token !== zeroAddress) {
    // If the model fee is in ERC20 tokens, approve the opAgent to spend the fee amount
    const tokenContract = await ethers.getContractAt("IERC20", token);
    console.log("Approving ERC20 token spending for fee:", fee.toString());
    const approveTx = await tokenContract.approve(opAgent.target, fee);
    await approveTx.wait();
    console.log("Token approval successful.");
  }

  console.log(`Calling singleChat with prompt: "${prompt}", gasLimit: ${gasLimit}`);

  // Call the singleChat method (it is payable so we attach the value if provided)
  const tx = await opAgent.singleChat(prompt, gasLimit, { value: callbackGasFee });
  console.log("Transaction submitted, waiting for confirmation...");
  await tx.wait();
  console.log("Transaction confirmed. Tx hash:", tx.hash);

  // Listen for the OPAgentChatResponse event
  opAgent.once("OPAgentChatResponse", (requestId: ethers.BigNumber, message: string) => {
    console.log(`Received chat response - Request ID: ${requestId.toString()}, Message: "${message}"`);
  });

  // Optionally, handle a timeout to ensure the script doesn't hang indefinitely
  setTimeout(() => {
    console.log("No response received within timeout.");
    process.exit(1);
  }, 60000); // Timeout after 60 seconds (you can adjust the duration)
}

main().catch((error) => {
  console.error("Error in onchainChat:", error);
  process.exitCode = 1;
});
