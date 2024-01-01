const { ethers } = require('ethers');
require('dotenv').config({ path: 'D:/CryptoData/crypto-data/.env' });
const axios = require('axios');

const fileName = 'webData.js';
// Uniswap Pool Abi
const {
    abi: PoolAbi,
} = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');

// Uniswap Factory Abi import
//

// console.log(`FactoryABI: ${JSON.stringify(FactoryAbi, null, 2)}`);
const cmcCases = {
    'USDC.e': 'USDCE',
};

const {
    CmcIds,
    idToNetworkName,
    UtilitiesInterface,
} = require('../utils/utilitiesInterface.js');

// Import erc20 abi.
const tokenAbi = require('../../token-standards/abis/erc20Abi.json');

class WebData {
    logErrors;
    constructor(_logErrors = true) {
        this.logErrors = _logErrors;
    }
    utils = new UtilitiesInterface();

    /**---------------------------------- Token Attributes ----------------------------------*/
    /**
     * @description
     * @param
     * @returns
     */
    async queryTokenAddresses(_symbol) {
        // Format symbol for special cases where Coinmarketcap uses a different symbol than local storage.
        if (cmcCases.hasOwnProperty(_symbol)) {
            _symbol = cmcCases[_symbol];
        }

        const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=${_symbol}&CMC_PRO_API_KEY=${process.env.COINMARKETCAP_API_KEY}`;
        const response = await axios.get(url);
        // Parse the data
        const data = await response.data['data'];

        let addressData = { address: {}, generalInfo: {} };
        // The address on the "native" network.
        const baseAddress = data[_symbol]['platform'].token_address;
        const baseNetwork = data[_symbol]['platform'].name;
        const baseId = CmcIds[baseNetwork];
        addressData.address[baseId] = baseAddress;
        for (const i of data[_symbol]['contract_address']) {
            const _contractAddress = i.contract_address;
            const _platformName = i.platform['name'];
            const _chainId = CmcIds[_platformName];

            // Add data to json.
            addressData.address[_chainId] = _contractAddress;
        }

        return addressData;
    }
    /**
     * @description Query the number of decimals from the contract.
     * @param _tokenAddress Address of the token.
     * @param _chainId Id of the blockchain network.
     * @returns Integer, null if not found.
     */
    async queryTokenDecimals(_tokenAddress, _chainId) {
        try {
            const rpcUrl = await this.utils.getNetworkRpc(_chainId);
            // Create provider to read blockchain.
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            // Create an object representative of the contract.
            const tokenContract = new ethers.Contract(
                _tokenAddress,
                tokenAbi,
                provider
            );
            // Get the 'decimals' field.
            const decimals = await tokenContract.decimals();
            return decimals;
        } catch (error) {
            if (this.logErrors) {
                console.log(
                    `[queryTokenDecimals() Error]: ${error} (${fileName})`
                );
            }
            return null;
        }
    }

    /**---------------------------------- Dex/Pool Attributes ----------------------------------*/
    async queryPoolAddress(
        _address0,
        _address1,
        _feeTier,
        _factoryAddress,
        _factoryAbi,
        _chainId
    ) {
        // Set up the provider
        const rpcUrl = await this.utils.getNetworkRpc(_chainId);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        console.log(`Factory Address: ${_factoryAddress}`);
        // Factory setup.
        const factory = new ethers.Contract(
            _factoryAddress,
            _factoryAbi,
            provider
        );

        // Get pool address from factory.
        const poolAddress = await factory.getPool(
            _address0,
            _address1,
            _feeTier
        );
        console.log(`Pool Address: ${poolAddress}`);
        return poolAddress;
    }
}

/**
 * @description
 * @param
 * @returns
 */
/**
 * @description
 * @param
 * @returns
 */

module.exports = {
    WebData,
};
