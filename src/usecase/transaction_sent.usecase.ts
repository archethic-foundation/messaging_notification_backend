import { Crypto } from "archethic";
import { Deps } from "../deps.js";
import { TxSentEvent } from "../ports/pubsub.api.js";

export class TransactionSent {
    _archethic = Deps.instance.archethicClient
    _pubSubApi = Deps.instance.pubSubApi

    async run(event: TxSentEvent) {
        await this._archethic.connect()

        const previousPublicKey = await this._getPreviousPublicKey(event.txAddress)

        console.log(`prev pub key : ${previousPublicKey}`)

        const isValid = Crypto.verify(
            event.payloadSignature,
            `${event.txAddress}${event.txChainGenesisAddress}`,
            previousPublicKey,
        );
        console.log(`Is signature valid for ${event.txAddress}${event.txChainGenesisAddress} : ${isValid}`)
        this._pubSubApi.emitTxSentEvent(event)
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