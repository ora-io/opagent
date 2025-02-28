// deploy.ts
import { ethers, run } from "hardhat";
import fs from "fs";
import path from "path";

// Path to the JSON config file
const configFilePath = "config/deploy-config.json";

// Helper: Read the JSON configuration
function readConfig() {
  const configRaw = fs.readFileSync(configFilePath, "utf8");
  return JSON.parse(configRaw);
}

// Helper: Update the JSON configuration file
function updateConfig(config: any) {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

// Get the first signer
async function getFirstSigner() {
  return (await ethers.getSigners())[0];
}

// Deploy the Utils library if not already deployed
async function deployUtilsLib(): Promise<string> {
  const config = readConfig();
  if (config.utilsLibAddr && config.utilsLibAddr !== "") {
    console.log("Using existing Utils library deployed at:", config.utilsLibAddr);
    return config.utilsLibAddr;
  }
  const signer = await getFirstSigner();
  const factory = await ethers.getContractFactory("Utils", { signer });
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("Utils library deployed to:", address);
  // Save the deployed address into the config file
  config.utilsLibAddr = address;
  updateConfig(config);
  return address;
}

// Deploy the OPAgent contract if not already deployed
async function deployOPAgent(utilsLibAddr: string): Promise<any> {
  const config = readConfig();
  if (config.opAgentContract && config.opAgentContract !== "") {
    console.log("Using existing OPAgent contract deployed at:", config.opAgentContract);
    // Optionally return a contract instance from the stored address
    // return config.opAgentContract;
    return await ethers.getContractAt(config.contractName, config.opAgentContract);
  }
  const signer = await getFirstSigner();
  const factory = await ethers.getContractFactory(config.contractName, {
    signer,
    libraries: {
      Utils: utilsLibAddr,
    },
  });
  const contract = await factory.deploy(
    config.aiOracleAddress,
    config.modelName,
    config.systemPrompt
  );
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`${config.contractName} deployed to:`, address);
  // Save the deployed contract address into the config file
  config.opAgentContract = address;
  updateConfig(config);
  return await ethers.getContractAt(config.contractName, config.opAgentContract);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyContract() {
  // Read the latest config to check verification status
  const config = readConfig();

  // Only verify if not already verified
  if (!config.isVerified) {
    console.log("Waiting for confirmations before verification...");
    // Wait for several confirmations to ensure the deployment is propagated
    // await opAgentContract.deployTransaction.wait(6);
    await sleep(3000);
    try {
      await run("verify:verify", {
        address: config.opAgentContract,
        constructorArguments: [config.aiOracleAddress, config.modelName, config.systemPrompt],
        libraries: {
          Utils: config.utilsLibAddr,
        },
        contract: "contracts/examples/" + config.contractName + ".sol:" + config.contractName,
      });
      console.log("Contract verified successfully!");
      config.isVerified = true;
      updateConfig(config);
    } catch (error) {
      console.error("Verification error:", error);
    }
  } else {
    console.log("Contract is already verified.");
  }
}

async function register() {
  const config = readConfig();

  if (config.hasRegistered) {
    console.log("Already registered, skipping registration step.");
    return;
  }

  // Get the deployed opAgent contract instance from the config
  const opAgent = await ethers.getContractAt(config.contractName, config.opAgentContract);
  
  // Check if registerHash has been updated (i.e. not equal to the zero hash)
  const registerHash0 = await opAgent.registerHash();
  const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  if (registerHash0 !== zeroHash) {
    console.log("Already registered, registerHash:", registerHash0);
    // Update config file to mark registration as complete and store the registerHash
    config.hasRegistered = true;
    config.registerHash = registerHash0;
    updateConfig(config);
    return;
  } 

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

  // Call the registration function with the fee value sent as msg.value
  console.log("Calling opAgentRegister...");
  const tx = await opAgent.opAgentRegister({ value: callbackGasFee });
  await tx.wait();
  console.log("opAgentRegister tx hash:", tx.hash);

  // Wait 120 seconds to allow the registration process to update the registerHash
  console.log("Waiting 120 seconds for registration to complete...");
  await new Promise((resolve) => setTimeout(resolve, 120000));

  // Check if registerHash has been updated (i.e. not equal to the zero hash)
  const registerHash = await opAgent.registerHash();
  // const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  if (registerHash !== zeroHash) {
    console.log("Registration successful, registerHash:", registerHash);
    // Update config file to mark registration as complete and store the registerHash
    config.hasRegistered = true;
    config.registerHash = registerHash;
    updateConfig(config);
  } else {
    console.log("Registration failed: registerHash is still zero.");
  }

  return tx.hash;
}

// Main deployment function
async function main() {

  // Deploy or use existing Utils library
  const utilsLibAddr = await deployUtilsLib();

  // Deploy or use existing OPAgent contract
  const opAgentContract = await deployOPAgent(utilsLibAddr);

  // Wait 30 seconds to allow the contract to be verified
  console.log("Waiting 30 seconds for contract to be verified...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  await verifyContract();

  // Wait 10 seconds to allow the contract to be registered
  console.log("Waiting 10 seconds for contract to be registered...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  await register();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
