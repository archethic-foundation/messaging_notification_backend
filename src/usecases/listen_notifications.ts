import { PubSubRepository, instance } from "../ports/pub_sub.repository";

export class ListenNotifications {
    _database: PubSubRepository = instance;

    async run(
        txGenesisAddress: String,
        listener: (message: String) => void,
    ): Promise<Error | undefined> {
        await this._database.subscribe(
            `TxSent_ ${txGenesisAddress}`,
            listener
        );
        return undefined;
    }
}