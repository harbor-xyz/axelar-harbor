'use strict';

require('dotenv').config();
const {
    utils: { setJSON },
    testnetInfo,
} = require('@axelar-network/axelar-local-dev');
const { Wallet, getDefaultProvider, utils, ContractFactory } = require('ethers');
const { FormatTypes, keccak256, defaultAbiCoder } = require('ethers/lib/utils');

async function deploy(env, chains, wallet, example) {
    if (example.preDeploy) {
        await example.preDeploy(chains, wallet);
    }
    const promises = [];

    for (const chain of chains) {
        const rpc = chain.rpc;
        const provider = getDefaultProvider(rpc);
        promises.push(example.deploy(chain, wallet.connect(provider)));
    }

    await Promise.all(promises);

    if (example.postDeploy) {
        for (const chain of chains) {
            const rpc = chain.rpc;
            const provider = getDefaultProvider(rpc);
            promises.push(example.postDeploy(chain, chains, wallet.connect(provider)));
        }

        await Promise.all(promises);
    }

    for (const chain of chains) {
        for (const key of Object.keys(chain)) {
            if (chain[key].interface) {
                const contract = chain[key];
                const abi = contract.interface.format(FormatTypes.full);
                chain[key] = {
                    abi,
                    address: contract.address,
                };
            }
        }

        // delete chain.wallet
    }

    setJSON(chains, `./info/${env}.json`);
}

module.exports = {
    deploy,
};

if (require.main === module) {
    const example = require(`../${process.argv[2]}/index.js`);

    const env = process.argv[3];
    if (env == null || (env !== 'testnet' && env !== 'local'))
        throw new Error('Need to specify testnet or local as an argument to this script.');
    let temp;

    if (env === 'local') {
        temp = require(`../info/local.json`);
    } else {
        try {
            temp = require(`../info/testnet.json`);
        } catch {
            temp = testnetInfo;
        }
    }

    const chains = temp;

    // const privateKey = keccak256(defaultAbiCoder.encode(['string'], ['this is a random string to get a random account. You need to provide the private key for a funded account here.']));
    const privateKey = process.env.EVM_PRIVATE_KEY;
    const wallet = new Wallet(privateKey);

    deploy(env, chains, wallet, example);
}
