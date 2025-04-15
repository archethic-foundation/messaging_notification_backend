import Archethic from "@archethicjs/sdk";
import { BlockchainRepository, ChatSmartContractTransaction, Transaction } from "../ports/blockchain.repository.js";

export class LibjsBlockchainRepository implements BlockchainRepository {
  _archethic: Archethic

  constructor(archethic: Archethic) {
    this._archethic = archethic
    this._archethic.connect()
  }

  async getChatTransaction(txAddress: string): Promise<ChatSmartContractTransaction | null> {
    const query = `
        query {
          transaction(address:\"${txAddress}\") { previousPublicKey, validationStamp{timestamp}, data { code } }
        }
        `;

    const response = await this._archethic.network.rawGraphQLQuery(query);
    if (response === null) return null


    return {
      address: txAddress,
      previousPublicKey: response.transaction.previousPublicKey,
      creationDate: new Date(response.transaction.validationStamp.timestamp * 1000),
      // TODO members list could be stored in SC secrets. 
      // This would require PushServer to :
      //    - have its own key pair
      //    - expose its pub key through API
      membersPubKeys: this._extractPublicKeys(response.transaction.data.code),
    }
  }

  _extractPublicKeys(text: string): string[] {
    const blockRegex = /condition transaction:\s*\[\s*previous_public_key:\s*List\.in\?\(\[\s*("([0-9A-F]+)"(?:,\s*"([0-9A-F]+)")*)\s*\]\s*,\s*Chain\.get_genesis_public_key\(transaction\.previous_public_key\)\s*\)\s*\]/;

    const match = text.match(blockRegex);

    if (!match) {
      return [];
    }

    const keysGroup = match[1];
    const keysRegex = /"([0-9A-F]+)"/g;
    const keysMatches = keysGroup.match(keysRegex);

    if (!keysMatches) {
      return [];
    }

    // Supprimer les guillemets autour des clés publiques
    return keysMatches.map(key => key.replace(/"/g, ''));
  }

  async getTransaction(txAddress: string): Promise<Transaction | null> {
    const query = `
        query {
          transaction(address:\"${txAddress}\") { previousPublicKey, validationStamp{timestamp}, data { code } }
        }
        `;

    const response = await this._archethic.network.rawGraphQLQuery(query);
    if (response === null) return null
    return {
      address: txAddress,
      previousPublicKey: response.transaction.previousPublicKey,
      creationDate: new Date(response.transaction.validationStamp.timestamp * 1000),
    }
  }
}