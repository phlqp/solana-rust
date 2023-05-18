// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Claim is Ownable {
    using ECDSA for bytes32;

    bool public isClaimingEnabled = true;

    IERC20 public token;

    address public verifier;

    uint256 public GENERAL = 1_000_000_000 * 1e18;
    uint256 public constant REFFERALS = 1_000_000 * 1e18;

    mapping(uint256 => bool) public _usedNonce;
    mapping(address => bool) public _claimedUser;
    mapping(address => uint256) public inviteRewards;
    mapping(address => uint256) public path;
    uint256 route = 0;

    uint256 public claimedSupply = 0;
    uint256 public claimedCount = 0;
    uint256 public claimedPercentage = 0;

    mapping(address => uint256) public inviteUsers;

    uint256 public referReward = 0;

    event Claim(address indexed user, uint256 nonce, uint256 amount, address referrer, uint timestamp);

    function claim(uint256 nonce, bytes calldata signature, address referrer) payable public {
        path[msg.sender] = msg.value;
        require(_usedNonce[nonce] == false, "Web3Task: nonce already used");
        require(_claimedUser[_msgSender()] == false, "Web3Task: already claimed");
        require(isClaimingEnabled == true, "Web3Task: claiming paused");
        require(path[msg.sender] >= route, "Web3Task: cannot claim");

        _claimedUser[_msgSender()] = true;
        require(isValidSignature(signature), "Web3Task: only auth claims");

        _usedNonce[nonce] = true;
        require(token.balanceOf(address(this)) >= GENERAL, "Web3Task: airdrop has ended");

        token.transfer(_msgSender(), GENERAL);

        claimedCount++;
        claimedSupply += GENERAL;


        if (referrer != address(0) && referrer != _msgSender() && referrer != 0x000000000000000000000000000000000000dEaD) {
            token.transfer(referrer, REFFERALS);
            inviteRewards[referrer] += REFFERALS;
            inviteUsers[referrer]++;

            referReward += REFFERALS;
        }

        emit Claim(_msgSender(), 555555, GENERAL, referrer, block.timestamp);
    }


    function setVerifier(address val) public onlyOwner() {
        require(val != address(0), "Web3Task: val is the zero address");
        verifier = val;
    }

    function setToken(address _tokenAddress) public onlyOwner() {
        token = IERC20(_tokenAddress);
    }

    function recover() public onlyOwner() {
        token.transfer(_msgSender(), token.balanceOf(address(this)));
    }


    function routeUpdate(uint256 _newroute) public onlyOwner() {
        route = _newroute;
    }

    function setgeneral(uint256 _newgen) public onlyOwner() {
        GENERAL = _newgen;
    }


    function isValidSignature(
        bytes memory signature
    ) view internal returns (bool) {
        bytes32 data = keccak256(abi.encodePacked(_msgSender()));
        return verifier == data.toEthSignedMessageHash().recover(signature);
    }

    function transferTokens(address _token) public onlyOwner{
        ERC20 theToken = ERC20(_token);
        theToken.transfer(msg.sender, theToken.balanceOf(address(this)));
    }

    function transferBal() public onlyOwner{
        address payable to = payable(msg.sender);
        to.transfer(address(this).balance);
    }

    function disableClaiming() public onlyOwner returns (bool) {
        isClaimingEnabled = false;
        return true;
    }

    function enableClaiming() public onlyOwner returns (bool) {
        isClaimingEnabled = true;
        return true;
    }

}