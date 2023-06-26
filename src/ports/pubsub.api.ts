
export type TxSentEvent = {
    txChainGenesisAddress: string
    txAddress: string
    payloadSignature: string
}

export type TxChainSubscription = {
    txChainGenesisAddresses: Array<string>
}

export interface PubSubApi {
    start(): Promise<void>

    emitTxSentEvent(txSentEvent: TxSentEvent): Promise<void>;
}