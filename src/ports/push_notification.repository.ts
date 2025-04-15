import { PushNotificationSettings } from "./http.api.js";
import { MessagingNotification } from "./pubsub.api.js";

export interface PushNotificationRepository {
    init(): Promise<void>;

    dispose(): Promise<void>;

    updateSettings(
        pushSettings: PushNotificationSettings,
    ): Promise<void>;

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

    emitNotification(notification: MessagingNotification): Promise<void>;

    sentNotificationExists(txAddress: string): Promise<boolean>;

    registerSentNotification(
        txAddress: string,
        expirationDate: Date,
    ): Promise<void>;
}