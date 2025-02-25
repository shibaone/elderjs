import { SigningStargateClient } from "@cosmjs/stargate";
import { ethers } from "ethers";
import { AuthInfo, TxRaw, TxBody, Fee, Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { chainMap } from "../common/chains.js";
import ElderTransaction from "../ElderTransaction.js";
import { PubKey as EthSecpPubKey } from "../elder_proto/crypto/ethsecp256k1/keys.js";
import { fromBase64, toBase64 } from "@cosmjs/encoding";
import { defaultElderFee, customMessageTypeUrl, bytesToHex, hexToBytes, strip0x, stringToHex, gasAdjustment, customEthSecp256k1, hexToUint8Array, commonRegistry } from "../common/helper.js";
import { makeAuthInfoBytes, makeSignDoc } from '@cosmjs/proto-signing'
import { SimulateRequest } from 'cosmjs-types/cosmos/tx/v1beta1/service'

async function getAccountNumberAndSequence(restURL, elderAddress) {
    const response = await fetch(`${restURL}/cosmos/auth/v1beta1/accounts/${elderAddress}`);
    const data = await response.json();
    const accountInfo = data.account;

    return { elderAccountNumber: accountInfo.account_number, elderAccountSequence: accountInfo.sequence };
}

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

    let gasData = await simulateElderTransaction(elderMsg, elderPublicKey, elderAccountSequence, elderChainInfo.rest);

    elderFee.gas = parseInt(parseInt(gasData.gas_info.gas_used) * gasAdjustment);

    const { signDoc } = createSignDoc(elderMsg, elderPublicKey, elderFee, elderAccountNumber, elderAccountSequence, elderChainInfo.chainId);

    const offlineSigner = window.getOfflineSigner(elderChainInfo.chainId);
    const { signature, signed } = await offlineSigner.signDirect(elderAddress, signDoc)

    var rawTx = TxRaw.encode({
        bodyBytes: signed.bodyBytes,
        authInfoBytes: signed.authInfoBytes,
        signatures: [fromBase64(signature.signature)],
    }).finish();

    return { tx_hash, rawTx };
}

async function simulateElderTransaction(elderMsg, elderPublicKey, elderAccountSequence, elderRestURL) {
    const messages = [elderMsg]
    const anyMsgs = messages.map((m) => commonRegistry.encodeAsAny(m))
    const pubk = elderPublicKeyToCustomEthSecpKey(elderPublicKey);

    const tx = Tx.fromPartial({
        authInfo: AuthInfo.fromPartial({
            fee: Fee.fromPartial({}),
            signerInfos: [
                {
                    publicKey: pubk,
                    sequence: elderAccountSequence,
                    modeInfo: { single: { mode: SignMode.SIGN_MODE_UNSPECIFIED } },
                },
            ],
        }),
        body: TxBody.fromPartial({
            messages: Array.from(anyMsgs),
        }),
        signatures: [new Uint8Array()],
    })

    const request = SimulateRequest.fromPartial({
        txBytes: Tx.encode(tx).finish(),
    })

    const res = await fetch(
        `${elderRestURL}/cosmos/tx/v1beta1/simulate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tx_bytes: toBase64(request.txBytes) }),
        }
    )

    if (!res.ok) {
        // TODO handle error json?
        console.error('Failed to simulate transaction:', res.statusText)
        throw new Error('Failed to simulate transaction: ' + (res.statusText || res.status))
    }

    const gasData = await res.json()
    return gasData;
}

function createTxBodyBytes(elderMsg) {
    const txBody = {
        typeUrl: "/cosmos.tx.v1beta1.TxBody",
        value: {
            messages: [
                {
                    ...elderMsg,
                }
            ],
        }
    };

    const txBodyBytes = commonRegistry.encode(txBody);

    return txBodyBytes;
}

function elderPublicKeyToCustomEthSecpKey(elderPublicKey) {
    const compressedPublicKey = ethers.SigningKey.computePublicKey(elderPublicKey, true)

    var pubKeyBytes = hexToUint8Array(compressedPublicKey.slice(2));

    const pubkey = EthSecpPubKey.encode(EthSecpPubKey.fromPartial({
        key: pubKeyBytes,
    })).finish()

    let pubk = {
        typeUrl: customEthSecp256k1,
        value: pubkey,
    }

    return pubk;
}


function createSignDoc(elderMsg, elderPublicKey, elderFee, elderAccountNumber, elderAccountSequence, elderChainID) {
    const txBodyBytes = createTxBodyBytes(elderMsg);

    const pubk = elderPublicKeyToCustomEthSecpKey(elderPublicKey)

    const authInfoBytes = makeAuthInfoBytes(
        [{ pubkey: pubk, sequence: elderAccountSequence }],
        elderFee.amount,
        elderFee.gas,
        undefined,
        undefined
    )

    const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, elderChainID, elderAccountNumber)

    return { signDoc }
}
// TODO : safely Deprecate cosmos_sendElderCustomTransaction
const cosmos_sendElderCustomTransaction = async (
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

// TODO : safely Deprecate cosmos_getElderMsgAndFee
function cosmos_getElderMsgAndFee(tx, elderAddress, gasLimit, value, rollChainId, rollID, accNum, elderPublicKey, elderAccountSequence) {
    // Create Elder transaction
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
    tx.gasPrice = ethers.parseUnits("20", "gwei");
    tx.chainId = rollChainId;
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

    return { elderMsg, elderFee, tx_hash };
}

export { cosmos_getElderClient, cosmos_sendElderCustomTransaction, cosmos_getElderMsgAndFee, cosmos_getElderMsgAndFeeTxRaw };
