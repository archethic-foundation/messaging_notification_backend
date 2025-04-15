import { Crypto } from "@archethicjs/sdk";
import { Transaction } from "ports/blockchain.repository.js";
import { Deps } from "../../deps.js";


export class IsEventSignatureValid {
    _transactionMaxAge = Deps.instance.configuration.transactionMaxAge

    guard(transaction: Transaction, signature: string): boolean {
        return Crypto.verify(
            signature,
            transaction.address,
            transaction.previousPublicKey,
        );

    }
}


