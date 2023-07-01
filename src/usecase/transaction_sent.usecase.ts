import { Crypto } from "archethic";
import { Deps } from "../deps.js";
import { Transaction } from "../ports/blockchain.repository.js";
import { TxSentEvent } from "../ports/pubsub.api.js";

export class UnknownTransactionError extends Error { }
export class InvalidNotificationDelayError extends Error { }
export class InvalidNotificationSignatureError extends Error { }

export class TransactionSent {
    _pubSubApi = Deps.instance.pubSubApi
    _blockchainRepository = Deps.instance.blockchainRepository
    _pushNotifsRepository = Deps.instance.pushNotifsRepository
    _transactionMaxAge = Deps.instance.configuration.transactionMaxAge


    async run(event: TxSentEvent) {
        const transaction = await this._blockchainRepository.getTransaction(event.txAddress);
        if (transaction === null) {
            console.log(`Notification rejected : unknown transaction`)
            throw new UnknownTransactionError();
        }

        if (!this._isNotificationDelayValid(transaction)) {
            console.log(`Notification rejected : too much time elapsed since Transaction creation`)
            throw new InvalidNotificationDelayError();
        }

        if (!this._isEventSignatureValid(transaction, event)) {
            console.log(`Notification rejected : Invalid event signature.`)
            throw new InvalidNotificationSignatureError();
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