// Import local and web data libraries
const { LocalData } = require('./local-data/localData.js');
const { WebData } = require('./web-data/webData.js');
const { UtilitiesInterface } = require('./utils/utilitiesInterface.js');

class DataManager {
    constructor() {}
    localData = new LocalData();
    webData = new WebData();
    utils = new UtilitiesInterface();

    /** --------------------------------- Token Attributes --------------------------------- */
    /**
     * @description Get the token address.
     * @param {string} _symbol
     * @param {Number} _chainId Id of the blockchain network
     * @returns {string}
     */
    async getTokenAddress(_symbol, _chainId) {
        // Read address from local file.
        let address = await this.localData.getTokenAddress(_symbol, _chainId);

        // If address not found locally, get it from web.
        if (address === null) {
            console.log('TAG1');
            let addressData = await this.webData.queryTokenAddresses(_symbol);
            address = addressData.address[_chainId];
            // Write locally.
            this.localData.writeAllAddresses(_symbol, addressData);
        }
        // If still undefined after searching locally and on the web, it may be the token does not exist on the network.
        if (address === undefined) {
            return null;
        } else {
            return address;
        }
    }
    /**
     * @description Get the decimals of the token.
     * @param {string} _symbol Ticker symbol of the token.
     * @param {Number} _chainId Id of the blockchain network.
     * @returns
     */
    async getDecimals(_symbol, _chainId) {
        // Get decimal from local file.
        let decimals = await this.localData.getTokenDecimals(_symbol);
        if (decimals == null) {
            const tokenAddress = this.getTokenAddress(_symbol, _chainId);
            decimals = await this.webData.queryTokenDecimals(
                tokenAddress,
                _chainId
            );
            // Write locally
            this.localData.writeTokenDecimals(_symbol, decimals);
        }

        return decimals;
    }

    /** --------------------------------- Dex/Pool Attributes --------------------------------- */
    async getPoolAddress(_symbol0, _symbol1, _feeTier, _dex, _chainId) {
        let poolAddress = await this.localData.getPoolAddress(
            _symbol0,
            _symbol1,
            _feeTier,
            _dex,
            _chainId
        );
        console.log(`Pool1:  ${poolAddress}`);
        if (poolAddress === undefined) {
            // Get the address of the tokens.
            const address0 = this.getTokenAddress(_symbol0, _chainId);
            const address1 = this.getTokenAddress(_symbol1, _chainId);
            const factoryAddress = await this.localData.getDexFactoryAddress(
                _dex,
                _chainId
            );
            const factoryAbi = await this.localData.getDexAbis(_dex, _chainId)[
                'factoryAbi'
            ];
            console.log(`Factory:  ${factoryAddress}`);
            poolAddress = await this.webData.queryPoolAddress(
                address0,
                address1,
                _feeTier,
                factoryAddress,
                factoryAbi,
                _chainId
            );
            console.log(`Pool2:  ${poolAddress}`);
            // Write locally
            this.localData.writeTokenPairToPool(
                _symbol0,
                _symbol1,
                _feeTier,
                poolAddress,
                _dex,
                _chainId
            );
        }
        // If still undefined after searching locally and on the web, it may be the pool does not exist on the network.
        if (poolAddress === undefined) {
            return null;
        } else {
            return poolAddress;
        }
    }
}

module.exports = {
    DataManager,
};
