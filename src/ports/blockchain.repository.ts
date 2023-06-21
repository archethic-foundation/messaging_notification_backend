export type Transaction = {
    previousPublicKey: string
    creationDate: Date
}

export interface BlockchainRepository {
    getTransaction(txAddress: string): Promise<Transaction>;
}