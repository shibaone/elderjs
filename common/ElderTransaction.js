import { ethers } from 'ethers';

const BN_0 = BigInt(0);

class ElderTransaction extends ethers.Transaction {
    #elderAccountSequence;
    #elderPublicKey;

    constructor() {
        super();
        this.#elderPublicKey = "";
        this.#elderAccountSequence = BN_0;
    }

    static from(tx) {
        if (tx == null) {
            return new ElderTransaction();
        }
        if (typeof (tx) === "string") {
            const payload = getBytes(tx);
            if (payload[0] >= 0x7f) { // @TODO: > vs >= ??
                return ElderTransaction.from(_parseLegacy(payload));
            }
            switch (payload[0]) {
                case 1: return ElderTransaction.from(_parseEip2930(payload));
                case 2: return ElderTransaction.from(_parseEip1559(payload));
                case 3: return ElderTransaction.from(_parseEip4844(payload));
            }
            assert(false, "unsupported transaction type", "UNSUPPORTED_OPERATION", { operation: "from" });
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
            ethers.assertArgument(result.isSigned(), "unsigned transaction cannot define '.hash'", "tx", tx);
            ethers.assertArgument(result.hash === tx.hash, "hash mismatch", "tx", tx);
        }
        if (tx.from != null) {
            ethers.assertArgument(result.isSigned(), "unsigned transaction cannot define '.from'", "tx", tx);
            ethers.assertArgument(result.from.toLowerCase() === (tx.from || "").toLowerCase(), "from mismatch", "tx", tx);
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
        return this.#getSerialized(true, true);
    }

    set elderAccountSequence(value) {
        this.#elderAccountSequence = ethers.getBigInt(value, "elderAccountSequence");
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

function formatNumber(_value, name) {
    const value = ethers.getBigInt(_value, "value");
    const result = ethers.toBeArray(value);
    ethers.assertArgument(result.length <= 32, `value too large`, `tx.${name}`, value);
    return result;
}

function formatAccessList(value) {
    return ethers.accessListify(value).map((set) => [set.address, set.storageKeys]);
}

function serializeElderTx(tx) {
    const fields = [
        formatNumber(tx.chainId, "chainId"),
        formatNumber(tx.nonce, "nonce"),
        formatNumber(tx.gasLimit, "gasLimit"),
        (tx.to || "0x"),
        formatNumber(tx.value, "value"),
        tx.data,
        formatAccessList(tx.accessList || [])
    ];

    fields.push(tx.elderPublicKey);
    fields.push(formatNumber(tx.elderAccountSequence));

    return ethers.encodeRlp(fields);
}

export default ElderTransaction;
