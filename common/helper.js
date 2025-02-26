import { coins } from "@cosmjs/stargate";
import { ethers } from "ethers";
import { Registry } from "@cosmjs/proto-signing";
import { MsgSubmitRollTx } from "../elder_proto/dist/router/tx.js";
import { makeAuthInfoBytes, makeSignDoc } from '@cosmjs/proto-signing'
import { SimulateRequest } from 'cosmjs-types/cosmos/tx/v1beta1/service'
import { PubKey as EthSecpPubKey } from "../elder_proto/crypto/ethsecp256k1/keys.js";
import { PubKey as ElderSecpPubKey } from "../elder_proto/crypto/eldersecp256k1/keys.js";
import { toBase64 } from "@cosmjs/encoding";
import { AuthInfo, TxBody, Fee, Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { keccak_256 } from "@noble/hashes/sha3";
import { bech32 } from "bech32";

const COSMOS_WALLET_ID = 1;
const ETH_WALLET_ID = 2;

const defaultElderFee = {
    amount: coins(500000, "uelder"), // Adjust fee and denom
    gas: "200000", // Adjust gas
};

const gasAdjustment = 5;

const customMessageTypeUrl = "/elder.router.MsgSubmitRollTx";
const customElderpubsecp = "/elder.crypto.eldersecp256k1.PubKey";
const customEthSecp256k1 = "/ethermint.crypto.v1.ethsecp256k1.PubKey";

var commonRegistry = new Registry();
commonRegistry.register(customMessageTypeUrl, MsgSubmitRollTx);
commonRegistry.register(customElderpubsecp, ElderSecpPubKey);
commonRegistry.register(customEthSecp256k1, EthSecpPubKey);


function bytesToHex(bytes) {
    return '0x' + Array.from(bytes, byte =>
        byte.toString(16).padStart(2, '0')
    ).join('');
}

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

function hexToUint8Array(hexString) {
    // Remove the '0x' prefix if it exists
    hexString = hexString.replace(/^0x/, '');

    // Ensure the length is even
    if (hexString.length % 2 !== 0) {
        throw new Error('Hex string must have an even number of characters');
    }

    // Convert the hex string to a Uint8Array
    const byteArray = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < byteArray.length; i++) {
        byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }

    return byteArray;
}

function getElderBech32AddressFromElderPublicKey(elderPublicKey) {
    const uncompressedPublicKey = ethers.SigningKey.computePublicKey(elderPublicKey, false);
    const uncompressedPubKeyBytes = hexToUint8Array(uncompressedPublicKey.slice(2));
    const slicedPubKeyBytes = uncompressedPubKeyBytes.slice(1);
    const keccakHashed = keccak_256(slicedPubKeyBytes);
    const slicedHash = keccakHashed.slice(-20);
    const words = bech32.toWords(slicedHash);
    const elderAddr = bech32.encode("elder", words, undefined);

    return elderAddr
}

function getEthereumAddressFromCosmosCompressedPubKey(compressedPubKey) {
    try {
        // Ensure the input is a valid hex string with 0x prefix
        if (!compressedPubKey.startsWith('0x')) {
            compressedPubKey = '0x' + compressedPubKey;
            console.log('Added 0x prefix:', compressedPubKey);
        }

        // Check if it's actually compressed (starts with 0x02 or 0x03)
        if (!compressedPubKey.startsWith('0x02') && !compressedPubKey.startsWith('0x03')) {
            throw new Error('Public key is not in compressed format (must start with 0x02 or 0x03)');
        }

        // Convert compressed key to uncompressed using ethers
        const uncompressedPubKey = ethers.SigningKey.computePublicKey(compressedPubKey, false);

        // Remove the 0x04 prefix from uncompressed key and compute address
        const pubKeyWithoutPrefix = uncompressedPubKey.slice(2);
        const address = ethers.computeAddress('0x' + pubKeyWithoutPrefix);

        return address;
    } catch (error) {
        console.error('Error calculating Ethereum address:', error.message);
        return null;
    }
}

async function getAccountNumberAndSequence(restURL, elderAddress) {
    const response = await fetch(`${restURL}/cosmos/auth/v1beta1/accounts/${elderAddress}`);
    const data = await response.json();
    const accountInfo = data.account;

    return { elderAccountNumber: accountInfo.account_number, elderAccountSequence: accountInfo.sequence };
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

function elderPublicKeyToCustomElderSecpKey(elderPublicKey) {
    const compressedPublicKey = ethers.SigningKey.computePublicKey(elderPublicKey, true)

    var pubKeyBytes = hexToUint8Array(compressedPublicKey.slice(2));

    const pubkey = ElderSecpPubKey.encode(ElderSecpPubKey.fromPartial({
        key: pubKeyBytes,
    })).finish()

    let pubk = {
        typeUrl: customElderpubsecp,
        value: pubkey,
    }

    return pubk;
}


function createSignDoc(elderMsg, elderPublicKey, elderFee, elderAccountNumber, elderAccountSequence, elderChainID, WALLET_ID) {
    const txBodyBytes = createTxBodyBytes(elderMsg);

    var pubk;
    if (WALLET_ID === ETH_WALLET_ID) {
        pubk = elderPublicKeyToCustomElderSecpKey(elderPublicKey)
    } else {
        pubk = elderPublicKeyToCustomEthSecpKey(elderPublicKey)
    }

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

async function simulateElderTransaction(elderMsg, elderPublicKey, elderAccountSequence, elderRestURL, WALLET_ID) {
    const messages = [elderMsg]
    const anyMsgs = messages.map((m) => commonRegistry.encodeAsAny(m))

    var pubk;
    if (WALLET_ID === ETH_WALLET_ID) {
        pubk = elderPublicKeyToCustomElderSecpKey(elderPublicKey)
    } else {
        pubk = elderPublicKeyToCustomEthSecpKey(elderPublicKey)
    }

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

export {
    defaultElderFee,
    gasAdjustment,
    customMessageTypeUrl,
    customElderpubsecp,
    customEthSecp256k1,
    COSMOS_WALLET_ID,
    ETH_WALLET_ID,
    commonRegistry,
    toBase64,
    bytesToHex,
    hexToBytes,
    strip0x,
    stringToHex,
    hexToUint8Array,
    getEthereumAddressFromCosmosCompressedPubKey,
    getAccountNumberAndSequence,
    simulateElderTransaction,
    createSignDoc,
    getElderBech32AddressFromElderPublicKey,
};
