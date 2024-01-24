const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying Solar System upgradeable NFT contract with the account: ${deployer.address}`
  );

  const SolarSytemNft = await ethers.getContractFactory(
    "SolarSystemNftMinting"
  );
  const solarSytemNft = await upgrades.deployProxy(SolarSytemNft, {
    initializer: "initialize",
  });

  await solarSytemNft.deployed();
  console.log(
    `Solar System upgradeable NFT contract deployed to the address: ${solarSytemNft.address}`
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
