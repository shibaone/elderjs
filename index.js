import { Registry } from "@cosmjs/proto-signing";
import { MsgSubmitRollTx } from "./elder_proto/dist/router/tx.js";
import { SigningStargateClient, coins } from "@cosmjs/stargate";
import { ethers } from "ethers";
import { chainMap } from "./chains.js";

const defaultElderFee = {
    amount: coins(500, "uelder"), // Adjust fee and denom
    gas: "200000", // Adjust gas
};

const customMessageTypeUrl = "/elder.router.MsgSubmitRollTx";

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

        const registry = new Registry();
        registry.register("/elder.router.MsgSubmitRollTx", MsgSubmitRollTx);

        const stargateClient = await SigningStargateClient.connectWithSigner(
            elderChainInfo.rpc,
            offlineSigner,
            { registry }
        );

        let elderClient = stargateClient;
        return { elderAddress, elderClient };
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
    } catch (error) {
        console.error("Transaction failed:", error);
        alert("Transaction failed. Check console for details.");
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

function getElderMsgAndFee(tx, elderAddress, gasLimit, value, chainId, rollID) {
    delete tx.from;
    tx.nonce = 0;
    tx.gasLimit = gasLimit;
    tx.value = value;
    tx.gasPrice = ethers.utils.parseUnits("20", "gwei");
    tx.chainId = chainId;

    const txBytes = ethers.utils.serializeTransaction(tx);

    const elderMsg = {
        typeUrl: customMessageTypeUrl,
        value: {
            sender: elderAddress,
            rollId: rollID,
            maxFeesGiven: 10000,
            txData: hexToBytes(txBytes),
        },
    };

    let elderFee = defaultElderFee;

    return { elderMsg, elderFee };
}

export { getElderClient, sendElderCustomTransaction, getElderMsgAndFee };
