import { initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { TxSentEvent } from 'ports/pubsub.api.js';
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
        console.log(`Members to notify : ${subscribedTokens}`)
        const sendResult = await getMessaging().sendEachForMulticast({
            notification: {
                title: 'Message received',
            },
            tokens: subscribedTokens,
        })

        console.log(`${sendResult.successCount} notification successfully sent`)

    }
}