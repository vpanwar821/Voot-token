pragma solidity ^0.4.18;

import './helpers/BasicToken.sol';
import './lib/safeMath.sol';

contract DOWToken is BasicToken {

using SafeMath for uint256;

string public name = "DOW";                                   // Name of the token
string public symbol = "dow";                                 // Symbol of the token
uint8 public decimals = 18;                                   // Decimals
uint256 public constant totalSupply = 2000000000 * 10**18;    // Total number of tokens generated
address public founderMultiSigAddress;                        // Multi sign address of founder 

// Notifications
event ChangeFoundersWalletAddress(uint256  _blockTimeStamp, address indexed _foundersWalletAddress);
  
/**
 * @dev Intialize the variabes
 * @param _founderAddress Ethereum Address of the founder
 */
function DOWToken (address _founderAddress) public {
  require(_founderAddress != address(0));
  founderMultiSigAddress = _founderAddress;
  balances[founderMultiSigAddress] = totalSupply;
  Transfer(address(0), founderMultiSigAddress, totalSupply);
}

/**
 * @dev `changeFounderMultiSigAddress` is used to change the founder's address
 * @param _newFounderMultiSigAddress New ethereum address of the founder 
 */   
function changeFounderMultiSigAddress(address _newFounderMultiSigAddress) public {
  require(_newFounderMultiSigAddress != address(0));
  require(msg.sender == founderMultiSigAddress);
  founderMultiSigAddress = _newFounderMultiSigAddress;
  ChangeFoundersWalletAddress(now, founderMultiSigAddress);
}

}