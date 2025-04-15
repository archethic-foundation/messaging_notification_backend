import { Deps } from "../deps.js";
import { MessageSentEvent, MessagingNotification } from "../ports/pubsub.api.js";
import { AlreadySentNotificationError, InvalidNotificationDelayError, InvalidNotificationSignatureError, UnknownTransactionError } from "./guard/errors.js";
import { HasNotificationAlreadyBeenSent } from "./guard/has_notification_already_been_sent.guard.js";
import { IsEventSignatureValid } from "./guard/is_event_signature_valid.guard.js";
import { IsNotificationDelayValid } from "./guard/is_notification_delay_valid.guard.js";

export class MessageSent {
    _pubSubApi = Deps.instance.pubSubApi
    _blockchainRepository = Deps.instance.blockchainRepository
    _pushNotifsRepository = Deps.instance.pushNotifsRepository
    _transactionMaxAge = Deps.instance.configuration.transactionMaxAge


    async run(event: MessageSentEvent) {
        const transaction = await this._blockchainRepository.getTransaction(event.txAddress);
        if (transaction === null) {
            console.log(`Notification rejected : unknown transaction`)
            throw new UnknownTransactionError();
        }

        if (!(new IsNotificationDelayValid).guard(transaction)) {
            console.log(`Notification rejected : too much time elapsed since Transaction creation`)
            throw new InvalidNotificationDelayError();
        }

        if (await (new HasNotificationAlreadyBeenSent).guard(event.txAddress)) {
            console.log(`Notification rejected : already sent for Transaction ${event.txAddress} creation`)
            throw new AlreadySentNotificationError();
        }

        if (!(new IsEventSignatureValid).guard(transaction, event.payloadSignature)) {
            console.log(`Notification rejected : Invalid event signature.`)
            throw new InvalidNotificationSignatureError();
        }

        await this._pushNotifsRepository.registerSentNotification(
            event.smartContractGenesisAddress,
            new Date(transaction.creationDate.getTime() + this._transactionMaxAge * 1.5),
        )

        const notification: MessagingNotification = {
            smartContractGenesisAddress: event.smartContractGenesisAddress,
            txAddress: event.txAddress,
            pushNotification: new Map([
                [
                    'en', {
                        title: 'Archethic',
                        body: 'You have received a new message',
                    },
                ],
                [
                    'fr', {
                        title: 'Archethic',
                        body: 'Vous avez reçu un nouveau message',
                    }
                ]
            ])
        }

        await this._pubSubApi.emitNotification(notification)
        await this._pushNotifsRepository.emitNotification(notification)
    }

}