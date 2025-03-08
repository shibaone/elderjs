import { fromBase64 } from "@cosmjs/encoding";
import { StargateClient } from "@cosmjs/stargate";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { ethers } from "ethers";
import { chainMap } from "../common/chains";
import { ElderDirectSecp256k1Wallet } from "../common/elderDirectSigner";
import ElderTransaction from "../common/ElderTransaction/index";
import {
    createSignDoc,
    customMessageTypeUrl,
    defaultElderFee,
    ETH_WALLET_ID,
    gasAdjustment,
    getAccountNumberAndSequence,
    getElderBech32AddressFromElderPublicKey,
    hexToBytes,
    hexToUint8Array,
    simulateElderTransaction,
    stringToHex,
    strip0x,
} from "../common/helper";
import type { ElderConfig } from "../common/types";

async function newElderDirectSecp256k1Wallet(elderPublicKey: string) {
    const compressedPublicKey = ethers.SigningKey.computePublicKey(
        elderPublicKey,
        true
    );
    const pubKeyBytes = hexToUint8Array(compressedPublicKey.slice(2));

    const signingWallet =
        await ElderDirectSecp256k1Wallet.fromCompressedPublicKey(pubKeyBytes);
    return signingWallet;
}

// async function eth_getElderMsgAndFeeTxRaw(tx, elderAddress, elderPublicKey, gasLimit, value, rollChainId, rollID, chainName, elderChainConfig) {
async function eth_getElderMsgAndFeeTxRaw(
    tx: ethers.TransactionLike<string>,
    elderAddress: string,
    uncompressedElderPublicKey: string,
    gasLimit: bigint,
    value: bigint,
    elderChainConfig: ElderConfig
): Promise<{ tx_hash: string; rawTx: Uint8Array<ArrayBufferLike> }> {
    const elderPublicKey = ethers.SigningKey.computePublicKey(
        uncompressedElderPublicKey,
        true
    );
    const elderChainInfo = chainMap.get(elderChainConfig.chainName);
    if (!elderChainInfo) throw new Error("failed to get elder chain");

    elderChainInfo.rpc = elderChainConfig.rpc;
    elderChainInfo.rest = elderChainConfig.rest;

    const { elderAccountNumber, elderAccountSequence } =
        await getAccountNumberAndSequence(elderChainInfo.rest, elderAddress);

    // Create Elder inner transaction
    let elderInnerTx = ElderTransaction.from({
        chainId: elderChainConfig.rollChainID,
        nonce: tx.nonce,
        gasLimit: gasLimit,
        to: tx.to,
        value: value,
        data: tx.data,
        accessList: tx.accessList,

        elderPublicKey: ethers.hexlify(stringToHex(strip0x(elderPublicKey))),
        elderAccountSequence: elderAccountSequence,
    });

    let tx_hash = elderInnerTx.hash;

    // ----- Clean Tx Begin
    delete tx.from;
    tx.nonce = 0;
    tx.gasLimit = gasLimit;
    tx.value = value;
    //TODO : safely configure to 0
    tx.gasPrice = ethers.parseUnits("20", "gwei");
    tx.chainId = elderChainConfig.rollChainID;
    tx.type = 0;
    // ----- Clean Tx End

    let txObj = ethers.Transaction.from(tx);

    let txBytes = txObj.unsignedSerialized;

    const elderMsg = {
        typeUrl: customMessageTypeUrl,
        value: {
            sender: elderAddress,
            rollId: elderChainConfig.rollID,
            txData: hexToBytes(txBytes),
            accNum: elderAccountNumber,
        },
    };

    let elderFee = defaultElderFee;

    let gasData = await simulateElderTransaction(
        elderMsg,
        elderPublicKey,
        elderAccountSequence,
        elderChainInfo.rest,
        ETH_WALLET_ID
    );

    elderFee.gas = parseInt(gasData.gas_info.gas_used) * gasAdjustment;

    const { signDoc } = createSignDoc(
        elderMsg,
        elderPublicKey,
        elderFee,
        elderAccountNumber,
        elderAccountSequence,
        elderChainInfo.chainId,
        ETH_WALLET_ID
    );

    const signingWallet = newElderDirectSecp256k1Wallet(elderPublicKey);

    const { signature, signed } = await (
        await signingWallet
    ).signDirect(elderAddress, signDoc);

    var rawTx = TxRaw.encode({
        bodyBytes: signed.bodyBytes,
        authInfoBytes: signed.authInfoBytes,
        signatures: [fromBase64(signature.signature)],
    }).finish();

    return { tx_hash, rawTx };
}

async function eth_getElderAccountInfoFromSignature(
    message: Uint8Array | string,
    signature: ethers.SignatureLike
) {
    const msgHash = ethers.hashMessage(message);
    const msgHashBytes = ethers.getBytes(msgHash);

    const recoveredPublicKey = ethers.SigningKey.recoverPublicKey(
        msgHashBytes,
        signature
    );
    let elderAddr = getElderBech32AddressFromElderPublicKey(recoveredPublicKey);

    return { elderAddr, recoveredPublicKey };
}

async function eth_broadcastTx(
    rawTx: Uint8Array<ArrayBufferLike>,
    elderRPCURL: string
) {
    const stargateClient = await StargateClient.connect(elderRPCURL, {
        // registry: commonRegistry,
        // aminoTypes: {
        //     prefix: "elder",
        // },
    });

    const broadcastResult = await stargateClient.broadcastTx(rawTx);
    return broadcastResult;
}

export {
    eth_broadcastTx,
    eth_getElderAccountInfoFromSignature,
    eth_getElderMsgAndFeeTxRaw,
};
