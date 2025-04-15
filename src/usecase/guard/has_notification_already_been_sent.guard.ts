import { Deps } from "../../deps.js";


export class HasNotificationAlreadyBeenSent {
    _pushNotifsRepository = Deps.instance.pushNotifsRepository

    guard(txAddress: string): Promise<boolean> {
        return this._pushNotifsRepository.sentNotificationExists(txAddress);
    }
}