import {
    getEthereumAddressFromCosmosCompressedPubKey,
    hexToUint8Array,
} from "./common/helper";
import {
    cosmos_getElderClient,
    cosmos_getElderMsgAndFeeTxRaw,
} from "./cosmos_wallet";
import {
    eth_broadcastTx,
    eth_getElderAccountInfoFromSignature,
    eth_getElderMsgAndFeeTxRaw,
} from "./eth_wallet";
export type { OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
export type { DeliverTxResponse } from "@cosmjs/stargate";
export type { ElderConfig, ElderFee, ElderMessage } from "./common/types";

export {
    // cosmos wallets
    cosmos_getElderClient,
    cosmos_getElderMsgAndFeeTxRaw,

    // eth wallets
    eth_broadcastTx,
    eth_getElderAccountInfoFromSignature,
    eth_getElderMsgAndFeeTxRaw,

    // common helpers
    getEthereumAddressFromCosmosCompressedPubKey,
    hexToUint8Array
};

