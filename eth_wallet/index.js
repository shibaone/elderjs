import { StargateClient } from "@cosmjs/stargate";
import { ethers } from "ethers";
import { hexToUint8Array } from "../common/helper.js";
import { toBech32 } from "@cosmjs/encoding";
import { rawSecp256k1PubkeyToRawAddress } from "@cosmjs/amino";

async function eth_getAccountNumberAndSequence(rpcEndpoint, elderAddress) {
    try {
        const client = await StargateClient.connect(rpcEndpoint); 
        const accountInfo = await client.getAccount(elderAddress);

        return { elderAccountNumber: accountInfo.accountNumber, elderAccountSequence: accountInfo.sequence }; 
    } catch (error) {
        console.error("Failed to query accountInfo : ", error);
    }

}

function eth_getElderMsgAndFee(tx, elderAddress, gasLimit, value, chainId, rollID, accNum, elderPublicKey, elderAccountSequence) {
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

    return { elderMsg, elderFee, tx_hash };
}

async function eth_getElderAccountInfoFromSignature(message, signature) {
    const msgHash = ethers.hashMessage(message);
    const msgHashBytes = ethers.getBytes(msgHash);

    const recoveredPublicKey = ethers.SigningKey.recoverPublicKey(msgHashBytes, signature);

    const compressedPublicKey = ethers.SigningKey.computePublicKey(recoveredPublicKey, true);

    var pubKeyBytes = hexToUint8Array(compressedPublicKey.slice(2));

    let elderAddr = toBech32("elder", rawSecp256k1PubkeyToRawAddress(pubKeyBytes));

    return { elderAddr, recoveredPublicKey };
}


export { eth_getAccountNumberAndSequence, eth_getElderMsgAndFee, eth_getElderAccountInfoFromSignature };
