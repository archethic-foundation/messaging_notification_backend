import { Transaction } from "ports/blockchain.repository.js";
import { Deps } from "../../deps.js";


export class IsNotificationDelayValid {
    _transactionMaxAge = Deps.instance.configuration.transactionMaxAge

    guard(transaction: Transaction): boolean {
        return Date.now() - transaction.creationDate.getTime() < this._transactionMaxAge
    }
}
