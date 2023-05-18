import { ethers } from "hardhat";

async function main() {
  const ERC20 = await ethers.getContractFactory("MockErc20");
  const erc20 = await ERC20.deploy("Test Token", "TST", 18);

  console.log(
    `Token deployed to ${erc20.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
