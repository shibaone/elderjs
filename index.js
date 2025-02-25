import { cosmos_getElderClient, cosmos_sendElderCustomTransaction, cosmos_getElderMsgAndFee, cosmos_getElderMsgAndFeeTxRaw } from './cosmos_wallet/index.js';
import { eth_getAccountNumberAndSequence, eth_getElderMsgAndFee, eth_getElderAccountInfoFromSignature } from './eth_wallet/index.js';
import { getEthereumAddressFromCosmosCompressedPubKey, hexToUint8Array } from './common/helper.js';

export {
    // common helpers
    getEthereumAddressFromCosmosCompressedPubKey,
    hexToUint8Array,

    // cosmos wallets
    cosmos_getElderClient,
    cosmos_sendElderCustomTransaction,
    cosmos_getElderMsgAndFee,
    cosmos_getElderMsgAndFeeTxRaw,

    // eth wallets
    eth_getAccountNumberAndSequence,
    eth_getElderMsgAndFee,
    eth_getElderAccountInfoFromSignature
};
