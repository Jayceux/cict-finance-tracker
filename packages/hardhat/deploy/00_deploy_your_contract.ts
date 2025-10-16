import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseEther } from "ethers";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("YourContract", {
    from: deployer,
    // Contract constructor arguments
    args: [deployer],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  // Cast to any to avoid TypeScript complaints about generated methods in local testing
  const yourContract = (await hre.ethers.getContract("YourContract", deployer)) as any;

  console.log("👋 YourContract deployed at:", yourContract.address);

  // Seed contract with dummy data for local development only
  try {
    // Use signers from hre.ethers to get a Signer instance
    const signers = await hre.ethers.getSigners();
    const deployerSigner = signers.find(s => s.address.toLowerCase() === deployer.toLowerCase()) || signers[0];

    // Connect contract to deployer signer
    const contractAsDeployer = yourContract.connect(deployerSigner) as any;

    // Record example incomes by calling recordIncome (must send ETH with the call)
    // These payable calls will fund the contract and create income transaction records.
    const income1 = await contractAsDeployer.recordIncome("Donation", "Student council donation", {
      value: parseEther("1"),
    });
    await income1.wait();

    const income2 = await contractAsDeployer.recordIncome("Sponsorship", "Event sponsor", {
      value: parseEther("0.5"),
    });
    await income2.wait();

    console.log("📥 Recorded two income transactions (contract funded by recordIncome)");

    // Record example expense: send 0.3 ETH to an example recipient (deployer + 1)
    const accounts = await hre.ethers.getSigners();
    const recipient = accounts.length > 1 ? accounts[1].address : deployer;

    const expense1 = await contractAsDeployer.recordExpense(
      recipient,
      parseEther("0.3"),
      "Event",
      "Refreshments for welcome event",
    );
    await expense1.wait();

    console.log("📤 Recorded one expense transaction to", recipient);

    // Generate many random transactions for local testing only
    const chainIdHex = await hre.network.provider.request({ method: "eth_chainId" });
    const isLocal = chainIdHex === "0x7a69" || hre.network.name === "localhost" || hre.network.config.chainId === 31337;
    if (isLocal) {
      console.log("Seeding 1000 randomized transactions for local testing...");
      const random = (min: number, max: number) => Math.random() * (max - min) + min;
      for (let i = 0; i < 1000; i++) {
        try {
          // random amount between 0.001 and 1.0 ETH
          const amt = parseEther(random(0.001, 1.0).toFixed(6));
          // randomly decide income or expense
          if (Math.random() < 0.5) {
            const tx = await contractAsDeployer.recordIncome(`Seed ${i}`, `Auto-seed income ${i}`, { value: amt });
            await tx.wait();
          } else {
            // expense: send to a pseudo-random recipient from signers (wrap around)
            const accounts = await hre.ethers.getSigners();
            const recipientAddr = accounts[(i + 1) % accounts.length].address || deployer;
            const tx = await contractAsDeployer.recordExpense(
              recipientAddr,
              amt,
              `SeedExp ${i}`,
              `Auto-seed expense ${i}`,
            );
            await tx.wait();
          }
        } catch (e) {
          // continue seeding even if some txs fail
          if (i % 100 === 0) console.warn(`seed tx ${i} failed`, e);
        }
      }
      console.log("Done seeding 1000 randomized transactions.");
    }
  } catch (err) {
    console.warn("Could not seed dummy data:", err);
  }
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["YourContract"];
