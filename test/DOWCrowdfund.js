const DOWToken = artifacts.require('DOWToken.sol');
const Utils = require('./helpers/Utils');
const BigNumber = require('bignumber.js');
const DOWCrowdfund = artifacts.require('DOWCrowdfund.sol');

let tokenAddress;
let founderMultiSigAddress;
let owner;
let beneficiary;
let devTeamAddress;
let remainingTokenHolder;
let crowdfundAddress;

async function timeJump(timeToInc) {
    return new Promise((resolve, reject) => {
        web3
            .currentProvider
            .sendAsync({
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [(timeToInc)] // timeToInc is the time in seconds to increase
            }, function (err, result) {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
    });
}

contract('DOWCrowdfund', (accounts) => {
    before(async() => {
        remainingTokenHolder = accounts[0];
        founderMultiSigAddress = accounts[1];
        owner = accounts[2];
        beneficiary = accounts[3];
        devTeamAddress = accounts[4];
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        crowdfundAddress = crowdfund.address;
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        tokenAddress = token.address;
    });

    it('verifies parameters', async() => {
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        let _founderAddress = await crowdfund
            .founderMultiSigAddress
            .call();
        assert.equal(_founderAddress, accounts[1]);
        let _remainingTokenHolder = await crowdfund
            .remainingTokenHolder
            .call();
        assert.equal(_remainingTokenHolder, accounts[0]);
    });

    it('ChangeFounderMultiSigAddress: should change the founder multisig', async() => {
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        await crowdfund.ChangeFounderMultiSigAddress(accounts[6], {from: founderMultiSigAddress});
        let _founderAddress = await crowdfund
            .founderMultiSigAddress
            .call();
        assert.equal(_founderAddress, accounts[6]);
    });

    it('ChangeFounderMultiSigAddress: should change the beneficiary -- fail',
    async() => {
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        try {
            await crowdfund.ChangeFounderMultiSigAddress(accounts[6], {from: accounts[8]});
        } catch (error) {
            return Utils.ensureException(error);
        }
    });

    it('setToken:should set the token', async() => {
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        let token = await DOWToken.new(crowdfund.address, founderMultiSigAddress, devTeamAddress, {from: owner});
        await crowdfund.setTokenAddress(token.address, {from: owner});
        let _tokenAddress = await crowdfund
            .token
            .call();
        assert.equal(_tokenAddress, token.address);
    });

    it('setToken:should set the token -- fails called other than owner',
    async() => {
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        let token = await DOWToken.new(crowdfund.address, founderMultiSigAddress, devTeamAddress, {from: owner});

        try {
            await crowdfund.setTokenAddress(token.address, {from: accounts[8]});
        } catch (error) {
            return Utils.ensureException(error);
        }
    });

    it('setToken:should fail when token is already set', async() => {
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        let token = await DOWToken.new(crowdfund.address, founderMultiSigAddress, devTeamAddress, {from: owner});

        await crowdfund.setTokenAddress(token.address, {from: owner});
        let _tokenAddress = await crowdfund
            .token
            .call();
        assert.equal(_tokenAddress, token.address);
        try {
            await crowdfund.setTokenAddress(token.address, {from: owner});
        } catch (error) {
            return Utils.ensureException(error);
        }
    })


    it('jump to the crowdsale time',async()=>{
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        let token = await DOWToken.new(crowdfund.address, founderMultiSigAddress, devTeamAddress, {from: owner});
        let crowdsaleStartTime = await crowdfund
                .crowdfundStartTime
                .call();
        let timestamp = Math.floor(Date.now() / 1000);
        let difference = await Utils.timeDifference(crowdsaleStartTime, timestamp);
        
        await timeJump(Math.floor(difference + 2000));
    
    });


    it('buyTokens: user cannot contribute -- first week -- fails when token is not set',
    async() => {
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        let token = await DOWToken.new(crowdfund.address, founderMultiSigAddress, devTeamAddress, {from: owner});
        try {
            await crowdfund.buyTokens(accounts[8], {
                from: accounts[8],
                gas: 2000000,
                value: new BigNumber(11).times(new BigNumber(10).pow(18))
            });
        } catch (error) {
            return Utils.ensureException(error);
        }
    });



    it('buyTokens: user can contribute', async() => {
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        let token = await DOWToken.new(crowdfund.address, founderMultiSigAddress, devTeamAddress, {from: owner});
        await crowdfund.setTokenAddress(token.address, {from: owner});
        let balanceSoFar = 0;
        let tokenAddress = await crowdfund
            .token
            .call();
        assert.strictEqual(tokenAddress, token.address);
        
        await timeJump(2000);

        await crowdfund.buyTokens(accounts[8], {
            from: accounts[8],
            gas: 2000000,
            value: new BigNumber(1).times(new BigNumber(10).pow(18))
        });
        let _balance = await token
            .balanceOf
            .call(accounts[8]);

        balanceSoFar = _balance.dividedBy(new BigNumber(10).pow(18)).toNumber();
        assert.strictEqual(_balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 3000);
        let DOWSold = await crowdfund
            .totalDowSold
            .call();
        assert.strictEqual(DOWSold.dividedBy(new BigNumber(10).pow(18)).toNumber(), 3000);

        // Second week
        await timeJump(7 * 24 * 60 * 60 + 2000);
        await crowdfund.buyTokens(accounts[8], {
            from: accounts[8],
            gas: 2000000,
            value: new BigNumber(1).times(new BigNumber(10).pow(18))
        });
        _balance = await token
            .balanceOf
            .call(accounts[8]);

        balanceSoFar += 2000
        assert.strictEqual(_balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), balanceSoFar);
        DOWSold = await crowdfund
            .totalDowSold
            .call();
        assert.strictEqual(DOWSold.dividedBy(new BigNumber(10).pow(18)).toNumber(), balanceSoFar);

        // Third week
        await timeJump(7 * 24 * 60 * 60 + 2000);
        await crowdfund.buyTokens(accounts[8], {
            from: accounts[8],
            gas: 2000000,
            value: new BigNumber(1).times(new BigNumber(10).pow(18))
        });
        _balance = await token
            .balanceOf
            .call(accounts[8]);

        balanceSoFar += 1500
        assert.strictEqual(_balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), balanceSoFar);
        DOWSold = await crowdfund
            .totalDowSold
            .call();
        assert.strictEqual(DOWSold.dividedBy(new BigNumber(10).pow(18)).toNumber(), balanceSoFar);

        // Fourth week
        await timeJump(7 * 24 * 60 * 60 + 2000);
        await crowdfund.buyTokens(accounts[8], {
            from: accounts[8],
            gas: 2000000,
            value: new BigNumber(1).times(new BigNumber(10).pow(18))
        });
        _balance = await token
            .balanceOf
            .call(accounts[8]);

        balanceSoFar += 1200
        assert.strictEqual(_balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), balanceSoFar);
        DOWSold = await crowdfund
            .totalDowSold
            .call();
        assert.strictEqual(DOWSold.dividedBy(new BigNumber(10).pow(18)).toNumber(), balanceSoFar);

        // Fifth week -- Failure
        await timeJump(10 * 24 * 60 * 60 + 2000);
        try {
            await crowdfund.buyTokens(accounts[8], {
                from: accounts[8],
                gas: 2000000,
                value: new BigNumber(1).times(new BigNumber(10).pow(18))
            });
        } catch (error) {
            console.log(web3.eth.getBlock('latest').timestamp);
            return Utils.ensureException(error);
            }

    });

    it("endCrowdfund: should transfer the remaining token to the remainingTokenHolder address",
    async()=>{
        let crowdfund = await DOWCrowdfund.new(founderMultiSigAddress, remainingTokenHolder, {from: owner});
        let token = await DOWToken.new(crowdfund.address, founderMultiSigAddress, devTeamAddress, {from: owner});
        await crowdfund.setTokenAddress(token.address, {from: owner});

            await crowdfund.endCrowdfund({
                from:founderMultiSigAddress,
                gas:200000
            });
        let balance = await token.balanceOf.call(remainingTokenHolder);
        assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(),1200000000);
    });

});