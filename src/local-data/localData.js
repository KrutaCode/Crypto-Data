require('dotenv').config({ path: 'D:/CryptoData/crypto-data/.env' });

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const { UtilitiesInterface } = require('../utils/utilitiesInterface.js');
const fileName = 'localData.js';

// Path to token Decimals
const tokenDecimalsPath = `${process.env.BASE_PATH}/token-standards/decimals/tokenDecimals.json`;

// Address representing "null".
const nullAddress = '0x0000000000000000000000000000000000000000';

class LocalData {
    logErrors;
    constructor(_logErrors = true) {
        this.logErrors = _logErrors;
    }
    utils = new UtilitiesInterface();

    /** --------------------------------- Token Attributes --------------------------------- */
    /**
     * @description
     * @param
     * @returns
     */
    async getTokenAddress(_symbol, _chainId) {
        const networkName = await this.utils.getNetworkName(_chainId);
        const filePath = `${process.env.BASE_PATH}/network-data/${networkName}/tokens/${networkName}_token_addresses.json`;
        let jsonData = await readFile(filePath);
        jsonData = JSON.parse(jsonData);
        if (jsonData[_symbol]) {
            return jsonData[_symbol];
        } else {
            return null;
        }
    }

    /**
     * @description Get decimal number from local files.
     * @param _symbol Ticker symbol of the token.
     * @returns Integer, null if not found.
     */
    async getTokenDecimals(_symbol) {
        let jsonData = await readFile(tokenDecimalsPath);
        jsonData = JSON.parse(jsonData);
        if (jsonData[_symbol]) {
            return jsonData[_symbol];
        } else {
            return null;
        }
    }
    /** --------------------------------- Dex Attributes --------------------------------- */
    /**
     * @description Retrieve the address of the main factory that the specified decentralized exchange uses.
     * @param _dex Name of the decentralized exchange.
     * @param _chainId Id of the blockchain network.
     * @return String of the factory address.
     */
    async getDexFactoryAddress(_dex, _chainId) {
        const networkName = await this.utils.getNetworkName(_chainId);
        const pathToDex = `${process.env.BASE_PATH}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['factoryAddress'];
    }
    /**
     * @description Retrieve the ABI for the factory that the decentralized exchange uses.
     * @param _dex Name of the decentralized exchange.
     * @return JSON of the abi.
     */
    async getDexFactoryAbi(_dex, _chainId) {
        const networkName = await this.utils.getNetworkName(_chainId);
        const pathToDex = `${process.env.BASE_PATH}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['factoryAbi'];
    }
    /**
     * @description Retrieve the address of the main router that the specified decentralized exchange uses.
     * @param _dex Name of the decentralized exchange.
     * @return String of the router address.
     */
    async getDexRouterAddress(_dex, _chainId) {
        const networkName = await this.utils.getNetworkName(_chainId);
        const pathToDex = `${process.env.BASE_PATH}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['routerAddress'];
    }
    /**
     * @description Retrieve the ABI for the router that the specified decentralized exchange uses.
     * @param _dex Name of the decentralized exchange.
     * @return JSON of the abi.
     */
    async getDexRouterAbi(_dex, _chainId) {
        const networkName = await this.utils.getNetworkName(_chainId);
        const pathToDex = `${process.env.BASE_PATH}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['routerAbi'];
    }

    /**
     * @description Retrieve the ABI for the pools.
     * @param _dex Name of the decentralized exchange.
     * @return JSON of the abi
     */
    async getDexPoolAbi(_dex) {
        if (_dex == 'uniswap') {
            return PoolAbi;
        }
    }

    /**
     * @description Return the address of the quoter.
     * @param _dex Name of the decentralized exchange.
     * @return String
     */
    async getDexQuoterAddress(_dex = 'uniswap', _chainId) {
        const networkName = await this.utils.getNetworkName(_chainId);
        const pathToDex = `${process.env.BASE_PATH}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['quoterAddress'];
    }

    /**
     * @description Get the address for a liquidity pool on the Uniswap Exchange
     * @param _symbol0 First symbol in the pair.
     * @param _symbol1 Second symbol in the pair.
     * @param _feeTier The fee-tier of the pool.
     * @param _findCheapest If true, it will "override" the specified _feeTier variable and find the cheapest fee-tier.
     * @return String of address.
     */
    async getPoolAddress(
        _symbol0,
        _symbol1,
        _feeTier = 500,
        _dex = 'uniswap',
        _chainId,
        _findCheapest = false
    ) {
        const networkName = await this.utils.getNetworkName(_chainId);
        const uniPath = `D:/CryptoData/crypto-data/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_pools.json`;
        let jsonData = await readFile(uniPath, 'utf-8');
        jsonData = JSON.parse(jsonData);
        // Override _feeTier, and return the cheapest tier.
        if (_findCheapest) {
            try {
                console.log('TAG1');
                const feeTiers = jsonData[_symbol0][_symbol1];
                console.log('TAG2');
                const poolAddress = this.getCheapestPool(feeTiers);
                return poolAddress;
            } catch (error) {
                if (this.logErrors) {
                    console.log(
                        `[getPoolAddress() Error] ${error} (${fileName})`
                    );
                }
                return null;
            }
        } else {
            try {
                console.log('TAG1');
                const poolAddress = jsonData[_symbol0][_symbol1][_feeTier];
                console.log('TAG2');
                return poolAddress;
            } catch (error) {
                if (this.logErrors) {
                    console.log(
                        `[getPoolAddress() Error] ${error} (${fileName})`
                    );
                }
                return undefined;
            }
        }
    }

    /**---------------------------------- Pool Utilities ----------------------------------*/
    /**
     * @description Takes the fee tiers for a pool, and returns the cheapest available one.
     * @param _feeTiers JSON of the fee-tier and associated addresses.
     * @return String of the address for the cheapest fee tier.
     */
    async getCheapestPool(_feeTiers) {
        // Iterate through the json. Return the first tier that is not null.
        for (const fee in _feeTiers) {
            if (_feeTiers[fee] != 'null') {
                return _feeTiers[fee];
            }
        }
    }
    /** --------------------------------- JSON Write --------------------------------- */
    /**
     * @description Write the token's address to the correct local files.
     * @param _symbol The ticker symbol of the token.
     * @param _address The address of the token.
     * @param _pathToFile The path where the json file is located.
     * @param _sortOnExit Boolean that determines if the json keys are sorted before the function ends.
     * @return None
     */
    async writeToTokenAddresses(
        _symbol,
        _address,
        _pathToFile,
        _sortOnExit = true
    ) {
        try {
            let jsonData = await readFile(_pathToFile);
            jsonData = JSON.parse(jsonData);
            jsonData[_symbol] = _address;
            // Sort json before writing.
            if (_sortOnExit) {
                jsonData = await this.utils.sortJson(jsonData);
            }

            fs.writeFileSync(_pathToFile, JSON.stringify(jsonData, null, 2));
        } catch (error) {
            if (this.logErrors) {
                console.log(
                    `[writeToTokenAddresses() Error]: ${error} (${fileName})`
                );
            }
            const data = { [_symbol]: _address };
            fs.writeFileSync(_pathToFile, JSON.stringify(data, null, 2));
        }
    }

    /**
     * @notice Takes a list of addresses and write each one to their associated network's file.
     * @param _symbol The ticker symbol of the token.
     * @param _addressData Json structure of tokens. Includes addresses on all available networks.
     * @return None
     */
    async writeAllAddresses(_symbol, _addressData) {
        let unknownNetworks = [];

        for (const [key, value] of Object.entries(_addressData.address)) {
            let networkName = await this.utils.getNetworkName(key);

            if (networkName == undefined) {
                unknownNetworks.push(key);
            } else {
                let path = `${process.env.BASE_PATH}\\network-data\\${networkName}\\tokens\\${networkName}_token_addresses.json`;
                this.writeToTokenAddresses(_symbol, value, path);
            }
        }
    }
    /**
     * @description Write's the number of decimals a token uses to a local file.
     * @param _symbol Ticker symbol of the token.
     * @param _decimals Number of decimals the token uses. (Ex: USDC uses 6, WETH uses 18)
     * @param _sortOnExit Boolean that determines if the json keys are sorted before the function ends.
     * @return
     */
    async writeTokenDecimals(_symbol, _decimals, _sortOnExit) {
        try {
            // Read json data.
            let jsonData = await readFile(tokenDecimalsPath);
            // Parse string to json.
            jsonData = JSON.parse(jsonData);
            // Add new key with decimal data.
            jsonData[_symbol] = _decimals;
            // Sort json data before writing it, if prompted.
            if (_sortOnExit) {
                jsonData = await this.utils.sortJson(jsonData);
            }

            // Write data to json file.
            await fs.writeFileSync(
                tokenDecimalsPath,
                JSON.stringify(jsonData, null, 2)
            );
        } catch (error) {
            if (this.logErrors) {
                console.log(
                    `[writeTokenDecimals() Error]: ${error} (${fileName})`
                );
            }
            // Create new json with symbol and decimal data.
            const data = { [_symbol]: _decimals };
            await fs.writeFileSync(
                tokenDecimalsPath,
                JSON.stringify(data, null, 2)
            );
        }
    }
    /**
     * @description Write the token pair's address to local storage.
     * @param _baseToken The first token in the pair.
     * @param _quoteToken The second token in the pair.
     * @param _feeTier Fee tier that the pool is located in.
     * @param _poolAddress The address of the token pair.
     * @param _dex Name of the decentralized exchange where this pair is located.
     * @param _chainId Id of the blockchain network.
     * @return
     */
    async writeTokenPairToPool(
        _baseToken,
        _quoteToken,
        _feeTier,
        _poolAddress,
        _dex,
        _chainId
    ) {
        // Turn _poolAddress to null if the address is invalid.
        if (_poolAddress == nullAddress) {
            _poolAddress = 'null';
        }
        const networkName = await this.utils.getNetworkName(_chainId);
        const path = `${process.env.BASE_PATH}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_pools.json`;
        let jsonData = await readFile(path);
        jsonData = JSON.parse(jsonData);

        /**
         * @Case1
         * @Description _baseToken *does not* exist in json.
         * @Logic If jsonData does not have a key for "_baseToken", it will create an entire structure for the pool address.
         *        Since the "_baseToken" does not exist in the json, we can assume the "_quoteToken" or "_feeTier" also do not exist.
         */
        if (!jsonData.hasOwnProperty(_baseToken)) {
            jsonData[_baseToken] = {
                [_quoteToken]: {
                    [_feeTier]: _poolAddress,
                },
            };
        } else if (!jsonData[_baseToken].hasOwnProperty(_quoteToken)) {
            /**
             * @Case2
             * @Description _baseToken *does* exist, but _quoteToken *does not* exist.
             * @Logic Create new entry within the _baseToken key.
             */
            jsonData[_baseToken][_quoteToken] = {
                [_feeTier]: _poolAddress,
            };
        } else if (
            !jsonData[_baseToken][_quoteToken].hasOwnProperty(_feeTier)
        ) {
            /**
             * @Case3
             * @Description _baseToken & _quoteToken *does* exist. _feeTier *does not* exist.
             * @Logic Creates a new entry within _quoteToken key.
             *
             */
            jsonData[_baseToken][_quoteToken][_feeTier] = _poolAddress;
        }

        fs.writeFileSync(path, JSON.stringify(jsonData, null, 2));
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
/**
 * @description
 * @param
 * @returns
 */

module.exports = {
    LocalData,
};
