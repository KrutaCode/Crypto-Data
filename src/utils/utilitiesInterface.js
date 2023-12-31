const { ethers } = require('ethers');

CmcIds = {
    Algorand: 1300,
    Arbitrum: 42161,
    'Arbitrum Nova': 42170,
    'Avalanche C-Chain': 43114,
    Base: 8453,
    'BNB Beacon Chain (BEP2)': 97,
    'BNB Smart Chain (BEP20)': 56,
    Cardano: 'cardano',
    Cosmos: 118,
    Cronos: 25,
    Energi: 39797,
    Ethereum: 1,
    Evmos: 9001,
    Fantom: 250,
    'Fusion Network': 32659,
    'Gnosis Chain': 100,
    Harmony: 1666600000,
    HECO: 128,
    'Hedera Hashgraph': 295,
    'Hoo Smart Chain': 70,
    Linea: 59144,
    Mantle: 5000,
    'Metis Andromeda': 1088,
    Milkomeda: 2001,
    Moonbeam: 1284,
    Moonriver: 1285,
    Near: 1313161554,
    OKExChain: 66,
    Optimism: 10,
    Osmosis: 'osmosis-1',
    Polygon: 137,
    'Polygon zkEVM': 1101,
    Secret: 'secret-4',
    Solana: 1399811149,
    Sora: null,
    Starknet: 'SN_MAIN',
    Telos: 41,
    'Terra Classic': 'columbus-5',
    TomoChain: 88,
    Zilliqa: 32769,
    'zkSync Era': 324,
};

const idToNetworkName = {
    42170: 'arbitrum-nova',
    42161: 'arbitrum-one',
    43114: 'avalanche-c-chain',
    8453: 'base',
    56: 'binance-smart-chain',
    1: 'ethereum',
    59144: 'linea',
    10: 'optimism',
    137: 'polygon-pos',
    1101: 'polygon-zkevm',
    1399811149: 'solana',
    324: 'zksync-era',
};

class UtilitiesInterface {
    constructor() {}

    /**
     * @description Return the Infura url that matches the network.
     * @param _chainId Id of the blockchain network.
     * @return String
     */
    async getNetworkRpc(_chainId) {
        if (_chainId == 1) {
            return process.env.INFURA_ETHEREUM_URL;
        } else if (_chainId == 10) {
            return process.env.INFURA_OPTIMISM_URL;
        } else if (_chainId == 137) {
            return process.env.INFURA_POLYGON_URL;
        } else if (_chainId == 42161) {
            return process.env.INFURA_ARBITRUM_URL;
        }
    }
    /**
     * @description Return provider variable for the network.
     * @param _chainId Id of the blockchain network.
     * @return String
     */
    async getNetworkProvider(_chainId) {
        const rpcUrl = await this.getNetworkRpc(_chainId);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        return provider;
    }

    /**
     * @description
     * @param
     * @return
     */
    async sortJson(_jsonData) {
        const sortedKeys = Object.keys(_jsonData).sort();
        // Create a new object with sorted keys.
        const sortedObject = {};
        for (const key of sortedKeys) {
            sortedObject[key] = _jsonData[key];
        }
        return sortedObject;
    }

    /**
     * @description Returns the network name of the associated chain id.
     * @param _chainId Id of the blockchain network.
     * @return String
     */
    async getNetworkName(_chainId) {
        return idToNetworkName[_chainId];
    }
}

module.exports = {
    CmcIds,
    idToNetworkName,
    UtilitiesInterface,
};
