// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

/**
 * @author Digital Trust CSP
 * @notice This smart contract is used to mint the solar system NFTs
 * @dev tokenId and uri for a particualr solar system nft item is unique
 * @dev any accounts can have multiple number of such nfts.
 * @dev anyone can fetch the total supply count for a particular solar system nft item
 * @dev anyone can fetch tokenId of an nft by passing uri and viceversa.
 * @dev owner can mint the nfts
 * @dev owner can set the nft item by passing the uri.
 * @dev if the uri is not set by the owner and if the tokenId does not
 * exist for the uri; then new tokenId will be created before minting the Nft.
 * @dev owner can burn the nfts hold by the owner
 */

contract SolarSystemNftMinting is
    ERC1155Upgradeable,
    ReentrancyGuardUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /* State Variables */
    address private _owner;
    address private _nominee;
    CountersUpgradeable.Counter private _tokenId;

    /* Events */
    event NomineeAdded(address owner, address nominee);
    event OwnerChanged(address newOwner);
    event MintedSolarSystemNft(
        address account,
        uint256 tokenId,
        string uri,
        uint256 amount
    );
    event BurntSolarSystemNft(address account, uint256 tokenId, uint256 amount);
    event SolarSystemNftAdded(uint256 tokenId, string uri);

    /* Modifiers */
    modifier realAddress(address account) {
        require(account != address(0), "SolarSystemNft: Zero address");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "SolarSystemNft: Not owner");
        _;
    }

    /* Mappings */
    // tokenId => uri
    mapping(uint256 => string) private _tokenUris;
    // uri => tokenId
    mapping(string => uint256) private _tokenIds;
    // tokenId => totalSupply
    mapping(uint256 => uint256) private _totalSupply;

    /* Public Functions */

    /**
     * @notice initializer for the upgradeable contract
     */
    function initialize() public initializer realAddress(msg.sender) {
        __ERC1155_init("");
        _owner = msg.sender;
    }

    /**
     * @notice function for retrieving the uris of the tokenIds
     * @dev override the existing function
     * @param tokenId_ tokenId of the solar system nft item
     * @return uri_ of the corresponding tokenId
     */
    function uri(uint256 tokenId_)
        public
        view
        override(ERC1155Upgradeable)
        returns (string memory)
    {
        _checkTokenId(tokenId_);

        return _tokenUris[tokenId_];
    }

    /**
     * @notice function for setting the solar system nft uri
     * @dev only owner can set the uri
     * @dev uris are set corresponding to the tokenId
     * @param uri_ uri string of the new solar system nft
     */
    function setSolarSystemNftUri(string memory uri_)
        public
        onlyOwner
        returns (uint256)
    {
        require(bytes(uri_).length > 0, "SolarSystemNft: Invalid uri");
        require(_tokenIds[uri_] == 0, "SolarSystemNft: Nft uri exist");

        // create tokenId
        _tokenId.increment();
        uint256 tokenId_ = _tokenId.current();

        // set mappings
        _tokenUris[tokenId_] = uri_;
        _tokenIds[uri_] = tokenId_;

        emit SolarSystemNftAdded(tokenId_, uri_);
        return tokenId_;
    }

    /* Public Function Ends */

    /* External Functions */

    /* Owner Functions */
    /**
     * @notice function for adding a nominee
     * @dev this nominee can be the next owner upon accepting the
     * ownership
     * @dev only owner can add this nominee
     * @dev owner cannot be a nominee
     * @param account nominee address
     */
    function addNominee(address account)
        external
        onlyOwner
        realAddress(account)
    {
        require(_owner != account, "SolarSystemNft: Owner cannot be a nominee");
        require(_nominee != account, "SolarSystemNft: Already a nominee");

        emit NomineeAdded(msg.sender, account);
        _nominee = account;
    }

    /**
     * @notice function for minting nft
     * @dev only owner can mint nft to the account specified
     * @dev check the uri if exist; fetch the tokenId.Otherwise set the
     * tokenId for the uri before minting by calling setUri method
     * @param account address to which nfts has to be minted
     * @param uri_ uri for the solar system nft
     * @param amount number of nfts has to be minted
     */
    function mintNft(
        address account,
        string memory uri_,
        uint256 amount
    ) external onlyOwner realAddress(account) nonReentrant {
        _checkAmount(amount);

        // if the nft uri is new; set the uri before minting
        uint256 tokenId_ = _tokenIds[uri_];
        if (tokenId_ == 0) {
            tokenId_ = setSolarSystemNftUri(uri_);
        }

        // increase total supply for the planet
        _totalSupply[tokenId_] += amount;

        // mint the tokens
        emit MintedSolarSystemNft(account, tokenId_, uri_, amount);
        _mint(account, tokenId_, amount, "");
    }

    /**
     * @notice function for burning the nft
     * @dev only owner can call this function
     * @dev nft from owner account willget burned
     * @param tokenId_ tokenId of the nft that has to be burnt
     * @param amount number of nfts to be burnt
     */
    function burnNft(uint256 tokenId_, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        _checkAmount(amount);
        _checkTokenId(tokenId_);
        require(
            balanceOf(msg.sender, tokenId_) >= amount,
            "SolarSystemNft: Insufficient balance to burn"
        );

        // deduct the total supply count for that nft
        _totalSupply[tokenId_] -= amount;

        // burn the tokens
        emit BurntSolarSystemNft(msg.sender, tokenId_, amount);
        _burn(msg.sender, tokenId_, amount);
    }

    /**
     * @notice function for accepting the nomination
     * @dev only the nominee can call this function
     * @dev the ownership will be transferred
     * @dev emits an event OwnerChanged
     */
    function acceptNomination() external {
        require(msg.sender == _nominee, "SolarSystemNft: Not nominee");

        emit OwnerChanged(msg.sender);
        _owner = msg.sender;
    }

    /* Owner Function Ends */

    /**
     * @notice function for retrieving the tokenId for a particualr solar system nft uri
     * @param uri_ uri of the nft
     */
    function tokenId(string memory uri_) external view returns (uint256) {
        require(_tokenIds[uri_] > 0, "SolarSystemNft: TokenUri does not exist");

        return _tokenIds[uri_];
    }

    /**
     * @notice function for getting the total supply of the tokenIds
     * @param tokenId_ tokenId of the planet
     * @return _totalSupply total number of nfts minted for the particular planet
     */
    function totalSupply(uint256 tokenId_) external view returns (uint256) {
        return _totalSupply[tokenId_];
    }

    /**
     * @notice function for returning the owner
     * @dev external function
     * @return _owner current owner address
     */
    function owner() external view returns (address) {
        return _owner;
    }

    /**
     * @notice function for returning the nominee
     * @dev external function
     * @return _nominee current nominee address
     */
    function nominee() external view returns (address) {
        return _nominee;
    }

    /* External Function Ends */

    /* Private Helper Function */

    /**
     * @notice function for checking the amount
     * @param amount amount to be checked
     */
    function _checkAmount(uint256 amount) private pure {
        require(amount > 0, "SolarSystemNft: Amount is zero");
    }

    /**
     * @notice function for checking the tokenId
     * @param tokenId_ amount to be checked
     */
    function _checkTokenId(uint256 tokenId_) private view {
        require(
            bytes(_tokenUris[tokenId_]).length > 0,
            "SolarSystemNft: TokenId does not exist"
        );
    }

    /* Private Helper Function Ends */
}
