import { SigningStargateClient } from "@cosmjs/stargate";
import { ethers } from "ethers";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { chainMap } from "../common/chains.js";
import ElderTransaction from "../ElderTransaction.js";
import { fromBase64 } from "@cosmjs/encoding";
import { defaultElderFee, customMessageTypeUrl, bytesToHex, hexToBytes, strip0x, stringToHex, gasAdjustment, commonRegistry, getAccountNumberAndSequence, simulateElderTransaction, createSignDoc, COSMOS_WALLET_ID } from "../common/helper.js";

async function cosmos_getElderClient(elderChainConfig) {
    const elderChainInfo = chainMap.get(elderChainConfig.chainName);

    elderChainInfo.rpc = elderChainConfig.rpc;
    elderChainInfo.rest = elderChainConfig.rest;

    if (!window.keplr) {
        alert("Please install Keplr Wallet.");
        return;
    }

    try {
        await window.keplr.experimentalSuggestChain(elderChainInfo);
        await window.keplr.enable(elderChainInfo.chainId);

        const offlineSigner = window.getOfflineSigner(elderChainInfo.chainId);
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

async function cosmos_getElderMsgAndFeeTxRaw(tx, elderAddress, elderPublicKey, gasLimit, value, rollChainId, rollID, chainName) {
    const elderChainInfo = chainMap.get(chainName);
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

    elderFee.gas = parseInt(parseInt(gasData.gas_info.gas_used) * gasAdjustment);

    const { signDoc } = createSignDoc(elderMsg, elderPublicKey, elderFee, elderAccountNumber, elderAccountSequence, elderChainInfo.chainId, COSMOS_WALLET_ID);

    const offlineSigner = window.getOfflineSigner(elderChainInfo.chainId);
    const { signature, signed } = await offlineSigner.signDirect(elderAddress, signDoc)

    var rawTx = TxRaw.encode({
        bodyBytes: signed.bodyBytes,
        authInfoBytes: signed.authInfoBytes,
        signatures: [fromBase64(signature.signature)],
    }).finish();

    return { tx_hash, rawTx };
}

export { cosmos_getElderClient, cosmos_getElderMsgAndFeeTxRaw };
