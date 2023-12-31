const { DataManager } = require('./src/dataManagerV3.js');
const { TokenInterface } = require('./src/token-interface/tokenInterface.js');

async function main() {
    const data = new DataManager();
    const chainId = 137;
    const symbol = 'RNDR';
    const address = await data.getTokenAddress(symbol, chainId);
    console.log(address);

    const decimals = await data.getDecimals(symbol, chainId);
    console.log(decimals);

    const poolAddress = await data.getPoolAddress(
        symbol,
        'USDC',
        100,
        'uniswap',
        137
    );
}

main();
