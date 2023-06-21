import { Crypto } from "archethic";
import { Deps } from "../deps.js";
import { Transaction } from "../ports/blockchain.repository.js";
import { TxSentEvent } from "../ports/pubsub.api.js";

export class TransactionSent {
    _pubSubApi = Deps.instance.pubSubApi
    _blockchainRepository = Deps.instance.blockchainRepository

    static _maxNotificationDelay = 5000;

    async run(event: TxSentEvent) {
        const transaction = await this._blockchainRepository.getTransaction(event.txAddress);
        if (!this._isNotificationDelayValid(transaction)) {
            console.log(`Notification rejected : too much time elapsed since Transaction creation`)
            return
        }

        if (!this._isEventSignatureValid(transaction, event)) {
            console.log(`Notification rejected : Invalid event signature.`)
            return
        }
        this._pubSubApi.emitTxSentEvent(event)
    }

    _isNotificationDelayValid(transaction: Transaction): boolean {
        return Date.now() - transaction.creationDate.getTime() < TransactionSent._maxNotificationDelay
    }

    _isEventSignatureValid(transaction: Transaction, event: TxSentEvent): boolean {
        return Crypto.verify(
            event.payloadSignature,
            `${event.txAddress}${event.txChainGenesisAddress}`,
            transaction.previousPublicKey,
        );

    }

}