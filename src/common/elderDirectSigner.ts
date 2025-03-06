import { encodeSecp256k1Signature } from "@cosmjs/amino";
import { Secp256k1 } from "@cosmjs/crypto";
import { AccountData, DirectSignResponse, OfflineDirectSigner, makeSignBytes } from "@cosmjs/proto-signing";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { bytesToHex, getElderBech32AddressFromElderPublicKey } from "./helper";

declare var window: any

function convertSignatureTo64ByteUint8Array(signature: string): Uint8Array {
    // Remove '0x' prefix if present
    if (signature.startsWith('0x')) {
        signature = signature.slice(2);
    }

    // Ensure signature length is correct (65 bytes in hex = 130 characters)
    if (signature.length !== 130) {
        throw new Error("Signature length must be 65 bytes (130 hex characters)");
    }

    // Extract r and s from the signature
    const rHex = signature.slice(0, 64); // First 32 bytes in hex
    const sHex = signature.slice(64, 128); // Next 32 bytes in hex

    // Convert hex to bytes for r and s
    const rBytes = new Uint8Array(32);
    const sBytes = new Uint8Array(32);

    for (let i = 0; i < 32; i++) {
        rBytes[i] = parseInt(rHex.substr(i * 2, 2), 16);
        sBytes[i] = parseInt(sHex.substr(i * 2, 2), 16);
    }

    // Concatenate r and s into a single Uint8Array
    const result = new Uint8Array(64);
    result.set(rBytes);
    result.set(sBytes, 32);

    return result;
}

export class ElderDirectSecp256k1Wallet implements OfflineDirectSigner {
    /**
     * Creates a DirectSecp256k1Wallet from the given public key
     *
     * @param privkey The private key.
     * @param prefix The bech32 address prefix (human readable part). Defaults to "cosmos".
     */
    public static async fromCompressedPublicKey(compressedPubkey: Uint8Array, prefix = "elder"): Promise<ElderDirectSecp256k1Wallet> {
        return new ElderDirectSecp256k1Wallet(compressedPubkey, prefix);
    }

    public static async fromUncompressedPublicKey(uncompressedPubkey: Uint8Array, prefix = "elder"): Promise<ElderDirectSecp256k1Wallet> {
        return new ElderDirectSecp256k1Wallet(Secp256k1.compressPubkey(uncompressedPubkey), prefix);
    }

    private readonly pubkey: Uint8Array;
    private readonly prefix: string;

    private constructor(compressedPubkey: Uint8Array, prefix: string) {
        this.pubkey = compressedPubkey;
        this.prefix = prefix;
    }

    private get address(): string {
        return getElderBech32AddressFromElderPublicKey(this.pubkey);
    }

    public async getAccounts(): Promise<readonly AccountData[]> {
        return [
            {
                algo: "secp256k1",
                address: this.address,
                pubkey: this.pubkey,
            },
        ];
    }

    public async signDirect(address: string, signDoc: SignDoc): Promise<DirectSignResponse> {
        const signBytes = makeSignBytes(signDoc);
        if (address !== this.address) {
            throw new Error(`Address ${address} not found in wallet`);
        }

        const [account] = await window.ethereum.request({
            method: "eth_accounts",
        });

        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [bytesToHex(signBytes), account]
        });

        const signatureBytes = convertSignatureTo64ByteUint8Array(signature);
        const stdSignature = encodeSecp256k1Signature(this.pubkey, signatureBytes);
        return {
            signed: signDoc,
            signature: stdSignature,
        };
    }
}
