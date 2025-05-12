import type { Coin } from "@cosmjs/proto-signing";

export interface ElderMessage {
    typeUrl: string;
    value: {
        sender: string;
        rollId: number;
        txData: Uint8Array<ArrayBuffer>;
        accNum: number | string;
    };
}

export interface ElderFee {
    amount: Array<Coin>;
    gas: number;
}

export interface ElderConfig {
    chainName: string;
    rpc: string;
    rest: string;
    rollID: number;
    rollChainID: number;
    eth_rpc: string;
}

export interface GasData {
    gas_info: {
        gas_used: string;
    };
}
