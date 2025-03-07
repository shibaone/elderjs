import {
    AccessList,
    accessListify,
    AccessListish,
    assertArgument,
    BigNumberish,
    Blob,
    decodeRlp,
    encodeRlp,
    getAddress,
    getBigInt,
    getBytes,
    getNumber,
    hexlify,
    isHexString,
    Signature,
    toBeArray,
    TransactionLike,
    zeroPadValue,
} from "ethers";
import ElderTransaction, { ElderTransactionLike } from ".";

export const BN_0 = BigInt(0);
export const BN_2 = BigInt(2);
export const BN_27 = BigInt(27);
export const BN_28 = BigInt(28);
export const BN_35 = BigInt(35);
const BN_MAX_UINT = BigInt(
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

export function formatNumber(_value: BigNumberish, name: string) {
    const value = getBigInt(_value, "value");
    const result = toBeArray(value);
    assertArgument(result.length <= 32, `value too large`, `tx.${name}`, value);
    return result;
}

function handleNumber(_value: string, param: string): number {
    if (_value === "0x") {
        return 0;
    }
    return getNumber(_value, param);
}

function handleAddress(value: string): null | string {
    if (value === "0x") {
        return null;
    }
    return getAddress(value);
}

export function formatAccessList(value: AccessListish) {
    return accessListify(value).map(set => [set.address, set.storageKeys]);
}

function handleAccessList(value: any, param: string): AccessList {
    try {
        return accessListify(value);
    } catch (error: any) {
        assertArgument(false, error.message, param, value);
    }
}

function handleUint(_value: string, param: string): bigint {
    if (_value === "0x") {
        return BN_0;
    }
    const value = getBigInt(_value, param);
    assertArgument(
        value <= BN_MAX_UINT,
        "value exceeds uint size",
        param,
        value
    );
    return value;
}

export function _parseLegacy(data: Uint8Array): ElderTransactionLike {
    const fields: any = decodeRlp(data);

    assertArgument(
        Array.isArray(fields) && (fields.length === 9 || fields.length === 6),
        "invalid field count for legacy transaction",
        "data",
        data
    );

    const tx: ElderTransactionLike = {
        type: 0,
        nonce: handleNumber(fields[0], "nonce"),
        gasPrice: handleUint(fields[1], "gasPrice"),
        gasLimit: handleUint(fields[2], "gasLimit"),
        to: handleAddress(fields[3]),
        value: handleUint(fields[4], "value"),
        data: hexlify(fields[5]),
        chainId: BN_0,
        elderAccountSequence: null,
        elderPublicKey: null,
    };

    // Legacy unsigned transaction
    if (fields.length === 6) {
        return tx;
    }

    const v = handleUint(fields[6], "v");
    const r = handleUint(fields[7], "r");
    const s = handleUint(fields[8], "s");

    if (r === BN_0 && s === BN_0) {
        // EIP-155 unsigned transaction
        tx.chainId = v;
    } else {
        // Compute the EIP-155 chain ID (or 0 for legacy)
        let chainId = (v - BN_35) / BN_2;
        if (chainId < BN_0) {
            chainId = BN_0;
        }
        tx.chainId = chainId;

        // Signed Legacy Transaction
        assertArgument(
            chainId !== BN_0 || v === BN_27 || v === BN_28,
            "non-canonical legacy v",
            "v",
            fields[6]
        );

        tx.signature = Signature.from({
            r: zeroPadValue(fields[7], 32),
            s: zeroPadValue(fields[8], 32),
            v,
        });

        //tx.hash = keccak256(data);
    }

    return tx;
}

export function _parseEipSignature(
    tx: TransactionLike,
    fields: Array<string>
): void {
    let yParity: number;
    try {
        yParity = handleNumber(fields[0], "yParity");
        if (yParity !== 0 && yParity !== 1) {
            throw new Error("bad yParity");
        }
    } catch (error) {
        assertArgument(false, "invalid yParity", "yParity", fields[0]);
    }

    const r = zeroPadValue(fields[1], 32);
    const s = zeroPadValue(fields[2], 32);

    const signature = Signature.from({ r, s, yParity });
    tx.signature = signature;
}

export function _parseEip1559(data: Uint8Array): ElderTransactionLike {
    const fields: any = decodeRlp(getBytes(data).slice(1));

    assertArgument(
        Array.isArray(fields) && (fields.length === 9 || fields.length === 12),
        "invalid field count for transaction type: 2",
        "data",
        hexlify(data)
    );

    const tx: ElderTransactionLike = {
        type: 2,
        chainId: handleUint(fields[0], "chainId"),
        nonce: handleNumber(fields[1], "nonce"),
        maxPriorityFeePerGas: handleUint(fields[2], "maxPriorityFeePerGas"),
        maxFeePerGas: handleUint(fields[3], "maxFeePerGas"),
        gasPrice: null,
        gasLimit: handleUint(fields[4], "gasLimit"),
        to: handleAddress(fields[5]),
        value: handleUint(fields[6], "value"),
        data: hexlify(fields[7]),
        accessList: handleAccessList(fields[8], "accessList"),
        elderAccountSequence: null,
        elderPublicKey: null,
    };

    // Unsigned EIP-1559 Transaction
    if (fields.length === 9) {
        return tx;
    }

    //tx.hash = keccak256(data);

    _parseEipSignature(tx, fields.slice(9));

    return tx;
}

export function _parseEip2930(data: Uint8Array): ElderTransactionLike {
    const fields: any = decodeRlp(getBytes(data).slice(1));

    assertArgument(
        Array.isArray(fields) && (fields.length === 8 || fields.length === 11),
        "invalid field count for transaction type: 1",
        "data",
        hexlify(data)
    );

    const tx: ElderTransactionLike = {
        type: 1,
        chainId: handleUint(fields[0], "chainId"),
        nonce: handleNumber(fields[1], "nonce"),
        gasPrice: handleUint(fields[2], "gasPrice"),
        gasLimit: handleUint(fields[3], "gasLimit"),
        to: handleAddress(fields[4]),
        value: handleUint(fields[5], "value"),
        data: hexlify(fields[6]),
        accessList: handleAccessList(fields[7], "accessList"),
        elderAccountSequence: null,
        elderPublicKey: null,
    };

    // Unsigned EIP-2930 Transaction
    if (fields.length === 8) {
        return tx;
    }

    //tx.hash = keccak256(data);

    _parseEipSignature(tx, fields.slice(8));

    return tx;
}

export function _parseEip4844(data: Uint8Array): ElderTransactionLike {
    let fields: any = decodeRlp(getBytes(data).slice(1));

    let typeName = "3";

    let blobs: null | Array<Blob> = null;

    // Parse the network format
    if (fields.length === 4 && Array.isArray(fields[0])) {
        typeName = "3 (network format)";
        const fBlobs = fields[1],
            fCommits = fields[2],
            fProofs = fields[3];
        assertArgument(
            Array.isArray(fBlobs),
            "invalid network format: blobs not an array",
            "fields[1]",
            fBlobs
        );
        assertArgument(
            Array.isArray(fCommits),
            "invalid network format: commitments not an array",
            "fields[2]",
            fCommits
        );
        assertArgument(
            Array.isArray(fProofs),
            "invalid network format: proofs not an array",
            "fields[3]",
            fProofs
        );
        assertArgument(
            fBlobs.length === fCommits.length,
            "invalid network format: blobs/commitments length mismatch",
            "fields",
            fields
        );
        assertArgument(
            fBlobs.length === fProofs.length,
            "invalid network format: blobs/proofs length mismatch",
            "fields",
            fields
        );

        blobs = [];
        for (let i = 0; i < fields[1].length; i++) {
            blobs.push({
                data: fBlobs[i],
                commitment: fCommits[i],
                proof: fProofs[i],
            });
        }

        fields = fields[0];
    }

    assertArgument(
        Array.isArray(fields) && (fields.length === 11 || fields.length === 14),
        `invalid field count for transaction type: ${typeName}`,
        "data",
        hexlify(data)
    );

    const tx: ElderTransactionLike = {
        type: 3,
        chainId: handleUint(fields[0], "chainId"),
        nonce: handleNumber(fields[1], "nonce"),
        maxPriorityFeePerGas: handleUint(fields[2], "maxPriorityFeePerGas"),
        maxFeePerGas: handleUint(fields[3], "maxFeePerGas"),
        gasPrice: null,
        gasLimit: handleUint(fields[4], "gasLimit"),
        to: handleAddress(fields[5]),
        value: handleUint(fields[6], "value"),
        data: hexlify(fields[7]),
        accessList: handleAccessList(fields[8], "accessList"),
        maxFeePerBlobGas: handleUint(fields[9], "maxFeePerBlobGas"),
        blobVersionedHashes: fields[10],
        elderAccountSequence: null,
        elderPublicKey: null,
    };

    if (blobs) {
        tx.blobs = blobs;
    }

    assertArgument(
        tx.to != null,
        `invalid address for transaction type: ${typeName}`,
        "data",
        data
    );

    assertArgument(
        Array.isArray(tx.blobVersionedHashes),
        "invalid blobVersionedHashes: must be an array",
        "data",
        data
    );
    for (let i = 0; i < tx.blobVersionedHashes.length; i++) {
        assertArgument(
            isHexString(tx.blobVersionedHashes[i], 32),
            `invalid blobVersionedHash at index ${i}: must be length 32`,
            "data",
            data
        );
    }

    // Unsigned EIP-4844 Transaction
    if (fields.length === 11) {
        return tx;
    }

    // @TODO: Do we need to do this? This is only called internally
    // and used to verify hashes; it might save time to not do this
    //tx.hash = keccak256(concat([ "0x03", encodeRlp(fields) ]));

    _parseEipSignature(tx, fields.slice(11));

    return tx;
}

export function serializeElderTx(tx: ElderTransaction) {
    const fields = [
        formatNumber(tx.chainId, "chainId"),
        formatNumber(tx.nonce, "nonce"),
        // formatNumber(tx.gasPrice || 0, "gasPrice"),
        formatNumber(tx.gasLimit, "gasLimit"),
        tx.to || "0x",
        formatNumber(tx.value, "value"),
        tx.data,
        formatAccessList(tx.accessList || []),
    ];

    fields.push(tx.elderPublicKey);
    fields.push(formatNumber(tx.elderAccountSequence, "elderAccountSequence"));

    return encodeRlp(fields);
}
