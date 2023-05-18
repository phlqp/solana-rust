import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Claim", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployClaim() {
    const [owner] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("MockErc20");
    const erc20 = await ERC20.deploy("Test Token", "TST", 18);

    const Claim = await ethers.getContractFactory("Claim");
    const claim = await Claim.deploy();

    await claim.setVerifier(owner.address);
    await claim.setToken(erc20.address)
    await erc20.mint(claim.address, ethers.utils.parseEther(
      (await claim.GENERAL()).toString()
    ));

    return { claim, owner, erc20 };
  }

  describe("Deployment", function () {
    it("Should set the signer", async function () {
      const { claim, owner } = await loadFixture(deployClaim);

      expect(await claim.verifier()).to.equal(owner.address);
    });
  });

  describe("Claim", function () {
    it("Should claim", async function () {
      const { claim, owner, erc20 } = await loadFixture(deployClaim);

      // Use address as message to sign by owner
      const message = ethers.utils.solidityKeccak256(
        ["address"],
        [owner.address]
      );
      const signature = await owner.signMessage(ethers.utils.arrayify(message))

      await claim.connect(owner).claim(1, signature, owner.address);

      expect(await erc20.balanceOf(owner.address)).to.equal(
        await claim.GENERAL()
      );
    });
  });
});
