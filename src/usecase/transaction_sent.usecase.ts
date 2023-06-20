import { Deps } from "../deps.js";
import { TxSentEvent } from "../ports/pubsub.api.js";

export class TransactionSent {
    _archethic = Deps.instance.archethicClient
    async run(event: TxSentEvent) {
        await this._archethic.connect()

        const previousPublicKey = await this._getPreviousPublicKey(event.txAddress)

        console.log(`prev pub key : ${previousPublicKey}`)

        // TODO check event.payloadSignature against previousPublicKey
    }

    async _getPreviousPublicKey(txAddress: string): Promise<string> {
        const query = `
        query {
          transaction(address:\"${txAddress}\") { previousPublicKey }
        }
        `;

        const response = await this._archethic.network.rawGraphQLQuery(query);
        return response.transaction.previousPublicKey
    }
}