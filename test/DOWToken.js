const DOWToken = artifacts.require('DOWToken.sol');
const Utils = require('./helpers/Utils');
const BigNumber = require('bignumber.js');
const DOWCrowdfund = artifacts.require('DOWCrowdfund.sol');

let tokenAddress;
let founderMultiSigAddress;
let crowdfundAddress;
let owner;
let beneficiary;
let devTeamAddress;


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
    })
}

contract('DOWToken', (accounts) => {
    before(async() => {
        crowdfundAddress = accounts[0];
        founderMultiSigAddress = accounts[1];
        owner = accounts[2];
        beneficiary = accounts[3];
        devTeamAddress = accounts[4];
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        tokenAddress = token.address;
    });

    it('verify parameters', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        let balance = await token
            .balanceOf
            .call(crowdfundAddress);
        assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1200000000);
        let founderBalance = await token
            .balanceOf
            .call(founderMultiSigAddress);
        assert.strictEqual(founderBalance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 500000000);
        let devBalance = await token
            .balanceOf
            .call(devTeamAddress);
        assert.strictEqual(devBalance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 300000000);
    });

    it('verify the allocation variables', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        let _initialSupply = await token
            .initialSupply
            .call();
        assert.strictEqual(_initialSupply.dividedBy(new BigNumber(10).pow(18)).toNumber(), 2000000000);
        let _foundersAllocation = await token
            .foundersAllocation
            .call();
        assert.strictEqual(_foundersAllocation.dividedBy(new BigNumber(10).pow(18)).toNumber(), 500000000);
        let _devAllocation = await token
            .devAllocation
            .call();
        assert.strictEqual(_devAllocation.dividedBy(new BigNumber(10).pow(18)).toNumber(), 300000000);
        let _tokensAllocatedToCrowdFund = await token
            .tokensAllocatedToCrowdFund
            .call();
        assert.strictEqual(_tokensAllocatedToCrowdFund.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1200000000);
        let _totalAllocatedTokens = await token
            .totalAllocatedTokens
            .call();
        assert.strictEqual(_totalAllocatedTokens.dividedBy(new BigNumber(10).pow(18)).toNumber(),800000000);
    })

    it("changeFounderMultiSigAddress:should able to change the founder wallet address",async()=>{
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
    
        await token.changeFounderMultiSigAddress(accounts[2],{from:founderMultiSigAddress});
        let newFounderAddress = await token.founderMultiSigAddress.call();
        assert.equal(newFounderAddress,accounts[2]);
     });
    
    
     it("changeFounderMultiSigAddress:should able to change the founder wallet address -- fail because it not called by the founder",async()=>{
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
    
        try {
            await token.changeFounderMultiSigAddress(accounts[2],{from:accounts[3]});
        } catch(error) {
            return Utils.ensureException(error);
        }    
     });    
    
     it("changeFounderMultiSigAddress:should able to change the founder wallet address -- fail because new address is zero",async()=>{
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        try {
            await token.changeFounderMultiSigAddress(0x0,{from:accounts[3]});
        } catch(error) {
            return Utils.ensureException(error);
        }    
     });

    // ///////////////////////////////////////// Transfer // ///////////////////////////////////////

    it('transfer: ether directly to the token contract -- it will throw', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        try {
            await web3
                .eth
                .sendTransaction({
                    from: accounts[8],
                    to: token.address,
                    value: web3.toWei('10', 'Ether')
                });
        } catch (error) {
            return Utils.ensureException(error);
        }
    });

    it('transfer: should transfer 10000 to accounts[8] from crowdsale', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.transfer(accounts[8], new BigNumber(10000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        let balance = await token
            .balanceOf
            .call(accounts[8]);
        assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 10000);
    });

    it('transfer: first should transfer 10000 to accounts[8] from crowdsale then accounts[8] transfers 1000 to accounts[7]',
    async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        let currentTime = Math.floor(Date.now() / 1000);
        await token.transfer(accounts[8], new BigNumber(10000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        let balance = await token
            .balanceOf
            .call(accounts[8]);
        assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 10000);
        await token.transfer(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: accounts[8]});
        let accBalance = await token
            .balanceOf
            .call(accounts[7]);
        assert.strictEqual(accBalance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
    });

    it('transfer: should fail when trying to transfer zero', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        try {
            await token.transfer(accounts[8], new BigNumber(0).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        } catch (error) {
            return Utils.ensureException(error);
        }
    });

    it('approve: msg.sender should approve 1000 to accounts[8]', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.approve(accounts[8], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        let _allowance = await token
            .allowance
            .call(crowdfundAddress, accounts[8]);
        assert.strictEqual(_allowance.dividedBy(new BigNumber(10).pow(18)).toNumber(),1000);
    });

    it('approve: msg.sender should approve 1000 to accounts[7] & withdraws 200 once', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.transfer(accounts[8], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: accounts[8]});
        let _allowance1 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
        await token.transferFrom(accounts[8], accounts[6], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        let balance = await token
            .balanceOf
            .call(accounts[6]);
        assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
        let _allowance2 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
        let _balance = await token
            .balanceOf
            .call(accounts[8]);
        assert.strictEqual(_balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);

    });

    it('approve: msg.sender should approve 1000 to accounts[7] & withdraws 200 twice', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.transfer(accounts[8], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: accounts[8]});
        let _allowance1 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
        await token.transferFrom(accounts[8], accounts[6], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        let _balance1 = await token
            .balanceOf
            .call(accounts[6]);
        assert.strictEqual(_balance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
        let _allowance2 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
        let _balance2 = await token
            .balanceOf
            .call(accounts[8]);
        assert.strictEqual(_balance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
        await token.transferFrom(accounts[8], accounts[5], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        let _balance3 = await token
            .balanceOf
            .call(accounts[5]);
        assert.strictEqual(_balance3.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
        let _allowance3 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance3.dividedBy(new BigNumber(10).pow(18)).toNumber(), 600);
        let _balance4 = await token
            .balanceOf
            .call(accounts[8]);
        assert.strictEqual(_balance4.dividedBy(new BigNumber(10).pow(18)).toNumber(), 600);
    });

    it('Approve max (2^256 - 1)', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.approve(accounts[8], '115792089237316195423570985008687907853269984665640564039457584007913129639935', {from: accounts[7]});
        let _allowance = await token.allowance(accounts[7], accounts[8]);
        let result = _allowance.equals('1.15792089237316195423570985008687907853269984665640564039457584007913129639935e' +
                '+77');
        assert.isTrue(result);
    });

    it('approves: msg.sender approves accounts[7] of 1000 & withdraws 800 & 500 (2nd tx should fail)',
    async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.transfer(accounts[8], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: accounts[8]});
        let _allowance1 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
        await token.transferFrom(accounts[8], accounts[6], new BigNumber(800).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        let _balance1 = await token
            .balanceOf
            .call(accounts[6]);
        assert.strictEqual(_balance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
        let _allowance2 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
        let _balance2 = await token
            .balanceOf
            .call(accounts[8]);
        assert.strictEqual(_balance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
        try {
            await token.transferFrom(accounts[8], accounts[6], new BigNumber(500).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        } catch (error) {
            return Utils.ensureException(error);
        }
    });

    it('transferFrom: user attempt to transfer 100 tokens with 1000 allowance before the crowdsale ends -- fails ',
    async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.transfer(accounts[8], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: accounts[8]});
        let _allowance1 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
        try {
            await token.transferFrom(accounts[8], accounts[6], new BigNumber(100).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        } catch (error) {
            return Utils.ensureException(error);
        }

    });

    it('transferFrom: Attempt to  withdraw from account with no allowance  -- fail', async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.transfer(accounts[8], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        try {
            await token
                .transferFrom
                .call(accounts[8], accounts[6], new BigNumber(100).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        } catch (error) {
            return Utils.ensureException(error);
        }
    });

    it('transferFrom: Allow accounts[7] 1000 to withdraw from accounts[8]. Withdraw 800 and then approve 0 & attempt transfer',
    async() => {
        let token =await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.transfer(accounts[8], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        await token.approve(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: accounts[8]});
        let _allowance1 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
        await token.transferFrom(accounts[8], accounts[6], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        let _balance1 = await token
            .balanceOf
            .call(accounts[6]);
        assert.strictEqual(_balance1.dividedBy(new BigNumber(10).pow(18)).toNumber(), 200);
        let _allowance2 = await token
            .allowance
            .call(accounts[8], accounts[7]);
        assert.strictEqual(_allowance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
        let _balance2 = await token
            .balanceOf
            .call(accounts[8]);
        assert.strictEqual(_balance2.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800);
        await token.approve(accounts[7], 0, {from: accounts[8]});
        try {
            await token.transferFrom(accounts[8], accounts[6], new BigNumber(200).times(new BigNumber(10).pow(18)), {from: accounts[7]});
        } catch (error) {
            return Utils.ensureException(error);
        }
    });

    it('addToAllocation: verifies the functionality of updating the variable totalAllocated',
    async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.addToAllocation(new BigNumber(10).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        let allocation = await token
            .totalAllocatedTokens
            .call();
        assert.strictEqual(allocation.dividedBy(new BigNumber(10).pow(18)).toNumber(), 800000010);
    });

    it('addToAllocation:verifies the functionality of updating the variable totalAllocated -- fails called by other than crowdfund',
    async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        try {
            await token.addToAllocation(new BigNumber(10).times(new BigNumber(10).pow(18)), {from: accounts[8]});
        } catch (error) {
            return Utils.ensureException(error);
        }
    });

    
    it('transfer: first should transfer 10000 to accounts[8] from crowdsale then accounts[8] transfer 1000 to accounts[7] when endTime completes',
    async() => {
        let token = await DOWToken.new(crowdfundAddress, founderMultiSigAddress, devTeamAddress, {from: owner});
        await token.transfer(accounts[8], new BigNumber(10000).times(new BigNumber(10).pow(18)), {from: crowdfundAddress});
        let balance = await token
        .balanceOf
        .call(accounts[8]);
        assert.strictEqual(balance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 10000);
        await token.transfer(accounts[7], new BigNumber(1000).times(new BigNumber(10).pow(18)), {from: accounts[8]});
        let accBalance = await token
            .balanceOf
            .call(accounts[7]);
            assert.strictEqual(accBalance.dividedBy(new BigNumber(10).pow(18)).toNumber(), 1000);
        });
        
 });