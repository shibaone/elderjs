import { fromBase64 } from "@cosmjs/encoding";
import { OfflineDirectSigner, OfflineSigner } from "@cosmjs/proto-signing";
import { AminoTypes, SigningStargateClient } from "@cosmjs/stargate";
import type { ChainInfo } from "@keplr-wallet/types";
import { Window as KeplrWindow } from '@keplr-wallet/types';
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { ethers } from "ethers";
import { chainMap } from "../common/chains";
import ElderTransaction from "../common/ElderTransaction";
import { bytesToHex, commonRegistry, COSMOS_WALLET_ID, createSignDoc, customMessageTypeUrl, defaultElderFee, gasAdjustment, getAccountNumberAndSequence, hexToBytes, simulateElderTransaction, stringToHex, strip0x } from "../common/helper.js";
import type { ElderConfig } from "../common/types";

declare global {
    interface Window extends KeplrWindow {
        isStartFromInteractionWithSidePanelEnabled: boolean | undefined;
    }
}

async function getKeplrSigner(chainInfo: ChainInfo) {
    if (!window.keplr) {
        throw new Error("Please install Keplr Wallet.");
    }
    await window.keplr.experimentalSuggestChain(chainInfo);
    await window.keplr.enable(chainInfo.chainId);
    return window.getOfflineSigner?.(chainInfo.chainId);
}

async function cosmos_getElderClient(elderChainConfig: ElderConfig, opts?: { signer?: OfflineSigner }) {
    const elderChainInfo = chainMap.get(elderChainConfig.chainName);

    if(!elderChainInfo) throw new Error("failed to get elder chain");

    let offlineSigner = opts?.signer;
    elderChainInfo.rpc = elderChainConfig.rpc;
    elderChainInfo.rest = elderChainConfig.rest;

    try {
        if (!offlineSigner) offlineSigner = await getKeplrSigner(elderChainInfo);

        if (!offlineSigner) throw new Error("no offline signer found");

        const accounts = await offlineSigner.getAccounts();
        let elderAddress = accounts[0].address;
        let elderPublicKey = bytesToHex(accounts[0].pubkey);

        const stargateClient = await SigningStargateClient.connectWithSigner(
            elderChainInfo.rpc,
            offlineSigner,
            {
                registry: commonRegistry,
                aminoTypes: {
                    prefix: "elder"
                }
            }
        );

        let elderClient = stargateClient;

        let { elderAccountNumber, elderAccountSequence } = await getAccountNumberAndSequence(elderChainConfig.rest, elderAddress);

        return { elderAddress, elderClient, elderAccountNumber, elderAccountSequence, elderPublicKey };
    } catch (error) {
        console.error("Failed to connect wallet:", error);
        alert("Failed to connect wallet.");
        return null;
    }
}

async function cosmos_getElderMsgAndFeeTxRaw(tx: ethers.TransactionLike<string>, elderAddress: string, elderPublicKey: string, gasLimit: bigint, value: bigint, rollChainId: bigint, rollID: number, chainName: string, opts?: { signer?: OfflineSigner }) {
    const elderChainInfo = chainMap.get(chainName);
    if(!elderChainInfo) throw new Error("failed to get elder chain")

    const { elderAccountNumber, elderAccountSequence } = await getAccountNumberAndSequence(elderChainInfo.rest, elderAddress);

    // Create Elder inner transaction
    let elderInnerTx = ElderTransaction.from(
        {
            chainId: rollChainId,
            nonce: tx.nonce,
            gasLimit: gasLimit,
            to: tx.to,
            value: value,
            data: tx.data,
            accessList: tx.accessList,

            elderPublicKey: ethers.hexlify(stringToHex(strip0x(elderPublicKey))),
            elderAccountSequence: elderAccountSequence,
        }
    );

    let tx_hash = elderInnerTx.hash;

    delete tx.from;
    tx.nonce = 0;
    tx.gasLimit = gasLimit;
    tx.value = value;

    //TODO : safely configure to 0
    tx.gasPrice = ethers.parseUnits("20", "gwei");
    tx.chainId = rollChainId;
    tx.type = 0;

    let txObj = ethers.Transaction.from(tx);
    console.log("txObj", txObj);

    let txBytes = txObj.unsignedSerialized;

    const elderMsg = {
        typeUrl: customMessageTypeUrl,
        value: {
            sender: elderAddress,
            rollId: rollID,
            txData: hexToBytes(txBytes),
            accNum: elderAccountNumber,
        },
    };

    let elderFee = defaultElderFee;

    console.log("elderMsg", elderMsg, "elderPublicKey", elderPublicKey, "elderAccountSequence", elderAccountSequence, "elderChainInfo", elderChainInfo.rest);

    let gasData = await simulateElderTransaction(elderMsg, elderPublicKey, elderAccountSequence, elderChainInfo.rest, COSMOS_WALLET_ID);

    elderFee.gas = parseInt(gasData.gas_info.gas_used) * gasAdjustment;

    const { signDoc } = createSignDoc(elderMsg, elderPublicKey, elderFee, elderAccountNumber, elderAccountSequence, elderChainInfo.chainId, COSMOS_WALLET_ID);

    const offlineSigner = (opts?.signer || await getKeplrSigner(elderChainInfo)) as OfflineDirectSigner;
    if(!offlineSigner) throw new Error("failed to get offline signer");

    const { signature, signed } = await offlineSigner.signDirect(elderAddress, signDoc)

    var rawTx = TxRaw.encode({
        bodyBytes: signed.bodyBytes,
        authInfoBytes: signed.authInfoBytes,
        signatures: [fromBase64(signature.signature)],
    }).finish();

    return { tx_hash, rawTx };
}

export { cosmos_getElderClient, cosmos_getElderMsgAndFeeTxRaw };
