import Archethic from "archethic";
import { BlockchainRepository, Transaction } from "../ports/blockchain.repository.js";

export class LibjsBlockchainRepository implements BlockchainRepository {
  _archethic: Archethic

  constructor(archethic: Archethic) {
    this._archethic = archethic
    this._archethic.connect()
  }

  async getTransaction(txAddress: string): Promise<Transaction | null> {
    const query = `
        query {
          transaction(address:\"${txAddress}\") { previousPublicKey, validationStamp{timestamp} }
        }
        `;

    const response = await this._archethic.network.rawGraphQLQuery(query);
    if (response === null) return null
    return {
      previousPublicKey: response.transaction.previousPublicKey,
      creationDate: new Date(response.transaction.validationStamp.timestamp * 1000)
    }
  }
}