import { ethers } from "hardhat";

async function main() {
  const Claim = await ethers.getContractFactory("Claim");
  const claim = await Claim.deploy();
  await claim.deployed();

  console.log(
    `Claim deployed to ${claim.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
