import { initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PushNotificationSettings } from 'ports/http.api.js';
import { PushNotification, TxSentEvent } from 'ports/pubsub.api.js';
import { RedisClientType, createClient } from 'redis';
import { RedisConf } from '../configuration.js';
import { PushNotificationRepository } from '../ports/push_notification.repository.js';

export class RedisPushNotificationRepository implements PushNotificationRepository {
    _client: RedisClientType

    constructor(
        redisConfiguration: RedisConf,
    ) {
        this._client = createClient({
            socket: {
                host: redisConfiguration.host,
                port: redisConfiguration.port
            }
        });
    }

    async init() {
        initializeApp()
        this._client.on('error', err => console.log('Redis Client Error', err));
        await this._client.connect();
    }

    async dispose() {
        this._client.disconnect()
    }

    _chainSubscribedPushTokensKey(txChainAddress: string): string {
        return `txChain:${txChainAddress.toLowerCase()}:pushTokens`
    }

    _pushSettingsKey(pushToken: string): string {
        return `pushToken:${pushToken.toLowerCase()}:settings`
    }

    async updateSettings(
        pushSettings: PushNotificationSettings,
    ): Promise<void> {
        await this._client.HSET(
            this._pushSettingsKey(pushSettings.pushToken),
            'locale', pushSettings.locale,
        )
    }

    async readSettings(
        pushToken: string,
    ): Promise<PushNotificationSettings | undefined> {
        const result = await this._client.HGET(
            this._pushSettingsKey(pushToken),
            'locale',
        )
        if (result == null) return undefined
        return {
            pushToken: pushToken,
            locale: result,
        }
    }

    async removeSettings(
        pushToken: string,
    ): Promise<void> {
        await this._client.HDEL(
            this._pushSettingsKey(pushToken),
            'locale',
        )
    }

    async subscribeToken(
        txChainAddress: string,
        pushToken: string,
    ): Promise<void> {
        await this._client.SADD(this._chainSubscribedPushTokensKey(txChainAddress), pushToken)
    }

    async unsubscribeToken(
        txChainAddress: string,
        pushToken: string,
    ): Promise<void> {
        await this._client.SREM(this._chainSubscribedPushTokensKey(txChainAddress), pushToken)
    }

    async getSubscribedTokens(
        txChainAddress: string,
    ): Promise<Array<string>> {
        return this._client.SMEMBERS(this._chainSubscribedPushTokensKey(txChainAddress))
    }

    async emitTxSentEvent(
        txSentEvent: TxSentEvent,
    ): Promise<void> {
        const subscribedTokens = await this.getSubscribedTokens(txSentEvent.txChainGenesisAddress);
        if (subscribedTokens.length == 0) return;
        console.log(`[PUSH] Members to notify : ${subscribedTokens}`)


        const availableLocales = Array.from(txSentEvent.pushNotification.keys())
        if (availableLocales.length == 0) return;

        const tokensGroupedByLocale = await this._groupTokensByLocale(
            subscribedTokens,
            availableLocales,
        )

        for (const [locale, tokens] of tokensGroupedByLocale.entries()) {
            const sendResult = await this._sendNotifications(
                tokens,
                txSentEvent.pushNotification.get(locale),
            )

            for (const invalidTokens of sendResult.invalidTokens) {
                console.log(`[PUSH] Removing invalid Push token : ${invalidTokens}`)
                await this.unsubscribeToken(txSentEvent.txChainGenesisAddress, invalidTokens)
                await this.removeSettings(invalidTokens)
            }

            console.log(`[PUSH] ${sendResult.successTokens.length} push notifications successfully sent with locale ${locale}`)

        }
    }

    async _sendNotifications(
        tokens: Array<string>,
        notification: PushNotification,
    ): Promise<{
        successTokens: Array<string>,
        failedTokens: Array<string>,
        invalidTokens: Array<string>,
    }> {
        const sendResult = await getMessaging().sendEachForMulticast({
            notification: {
                title: notification.title,
                body: notification.body,
            },
            tokens: tokens,
        })

        const tokensWithResult = sendResult.responses.map(
            (response, index) => {
                const errorCode = response.error?.code
                return {
                    token: tokens[index],
                    success: response.success,
                    isTokenValid: errorCode !== 'messaging/unregistered',
                }
            });
        return {
            successTokens: tokensWithResult.filter((tokenWithResult) => tokenWithResult.success).map((tokenWithResult) => tokenWithResult.token),
            failedTokens: tokensWithResult.filter((tokenWithResult) => !tokenWithResult.success).map((tokenWithResult) => tokenWithResult.token),
            invalidTokens: tokensWithResult.filter((tokenWithResult) => !tokenWithResult.isTokenValid).map((tokenWithResult) => tokenWithResult.token),
        }
    }

    async _groupTokensByLocale(
        tokens: Array<string>,
        availableLocales: Array<string>,
    ): Promise<Map<string, Array<string>>> {
        const groupedTokens = new Map<string, Array<string>>()

        for (const token of tokens) {
            const tokenSettings = await this.readSettings(token)
            if (tokenSettings == null) continue

            const resolvedLocale = availableLocales.find(
                (availableLocale) => {
                    return availableLocale == tokenSettings.locale
                }
            ) ?? availableLocales[0]

            groupedTokens.set(
                resolvedLocale,
                [
                    ...groupedTokens[resolvedLocale] ?? [],
                    token
                ],
            )
        }

        return groupedTokens
    }



    private _sentNotificationKey(txAddress: string) {
        return `sent_${txAddress}`
    }

    async sentNotificationExists(txAddress: string): Promise<boolean> {
        const isSent = await this._client.GET(this._sentNotificationKey(txAddress))
        return isSent === '1';
    }

    async registerSentNotification(event: TxSentEvent, expirationDate: Date): Promise<void> {
        await this._client.SET(this._sentNotificationKey(event.txAddress), '1')
        await this._client.EXPIREAT(this._sentNotificationKey(event.txAddress), expirationDate)
    }
}