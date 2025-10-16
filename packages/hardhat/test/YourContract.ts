import { expect } from "chai";
import { ethers } from "hardhat";
import { YourContract } from "../typechain-types";

describe("YourContract (Finance Tracker)", function () {
  let yourContract: YourContract;
  let owner: any;
  let other: any;

  before(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    other = signers[1] ?? signers[0];

    const yourContractFactory = await ethers.getContractFactory("YourContract");
    yourContract = (await yourContractFactory.deploy(owner.address)) as YourContract;
    await yourContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the owner correctly", async function () {
      expect(await yourContract.owner()).to.equal(owner.address);
    });

    it("Should record income and expense and update balances and counts", async function () {
      // Owner records income (payable)
      const depositTx = await yourContract.connect(owner).recordIncome("Donation", "Initial donation", {
        value: ethers.parseEther("1"),
      });
      await depositTx.wait();

      expect(await yourContract.getBalance()).to.equal(ethers.parseEther("1"));
      expect(await yourContract.getTransactionCount()).to.equal(1);

      // Record an expense to `other`
      const expenseTx = await yourContract
        .connect(owner)
        .recordExpense(other.address, ethers.parseEther("0.5"), "Event", "Refreshments");
      await expenseTx.wait();

      expect(await yourContract.getBalance()).to.equal(ethers.parseEther("0.5"));
      expect(await yourContract.getTransactionCount()).to.equal(2);
    });
  });
});
