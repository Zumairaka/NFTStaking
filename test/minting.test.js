require("@openzeppelin/hardhat-upgrades");

const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { constants } = require("@openzeppelin/test-helpers");

describe("NFTMinting", () => {
  let admin, add1, add2, NFTMinting, nftMinting;

  beforeEach(async () => {
    // initialize the signers
    [admin, add1, add2, _] = await ethers.getSigners();

    // deploy the contract using proxy
    NFTMinting = await ethers.getContractFactory("SolarSystemNftMinting");
    nftMinting = await upgrades.deployProxy(NFTMinting, {
      initializer: "initialize",
    });
    await nftMinting.deployed();
  });

  describe("Owner", () => {
    it("Should set the right owner", async () => {
      expect(await nftMinting.owner()).to.equal(admin.address);
    });
  });

  describe("Add Nominee", () => {
    it("Should revert if the txn is not by the owner", async () => {
      await expect(
        nftMinting.connect(add2).addNominee(add1.address)
      ).to.be.revertedWith("SolarSystemNft: Not owner");
    });

    it("Should revert if the nominee address is zero address", async () => {
      await expect(
        nftMinting.connect(admin).addNominee(constants.ZERO_ADDRESS)
      ).to.be.revertedWith("SolarSystemNft: Zero address");
    });

    it("Should revert if the nominee is same as the owner", async () => {
      await expect(
        nftMinting.connect(admin).addNominee(admin.address)
      ).to.be.revertedWith("SolarSystemNft: Owner cannot be a nominee");
    });

    it("Should revert if the nominee is same as before", async () => {
      await nftMinting.connect(admin).addNominee(add1.address);

      await expect(
        nftMinting.connect(admin).addNominee(add1.address)
      ).to.be.revertedWith("SolarSystemNft: Already a nominee");
    });

    it("Should add nominee by the owner", async () => {
      await nftMinting.connect(admin).addNominee(add1.address);
      expect(await nftMinting.nominee()).to.equal(add1.address);
    });
  });

  describe("Accept Nomination", () => {
    it("Should revert if the caller is not nominee", async () => {
      await nftMinting.connect(admin).addNominee(add1.address);
      await expect(
        nftMinting.connect(add2).acceptNomination()
      ).to.be.revertedWith("SolarSystemNft: Not nominee");
    });

    it("Should change the owner upon accepting nomination by the nominee", async () => {
      await nftMinting.connect(admin).addNominee(add1.address);

      await expect(nftMinting.connect(add1).acceptNomination())
        .to.emit(nftMinting, "OwnerChanged")
        .withArgs(add1.address);
      expect(await nftMinting.owner()).to.equal(add1.address);
    });
  });

  describe("Set Solar System NFT Uri", () => {
    it("Should revert if the txn is not by the owner", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      await expect(
        nftMinting.connect(add1).setSolarSystemNftUri(uri)
      ).to.be.revertedWith("SolarSystemNft: Not owner");
    });

    it("Should revert if the uri is invalid", async () => {
      let uri = "";

      await expect(
        nftMinting.connect(admin).setSolarSystemNftUri(uri)
      ).to.be.revertedWith("SolarSystemNft: Invalid uri");
    });

    it("Should revert if the uri already exist for an nft", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      await nftMinting.connect(admin).setSolarSystemNftUri(uri);
      await expect(
        nftMinting.connect(admin).setSolarSystemNftUri(uri)
      ).to.be.revertedWith("SolarSystemNft: Nft uri exist");
    });

    it("Should set the uri for the planetId properly", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      let result = await nftMinting.connect(admin).setSolarSystemNftUri(uri);
      let data = await result.wait();
      let tokenId = data.events[0].args.tokenId;

      expect(tokenId).to.equal(1);
      expect(data.events[0].args.uri).to.equal(uri);

      expect(await nftMinting.uri(tokenId)).to.equal(uri);
      expect(await nftMinting.tokenId(uri)).to.equal(tokenId);
    });
  });

  describe("Mint NFT", () => {
    it("Should revert if the txn is not by the owner", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      //set uri
      let result = await nftMinting.connect(admin).setSolarSystemNftUri(uri);
      let data = await result.wait();
      let tokenId = data.events[0].args.tokenId;

      // mint nft
      await expect(
        nftMinting.connect(add1).mintNft(add1.address, uri, 5)
      ).to.be.revertedWith("SolarSystemNft: Not owner");
    });

    it("Should revert if the account is a zero address", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      //set uri
      let result = await nftMinting.connect(admin).setSolarSystemNftUri(uri);
      let data = await result.wait();
      let tokenId = data.events[0].args.tokenId;

      // mint nft
      await expect(
        nftMinting.connect(admin).mintNft(constants.ZERO_ADDRESS, uri, 5)
      ).to.be.revertedWith("SolarSystemNft: Zero address");
    });

    it("Should revert if the amount is zero", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      let result = await nftMinting.connect(admin).setSolarSystemNftUri(uri);
      let data = await result.wait();
      let tokenId = data.events[0].args.tokenId;

      // mint nft
      await expect(
        nftMinting.connect(admin).mintNft(add1.address, uri, 0)
      ).to.be.revertedWith("SolarSystemNft: Amount is zero");
    });

    it("Should create tokenId if the uri does not exist and then mint the Nft", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      // mint nft
      await expect(nftMinting.connect(admin).mintNft(add1.address, uri, 5))
        .to.emit(nftMinting, "MintedSolarSystemNft")
        .withArgs(add1.address, 1, uri, 5);

      let tokenId = await nftMinting.tokenId(uri);

      expect(tokenId).to.equal(1);
      expect(await nftMinting.totalSupply(tokenId)).to.equal(5);
      expect(await nftMinting.balanceOf(add1.address, tokenId)).to.equal(5);
    });

    it("Should mint the nft if the tokenId already exist", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      //set uri
      let result = await nftMinting.connect(admin).setSolarSystemNftUri(uri);
      let data = await result.wait();
      let tokenId = data.events[0].args.tokenId;

      // mint nft
      await expect(nftMinting.connect(admin).mintNft(add1.address, uri, 5))
        .to.emit(nftMinting, "MintedSolarSystemNft")
        .withArgs(add1.address, tokenId, uri, 5);
      await expect(nftMinting.connect(admin).mintNft(add1.address, uri, 6))
        .to.emit(nftMinting, "MintedSolarSystemNft")
        .withArgs(add1.address, tokenId, uri, 6);
      await expect(nftMinting.connect(admin).mintNft(add2.address, uri, 9))
        .to.emit(nftMinting, "MintedSolarSystemNft")
        .withArgs(add2.address, tokenId, uri, 9);

      expect(await nftMinting.totalSupply(tokenId)).to.equal(20);
      expect(await nftMinting.balanceOf(add1.address, tokenId)).to.equal(11);
      expect(await nftMinting.balanceOf(add2.address, tokenId)).to.equal(9);
    });
  });

  describe("Burn NFT", () => {
    it("Should revert if the txn is not by the owner", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      // mint nft
      await nftMinting.connect(admin).mintNft(admin.address, uri, 5);

      let tokenId = nftMinting.tokenId(uri);

      // burn token
      await expect(
        nftMinting.connect(add1).burnNft(tokenId, 3)
      ).to.revertedWith("SolarSystemNft: Not owner");
    });

    it("Should revert if the amount is zero", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      // mint nft
      await nftMinting.connect(admin).mintNft(admin.address, uri, 5);

      let tokenId = nftMinting.tokenId(uri);

      // burn token
      await expect(
        nftMinting.connect(admin).burnNft(tokenId, 0)
      ).to.revertedWith("SolarSystemNft: Amount is zero");
    });

    it("Should revert if the tokenId does not exist", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      // mint nft
      await nftMinting.connect(admin).mintNft(admin.address, uri, 5);

      let tokenId = nftMinting.tokenId(uri);

      // burn token
      await expect(nftMinting.connect(admin).burnNft(2, 2)).to.revertedWith(
        "SolarSystemNft: TokenId does not exist"
      );
    });

    it("Should revert if there is not enough balance", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      // mint nft
      await nftMinting.connect(admin).mintNft(admin.address, uri, 5);

      let tokenId = nftMinting.tokenId(uri);

      // burn token
      await expect(
        nftMinting.connect(admin).burnNft(tokenId, 6)
      ).to.revertedWith("SolarSystemNft: Insufficient balance to burn");
    });

    it("Should burn the nft properly", async () => {
      let uri =
        "https://arweave.net/eR4wgSnWusIG-xF2BZzsiOwVehQsvfCT8VAUC4NHQ5Y";

      // mint nft
      await nftMinting.connect(admin).mintNft(admin.address, uri, 5);

      let tokenId = await nftMinting.tokenId(uri);

      // burn token
      await expect(nftMinting.connect(admin).burnNft(tokenId, 3))
        .to.emit(nftMinting, "BurntSolarSystemNft")
        .withArgs(admin.address, tokenId, 3);

      expect(await nftMinting.balanceOf(admin.address, tokenId)).to.equal(2);
      expect(await nftMinting.totalSupply(tokenId)).to.equal(2);
    });
  });
});
