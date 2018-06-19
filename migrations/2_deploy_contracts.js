var DOWToken = artifacts.require("./DOWToken.sol");
var founderAddress = 0x627306090abab3a6e1400e9345bc60c78a8bef57;

module.exports = function(deployer) {
  deployer.deploy(DOWToken, founderAddress);
};
