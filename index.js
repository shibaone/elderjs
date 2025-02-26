import { cosmos_getElderClient, cosmos_getElderMsgAndFeeTxRaw } from './cosmos_wallet/index.js';
import { eth_getElderMsgAndFeeTxRaw, eth_getElderAccountInfoFromSignature, eth_broadcastTx } from './eth_wallet/index.js';
import { getEthereumAddressFromCosmosCompressedPubKey, hexToUint8Array } from './common/helper.js';

export {
    // common helpers
    getEthereumAddressFromCosmosCompressedPubKey,
    hexToUint8Array,

    // cosmos wallets
    cosmos_getElderClient,
    cosmos_getElderMsgAndFeeTxRaw,

    // eth wallets
    eth_getElderMsgAndFeeTxRaw,
    eth_getElderAccountInfoFromSignature,
    eth_broadcastTx,
};
