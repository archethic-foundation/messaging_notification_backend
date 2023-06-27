export type TxChainPushSubscription = {
    pushToken: string,
    txChainGenesisAddresses: Array<string>
}

export type TxChainPushUnsubscription = {
    pushToken: string,
    txChainGenesisAddresses: Array<string>
}

export type HttpApi = {
    start(): Promise<void>
}