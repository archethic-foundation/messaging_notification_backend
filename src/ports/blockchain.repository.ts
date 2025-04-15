export type Transaction = {
    address: string
    previousPublicKey: string
    creationDate: Date
}

export type ChatSmartContractTransaction = {
    address: string
    previousPublicKey: string
    creationDate: Date
    membersPubKeys: string[]
}

export interface BlockchainRepository {
    getTransaction(txAddress: string): Promise<Transaction | null>;
    getChatTransaction(txAddress: string): Promise<ChatSmartContractTransaction | null>;
}