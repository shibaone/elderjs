import { Registry } from "@cosmjs/proto-signing";
import { MsgSubmitRollTx } from "./elder_proto/dist/router/tx.js";
import { SigningStargateClient, coins } from "@cosmjs/stargate";
import { ethers } from "ethers";
import { chainMap } from "./chains.js";
import  ElderTransaction  from "./ElderTransaction.js";

const defaultElderFee = {
    amount: coins(500, "uelder"), // Adjust fee and denom
    gas: "200000", // Adjust gas
};

const customMessageTypeUrl = "/elder.router.MsgSubmitRollTx";

async function getAccountNumberAndSequence(restEndpoint, offlineSigner, elderAddress) {
    const client = await SigningStargateClient.connectWithSigner(restEndpoint, offlineSigner);

    // Fetch account info
    const accountInfo = await client.getAccount(elderAddress);
    return { elderAccountNumber : accountInfo.accountNumber, elderAccountSequence: accountInfo.sequence };
}

function bytesToHex(bytes) {
    return '0x' + Array.from(bytes, byte => 
        byte.toString(16).padStart(2, '0')
    ).join('');
}

async function getElderClient(elderChainConfig) {
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

        let {elderAccountNumber, elderAccountSequence} = await getAccountNumberAndSequence(elderChainInfo.rpc, offlineSigner, elderAddress);

        const registry = new Registry();
        registry.register("/elder.router.MsgSubmitRollTx", MsgSubmitRollTx);

        const stargateClient = await SigningStargateClient.connectWithSigner(
            elderChainInfo.rpc,
            offlineSigner,
            { registry }
        );

        let elderClient = stargateClient;
        return { elderAddress, elderClient, elderAccountNumber, elderAccountSequence, elderPublicKey };
    } catch (error) {
        console.error("Failed to connect wallet:", error);
        alert("Failed to connect wallet.");
        return null;
    }
}

const sendElderCustomTransaction = async (
    elderAddress,
    elderClient,
    elderMsg,
    elderFee
) => {
    if (!elderClient || !elderAddress) {
        alert("Connect wallet first!");
        return;
    }

    try {
        console.log("Sending transaction...", elderMsg, elderFee, elderAddress);
        const result = await elderClient.signAndBroadcast(
            elderAddress,
            [elderMsg],
            elderFee
        );
        console.log("Transaction result:", result);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error("Transaction failed:", error);
        return {
            success: false,
            data: error.message
        };
    }
};

function hexToBytes(hexString) {
    // Remove the "0x" prefix if present
    if (hexString.startsWith("0x")) {
        hexString = hexString.slice(2);
    }

    // Ensure the hex string has an even number of characters
    if (hexString.length % 2 !== 0) {
        throw new Error("Invalid hex string length.");
    }

    // Convert hex string to bytes
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes;
}

function strip0x(hexString) {
    return hexString.startsWith("0x") ? hexString.slice(2) : hexString;
}

function stringToHex(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        let n = code.toString(16);
        hex += (n.length < 2 ? '0' : '') + n;
    }
    return '0x' + hex;
}

function getElderMsgAndFee(tx, elderAddress, gasLimit, value, chainId, rollID, accNum, elderPublicKey, elderAccountSequence) {
    // Create Elder transaction
    let elderInnerTx = ElderTransaction.from(
        {
            chainId: chainId,
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
    tx.gasPrice = ethers.parseUnits("20", "gwei");
    tx.chainId = chainId;
    tx.type = 0;

    let txObj = ethers.Transaction.from(tx);
    let txBytes = txObj.unsignedSerialized;

    const elderMsg = {
        typeUrl: customMessageTypeUrl,
        value: {
            sender: elderAddress,
            rollId: rollID,
            txData: hexToBytes(txBytes),
            accNum: accNum,
        },
    };

    let elderFee = defaultElderFee;

    return { elderMsg, elderFee , tx_hash};
}

export { getElderClient, sendElderCustomTransaction, getElderMsgAndFee };
