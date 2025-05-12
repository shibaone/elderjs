import { assert, ethers, getBytes, Signature, TransactionLike } from "ethers";
import {
    _parseEip1559,
    _parseEip2930,
    _parseEip4844,
    _parseLegacy,
    BN_0,
    serializeElderTx,
} from "./helpers";

export interface ElderTransactionLike<A = string> extends TransactionLike<A> {
    elderAccountSequence: bigint | null;
    elderPublicKey: string | null;
}

class ElderTransaction extends ethers.Transaction {
    #elderAccountSequence;
    #elderPublicKey;

    constructor() {
        super();
        this.#elderPublicKey = "";
        this.#elderAccountSequence = BN_0;
    }

    static from(tx?: string | ElderTransactionLike<string>): ElderTransaction {
        if (tx == null) {
            return new ElderTransaction();
        }
        // ! THIS IS NOT IMPLEMENTED
        if (typeof tx === "string") {
            const payload = getBytes(tx);
            if (payload[0] >= 0x7f) {
                // @TODO: > vs >= ??
                return ElderTransaction.from(_parseLegacy(payload));
            }
            switch (payload[0]) {
                case 1:
                    return ElderTransaction.from(_parseEip2930(payload));
                case 2:
                    return ElderTransaction.from(_parseEip1559(payload));
                case 3:
                    return ElderTransaction.from(_parseEip4844(payload));
            }
            assert(
                false,
                "unsupported transaction type",
                "UNSUPPORTED_OPERATION",
                { operation: "from" }
            );
        }
        const result = new ElderTransaction();
        if (tx.type != null) {
            result.type = tx.type;
        }
        if (tx.to != null) {
            result.to = tx.to;
        }
        if (tx.nonce != null) {
            result.nonce = tx.nonce;
        }
        if (tx.gasLimit != null) {
            result.gasLimit = tx.gasLimit;
        }
        if (tx.gasPrice != null) {
            result.gasPrice = tx.gasPrice;
        }
        if (tx.maxPriorityFeePerGas != null) {
            result.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
        }
        if (tx.maxFeePerGas != null) {
            result.maxFeePerGas = tx.maxFeePerGas;
        }
        if (tx.maxFeePerBlobGas != null) {
            result.maxFeePerBlobGas = tx.maxFeePerBlobGas;
        }
        if (tx.data != null) {
            result.data = tx.data;
        }
        if (tx.value != null) {
            result.value = tx.value;
        }
        if (tx.chainId != null) {
            result.chainId = tx.chainId;
        }
        if (tx.signature != null) {
            result.signature = Signature.from(tx.signature);
        }
        if (tx.accessList != null) {
            result.accessList = tx.accessList;
        }
        // This will get overwritten by blobs, if present
        if (tx.blobVersionedHashes != null) {
            result.blobVersionedHashes = tx.blobVersionedHashes;
        }
        // Make sure we assign the kzg before assigning blobs, which
        // require the library in the event raw blob data is provided.
        if (tx.kzg != null) {
            result.kzg = tx.kzg;
        }
        if (tx.blobs != null) {
            result.blobs = tx.blobs;
        }
        if (tx.elderPublicKey != null) {
            result.elderPublicKey = tx.elderPublicKey;
        }
        if (tx.elderAccountSequence != null) {
            result.elderAccountSequence = tx.elderAccountSequence;
        }
        if (tx.hash != null) {
            ethers.assertArgument(
                result.isSigned(),
                "unsigned transaction cannot define '.hash'",
                "tx",
                tx
            );
            ethers.assertArgument(
                result.hash === tx.hash,
                "hash mismatch",
                "tx",
                tx
            );
        }
        if (tx.from != null) {
            ethers.assertArgument(
                result.isSigned(),
                "unsigned transaction cannot define '.from'",
                "tx",
                tx
            );
            ethers.assertArgument(
                result.from.toLowerCase() === (tx.from || "").toLowerCase(),
                "from mismatch",
                "tx",
                tx
            );
        }
        return result;
    }

    get hash() {
        return ethers.keccak256(this.#getSerialized());
    }

    #getSerialized() {
        return serializeElderTx(this);
    }

    get serialized() {
        return this.#getSerialized();
    }

    set elderAccountSequence(value) {
        this.#elderAccountSequence = ethers.getBigInt(
            value,
            "elderAccountSequence"
        );
    }

    get elderAccountSequence() {
        return this.#elderAccountSequence;
    }

    set elderPublicKey(value) {
        this.#elderPublicKey = value;
    }

    get elderPublicKey() {
        return this.#elderPublicKey;
    }
}

export default ElderTransaction;
