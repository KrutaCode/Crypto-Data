require('dotenv').config({ path: 'D:/CryptoData/crypto-data/.env' });
const Web3 = require('web3');
const { chainIds } = require('./chainIds.js');
const { idToNetworkName, decimalPaths } = require('./dataPaths.js');
const fs = require('fs');
const util = require('util');
const axios = require('axios');
const { ethers } = require('ethers');
const readFile = util.promisify(fs.readFile);

// Change the path to the directory that this project ("crypto-data") is in.
const basePath = 'D:/CryptoData/crypto-data';

// Paths to local files
const poolPaths = 'network-data/{}/dexs/{}/{}_{}_pools.json';

const nullAddress = '0x0000000000000000000000000000000000000000';

// Cases where "Coinmarketcap" uses a different symbol than local storage.
const cmcCases = {
    'USDC.e': 'USDCE',
};

class DataManager {
    verbose;
    constructor(verbose = true) {
        this.verbose = verbose;
    }

    /**---------------------------------- Token Addresses ----------------------------------*/

    /**
     * @description Returns the address of the token on the specified network.
     * @param symbol Ticker symbol of the coin.
     * @param chainId The Id associated with the blockchain number.
     * @param writeAddresses Boolean that determines if the addresses are written to local files. This is to save api calls in the future.
     * @return
     */
    async getTokenAddress(symbol, chainId, writeAddresses = true) {
        const networkName = idToNetworkName[chainId];
        const filePath = `${basePath}/network-data/${networkName}/tokens/${networkName}_token_addresses.json`;
        let jsonData = await readFile(filePath);
        jsonData = JSON.parse(jsonData);
        if (jsonData[symbol]) {
            if (this.verbose) {
                console.log(`[Token Address] Retrieved locally`);
            }
            return jsonData[symbol];
        } else {
            const tokenAddress = await this._queryTokenAddresses(symbol);
            if (writeAddresses) {
                await this._writeAllAddresses(symbol, tokenAddress);
            }
            if (this.verbose) {
                console.log(`[Token Address] Retrieved from web`);
            }
            return tokenAddress[chainId];
        }
    }
    /**
     * @description Query Coinmarketcap api to get the token's addresses on all available networks.
     * @private
     * @param _symbol: Ticker symbol of the token to query.
     * @return JSON with addresses
     */
    async _queryTokenAddresses(_symbol) {
        // Format symbol for special cases where Coinmarketcap uses a different symbol than local storage.
        if (cmcCases.hasOwnProperty(_symbol)) {
            _symbol = cmcCases[_symbol];
        }

        const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?symbol=${_symbol}&CMC_PRO_API_KEY=${process.env.COINMARKETCAP_API_KEY}`;
        console.log(`URL: ${url}`);
        const response = await axios.get(url);
        // Parse the data
        const data = await response.data['data'];

        let addressData = { address: {}, generalInfo: {} };
        // The address on the "native" network.
        const baseAddress = data[_symbol]['platform'].token_address;
        const baseNetwork = data[_symbol]['platform'].name;
        const baseId = chainIds[baseNetwork];
        addressData.address[baseId] = baseAddress;
        for (const i of data[_symbol]['contract_address']) {
            const _contractAddress = i.contract_address;
            const _platformName = i.platform['name'];
            const _chainId = chainIds[_platformName];

            // Add data to json.
            addressData.address[_chainId] = _contractAddress;
        }

        return addressData;
    }

    /**
     * @notice
     * @param
     * @return
     */
    /**---------------------------------- Token Decimals ----------------------------------*/
    /**
     * @description Get the number of decimal places the coin uses.
     * @param _symbol Ticker symbol of the coin to search.
     * @param _chainId Id of the network to search. (Defaulting to Ethereum is easier since Layer 2 tokens use the same amount of decimals as their Layer 1 counterpart)
     * @param _writeDecimals Boolean that determines if new coins are added to local storage. This saves api calls, as data is accessed locally rather than from the api.
     * @param _sortOnExit Boolean that determines if the JSON keys are sorted in alphabetical order.
     * @return integer of the number of decimals.
     */
    async getTokenDecimals(
        _symbol,
        _chainId = 1,
        _writeDecimals = true,
        _sortOnExit = true
    ) {
        let jsonData = await readFile(decimalPaths);
        const tokenAddress = await this.getTokenAddress(_symbol, _chainId);
        jsonData = JSON.parse(jsonData);

        if (jsonData[_symbol]) {
            if (this.verbose) {
                console.log(`[Token Decimals] Retrieved locally`);
            }
            return jsonData[_symbol];
        } else {
            const decimals = await this._queryTokenDecimals(tokenAddress);

            if (_writeDecimals) {
                this._writeTokenDecimals(_symbol, decimals, _sortOnExit);
            }
            if (this.verbose) {
                console.log(`[Token Decimals] Retrieved from web`);
            }

            return decimals;
        }
    }
    /**
     * @notice
     * @param
     * @return
     */
    /**
     * @notice Get the number of decimals that the token uses.
     *         NOTE: Data source is etherscan.
     * @param _tokenAddress: The address of the token to query.
     * @return: string
     */
    async _queryTokenDecimals(_tokenAddress) {
        try {
            // Create provider to read blockchain.
            const provider = new ethers.providers.JsonRpcProvider(
                process.env.INFURA_ETHEREUM_URL
            );
            // Retrieve the contracts abi.
            const tokenAbi = await this._queryContractAbi(_tokenAddress);
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
            console.log(`[Decimal Retrieval Error]: ${error}`);
            console.log(
                `\n\n----------------------------\n[Token Decimals Query]: `
            );
            return null;
        }
    }

    /**---------------------------------- Token ABIs ----------------------------------*/
    /**
     * @notice
     * @param
     * @return
     */

    /**
     * @notice Get the application binary interface (ABI) for the contract.
     *         NOTE: Data source is etherscan.
     * @param contractAddress: Address of the contract to retrieve the ABI for.
     * @return: json
     */
    async _queryContractAbi(contractAddress) {
        const abiUrl = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`;

        const response = await fetch(abiUrl);
        const result = await response.json();
        if (result.status === '1') {
            return JSON.parse(result.result);
        } else {
            throw new Error(`Failed to retrieve ABI: ${result.message}`);
        }
    }
    /**---------------------------------- Token Symbol ----------------------------------*/
    /**
     * @notice
     * @param
     * @return
     */
    async getTokenSymbol(_tokenAddress, _chainId) {
        const networkName = idToNetworkName[_chainId];
        const pathToTokenAddress = `${basePath}/network-data/${networkName}/tokens/${networkName}_token_addresses.json`;
        let jsonData = await readFile(pathToTokenAddress);
        // console.log(`JSON: ${jsonData}`);
        jsonData = await JSON.parse(jsonData);

        return Object.keys(jsonData).find(
            (key) => jsonData[key] === _tokenAddress
        );
    }
    /**
     * @notice
     * @param
     * @return
     */
    /**---------------------------------- Dex Attributes ----------------------------------*/
    /**
     * @description Retrieve the address of the main factory that the specified decentralized exchange uses.
     * @param _dex Name of the decentralized exchange.
     * @param _chainId Id of the blockchain network.
     * @return String of the factory address.
     */
    async getDexFactoryAddress(_dex, _chainId) {
        const networkName = idToNetworkName[_chainId];
        const pathToDex = `${basePath}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['factoryAddress'];
    }
    /**
     * @description Retrieve the ABI for the factory that the decentralized exchange uses.
     * @param _dex Name of the decentralized exchange.
     * @param _chainId Id of the blockchain network.
     * @return JSON of the abi.
     */
    async getDexFactoryAbi(_dex, _chainId) {
        const networkName = idToNetworkName[_chainId];
        const pathToDex = `${basePath}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['factoryAbi'];
    }
    /**
     * @description Retrieve the address of the main router that the specified decentralized exchange uses.
     * @param _dex Name of the decentralized exchange.
     * @param _chainId Id of the blockchain network.
     * @return String of the router address.
     */
    async getDexRouterAddress(_dex, _chainId) {
        const networkName = idToNetworkName[_chainId];
        const pathToDex = `${basePath}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['routerAddress'];
    }
    /**
     * @description Retrieve the ABI for the router that the specified decentralized exchange uses.
     * @param _dex Name of the decentralized exchange.
     * @param _chainId Id of the blockchain network.
     * @return JSON of the abi.
     */
    async getDexRouterAbi(_dex, _chainId) {
        const networkName = idToNetworkName[_chainId];
        const pathToDex = `${basePath}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['routerAbi'];
    }

    /**
     * @description Retrieve the ABI for the pools.
     * @param _dex Name of the decentralized exchange.
     * @param _chainId Id of the blockchain network.
     * @return JSON of the abi.
     */
    async getDexPoolAbi(_dex, _chainId) {
        const networkName = idToNetworkName[_chainId];
        const pathToDex = `${basePath}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['poolAbi'];
    }

    async getDexQuoterAddress(_dex = 'uniswap', _chainId) {
        const networkName = idToNetworkName[_chainId];
        const pathToDex = `${basePath}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_info.json`;
        let jsonData = await readFile(pathToDex);
        jsonData = await JSON.parse(jsonData);
        return jsonData['quoterAddress'];
    }

    /**---------------------------------- Network Attributes ----------------------------------*/
    /**
     * @notice
     * @param
     * @return
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
    /**---------------------------------- JSON Read/Write ----------------------------------*/
    /**
     * @notice
     * @param
     * @return
     */
    async _writeToTokenAddresses(
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
                jsonData = await this._sortJson(jsonData);
            }

            fs.writeFileSync(_pathToFile, JSON.stringify(jsonData, null, 2));
        } catch (error) {
            console.log(`[Token Address Write Error]: ${error}`);
            const data = { [_symbol]: _address };
            fs.writeFileSync(_pathToFile, JSON.stringify(data, null, 2));
        }
        //fs.writeFile(pathToFile);
    }
    /**
     * @notice Takes a list of addresses and write each one to their associated network file.
     * @param
     * @param addressData Json structure of tokens.
     * @return
     */
    async _writeAllAddresses(symbol, addressData) {
        let pathInfo;
        let unknownNetworks = [];

        for (const [key, value] of Object.entries(addressData.address)) {
            let networkName = await this.getNetworkName(key);

            if (networkName == undefined) {
                unknownNetworks.push(key);
            } else {
                let path = `${basePath}\\network-data\\${networkName}\\tokens\\${networkName}_token_addresses.json`;
                this._writeToTokenAddresses(symbol, value, path);
            }
        }
    }

    /**
     * @notice
     * @param
     * @return
     */
    async _writeTokenDecimals(_symbol, _decimals, _sortOnExit) {
        try {
            // Read json data.
            let jsonData = await readFile(tokenDecimalsPath);
            // Parse string to json.
            jsonData = JSON.parse(jsonData);
            // Add new key with decimal data.
            jsonData[_symbol] = _decimals;
            // Sort json data before writing it, if prompted.
            if (_sortOnExit) {
                jsonData = await this._sortJson(jsonData);
            }

            // Write data to json file.
            await fs.writeFileSync(
                tokenDecimalsPath,
                JSON.stringify(jsonData, null, 2)
            );
        } catch (error) {
            console.log(`[Write Token Decimal Error]: ${error}`);
            // Create new json with symbol and decimal data.
            const data = { [_symbol]: _decimals };
            await fs.writeFileSync(
                tokenDecimalsPath,
                JSON.stringify(data, null, 2)
            );
        }
    }

    async _writeTokenPairToPool(
        _baseToken,
        _quoteToken,
        _poolAddress,
        _dex,
        _chainId,
        _feeTier
    ) {
        // Turn _poolAddress to null if the address is invalid.
        if (_poolAddress == nullAddress) {
            _poolAddress = 'null';
        }

        const networkName = await this.getNetworkName(_chainId);
        const path = `${basePath}/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_pools.json`;
        console.log(path);
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
    /**---------------------------------- Utilities ----------------------------------*/
    /**
     * @notice
     * @param
     * @return
     */
    async _sortJson(_jsonData) {
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
    /**
     * @description
     * @param
     * @return
     */
    /**---------------------------------- Uniswap Pools ----------------------------------*/
    /**
     * @description Get the address for a liquidity pool on the Uniswap Exchange
     * @param _symbol0 First symbol in the pair.
     * @param _symbol1 Second symbol in the pair.
     * @param _feeTier The fee-tier of the pool
     * @param _chainId The id of the blockchain network.
     * @param _findCheapest If true, it will "override" the specified _feeTier variable and find the cheapest fee-tier.
     * @return String of address.
     */
    async getPoolAddress(
        _symbol0,
        _symbol1,
        _chainId,
        _feeTier = 500,
        _dex = 'uniswap',
        _findCheapest = false
    ) {
        const networkName = idToNetworkName[_chainId];
        const uniPath = `D:/CryptoData/crypto-data/network-data/${networkName}/dexs/${_dex}/${_dex}_${networkName}_pools.json`;
        let jsonData = await readFile(uniPath, 'utf-8');
        jsonData = JSON.parse(jsonData);
        // Override _feeTier, and return the cheapest tier.
        if (_findCheapest) {
            try {
                const feeTiers = jsonData[_symbol0][_symbol1];
                const poolAddress = this._getCheapestPool(feeTiers);
                return poolAddress;
            } catch (error) {
                if (this.verbose) {
                    console.log(`[getPoolAddress Error] ${error}`);
                }
                return null;
            }
        } else {
            try {
                const poolAddress = jsonData[_symbol0][_symbol1][_feeTier];
                return poolAddress;
            } catch (error) {
                if (this.verbose) {
                    console.log(`[getPoolAddress Error] ${error}`);
                }
                return null;
            }
        }
    }
    /**---------------------------------- Sushiswap Pools ----------------------------------*/
    /**
     * @description
     * @param
     * @return
     */
    async getSushiswapPoolAddress(
        _symbol0,
        _symbol1,
        _feeTier = 500,
        _chainId,
        _findCheapest = false
    ) {
        const networkName = idToNetworkName[_chainId];
        const sushiPath = `D:/CryptoData/crypto-data/network-data/${networkName}/dexs/sushiswap/sushiswap_${networkName}_pools.json`;
    }
    /**
     * @description
     * @param
     * @return
     */
    /**---------------------------------- Pool Utilities ----------------------------------*/
    /**
     * @description Takes the fee tiers for a pool, and returns the cheapest available one.
     * @param _feeTiers JSON of the fee-tier and associated addresses.
     * @return String of the address for the cheapest fee tier.
     */
    async _getCheapestPool(_feeTiers) {
        // Iterate through the json. Return the first tier that is not null.
        for (const fee in _feeTiers) {
            if (_feeTiers[fee] != 'null') {
                return _feeTiers[fee];
            }
        }
    }
    /**---------------------------------- Token Addresses ----------------------------------*/
}

module.exports = {
    DataManager,
};

async function main() {
    const dataManager = new DataManager();
    //console.log(await dataManager.getTokenAddress('WETH', 1));
    //const decimals = await dataManager.getTokenDecimals('DAI', 1);
    const poolAddress = await dataManager.getPoolAddress(
        'WMATIC',
        'WETH',
        137,
        500,
        (_dex = 'sushiswap'),
        (_findCheapest = false)
    );
}

//main();
