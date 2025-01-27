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

const devnet2 = {
    chainId: "elderdemo",
    chainName: "elder",
    rpc: "http://localhost:26657",
    rest: "http://localhost:1317",
    bip44: {
        coinType: 118,
    },
    bech32Config: {
        bech32PrefixAccAddr: "elder",
        bech32PrefixAccPub: "elder" + "pub",
        bech32PrefixValAddr: "elder" + "valoper",
        bech32PrefixValPub: "elder" + "valoperpub",
        bech32PrefixConsAddr: "elder" + "valcons",
        bech32PrefixConsPub: "elder" + "valconspub",
    },
    currencies: [
        {
            coinDenom: "elder",
            coinMinimalDenom: "uelder",
            coinDecimals: 6,
            coinGeckoId: "elder-token",
        },
        {
            coinDenom: "shib",
            coinMinimalDenom: "shib",
            coinDecimals: 1,
            coinGeckoId: "shib-token",
        },
    ],
    feeCurrencies: [
        {
            coinDenom: "elder",
            coinMinimalDenom: "uelder",
            coinDecimals: 6,
            coinGeckoId: "elder-token",
            gasPriceStep: {
                low: 1,
                average: 1.25,
                high: 1.5,
            },
        },
        {
            coinDenom: "shib",
            coinMinimalDenom: "shib",
            coinDecimals: 1,
            coinGeckoId: "shib-token",
            gasPriceStep: {
                low: 0.5,
                average: 1,
                high: 1.5,
            },
        },
    ],
    stakeCurrency: {
        coinDenom: "elder",
        coinMinimalDenom: "uelder",
        coinDecimals: 6,
        coinGeckoId: "elder-token",
    },
    features: ["ibc-go"]
}

const devnet3 = {
    chainId: "elder_devnet_3",
    chainName: "elder",
    rpc: "http://localhost:26657",
    rest: "http://localhost:1317",
    bip44: {
        coinType: 118,
    },
    bech32Config: {
        bech32PrefixAccAddr: "elder",
        bech32PrefixAccPub: "elder" + "pub",
        bech32PrefixValAddr: "elder" + "valoper",
        bech32PrefixValPub: "elder" + "valoperpub",
        bech32PrefixConsAddr: "elder" + "valcons",
        bech32PrefixConsPub: "elder" + "valconspub",
    },
    currencies: [
        {
            coinDenom: "elder",
            coinMinimalDenom: "uelder",
            coinDecimals: 6,
            coinGeckoId: "elder-token",
        },
        {
            coinDenom: "shib",
            coinMinimalDenom: "shib",
            coinDecimals: 1,
            coinGeckoId: "shib-token",
        },
    ],
    feeCurrencies: [
        {
            coinDenom: "elder",
            coinMinimalDenom: "uelder",
            coinDecimals: 6,
            coinGeckoId: "elder-token",
            gasPriceStep: {
                low: 1,
                average: 1.25,
                high: 1.5,
            },
        },
        {
            coinDenom: "shib",
            coinMinimalDenom: "shib",
            coinDecimals: 1,
            coinGeckoId: "shib-token",
            gasPriceStep: {
                low: 0.5,
                average: 1,
                high: 1.5,
            },
        },
    ],
    stakeCurrency: {
        coinDenom: "elder",
        coinMinimalDenom: "uelder",
        coinDecimals: 6,
        coinGeckoId: "elder-token",
    },
    features: ["ibc-go"]
}

export const chainMap = new Map([
    ['devnet-1', devnet1],
    ['devnet-2', devnet2],
    ['devnet-3', devnet3]
]);


