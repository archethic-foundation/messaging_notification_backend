export type PushNotification = {
    title: string
    body: string
}

export type TxSentEvent = {
    txChainGenesisAddress: string
    txAddress: string
    payloadSignature: string
    pushNotification: Map<string, PushNotification>
    type: string
}

export type TxChainWebsocketSubscription = {
    txChainGenesisAddresses: Array<string>,
}

export interface PubSubApi {
    start(): Promise<void>

    emitTxSentEvent(txSentEvent: TxSentEvent): Promise<void>;
}