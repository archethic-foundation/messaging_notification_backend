import { Crypto } from "archethic";
import { Deps } from "../deps.js";
import { Transaction } from "../ports/blockchain.repository.js";
import { TxSentEvent } from "../ports/pubsub.api.js";

export class TransactionSent {
    _pubSubApi = Deps.instance.pubSubApi
    _blockchainRepository = Deps.instance.blockchainRepository
    _pushNotifsRepository = Deps.instance.pushNotifsRepository
    _transactionMaxAge = Deps.instance.configuration.transactionMaxAge


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
        await this._pubSubApi.emitTxSentEvent(event)
        await this._pushNotifsRepository.emitTxSentEvent(event)
    }

    _isNotificationDelayValid(transaction: Transaction): boolean {
        return Date.now() - transaction.creationDate.getTime() < this._transactionMaxAge
    }

    _isEventSignatureValid(transaction: Transaction, event: TxSentEvent): boolean {
        return Crypto.verify(
            event.payloadSignature,
            `${event.txAddress}${event.txChainGenesisAddress}`,
            transaction.previousPublicKey,
        );

    }

}