const devnet1 = {
    chainId: "elderdemo",
    chainName: "elder",
    rpc: "http://localhost:26657",
    rest: "http://localhost:1317",
    bip44: {
        coinType: 118
    },
    bech32Config: {
        bech32PrefixAccAddr: "elder",
        bech32PrefixAccPub: "elderpub",
        bech32PrefixValAddr: "eldervaloper",
        bech32PrefixValPub: "eldervaloperpub",
        bech32PrefixConsAddr: "eldervalcons",
        bech32PrefixConsPub: "eldervalconspub"
    },
    currencies: [
        {
            coinDenom: "elder",
            coinMinimalDenom: "elder",
            coinDecimals: 6,
            coinGeckoId: "elder-token"
        }
    ],
    feeCurrencies: [
        {
            coinDenom: "elder",
            coinMinimalDenom: "elder",
            coinDecimals: 6,
            coinGeckoId: "elder-token",
            gasPriceStep: {
                low: 0.01,
                average: 0.025,
                high: 0.04
            }
        }
    ],
    stakeCurrency: {
        coinDenom: "elder",
        coinMinimalDenom: "elder",
        coinDecimals: 6,
        coinGeckoId: "elder-token"
    },
    features: ["ibc-go"]
};

export const chainMap = new Map([
    ['devnet-1', devnet1]
]);


