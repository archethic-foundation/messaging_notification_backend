import { TxSentEvent } from "./pubsub.api.js";

export interface PushNotificationRepository {
    init(): Promise<void>;

    dispose(): Promise<void>;

    subscribeToken(
        txChainAddress: string,
        pushToken: string,
    ): Promise<void>;

    unsubscribeToken(
        txChainAddress: string,
        pushToken: string,
    ): Promise<void>;

    getSubscribedTokens(
        txChainAddress: string,
    ): Promise<Array<string>>;

    emitTxSentEvent(txSentEvent: TxSentEvent): Promise<void>;
}