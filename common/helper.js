import { coins } from "@cosmjs/stargate";
import { ethers } from "ethers";
import { Registry } from "@cosmjs/proto-signing";
import { MsgSubmitRollTx } from "../elder_proto/dist/router/tx.js";

const defaultElderFee = {
    amount: coins(10, "uelder"), // Adjust fee and denom
    gas: "200000", // Adjust gas
};

const gasAdjustment = 2;

const customMessageTypeUrl = "/elder.router.MsgSubmitRollTx";
const customelderpubsecp = "/elder.crypto.eldersecp256k1.PubKey";
const customEthSecp256k1 = "/ethermint.crypto.v1.ethsecp256k1.PubKey";

var commonRegistry  = new Registry();
commonRegistry.register(customMessageTypeUrl, MsgSubmitRollTx);


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

export {
    defaultElderFee,
    gasAdjustment,
    customMessageTypeUrl,
    customelderpubsecp,
    customEthSecp256k1,
    commonRegistry,
    bytesToHex,
    hexToBytes,
    strip0x,
    stringToHex,
    hexToUint8Array,
    getEthereumAddressFromCosmosCompressedPubKey
};
