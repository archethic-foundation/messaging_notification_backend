export type PushNotification = {
    title: string
    body: string
}

export type MessagingNotification = {
    smartContractGenesisAddress: string
    txAddress: string
    pushNotification: Map<string, PushNotification> // TODO this should be set by the backend itself.
}


export type ChatCreatedEvent = {
    smartContractGenesisAddress: string
    payloadSignature: string
}

export type MessageSentEvent = {
    smartContractGenesisAddress: string
    txAddress: string
    payloadSignature: string
}

export type TxChainWebsocketSubscription = {
    txChainGenesisAddresses: Array<string>,
}

export interface PubSubApi {
    start(): Promise<void>

    emitNotification(notification: MessagingNotification): Promise<void>;
}