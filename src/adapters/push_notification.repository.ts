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
        this._client.on('error', err => console.log('Redis Client Error', err));
        await this._client.connect();
    }

    async dispose() {
        this._client.disconnect()
    }

    async subscribeToken(
        txChainAddress: string,
        pushToken: string,
    ): Promise<void> {
        await this._client.SADD(`txChain:${txChainAddress}:pushTokens`, pushToken)
    }

    async unsubscribeToken(
        txChainAddress: string,
        pushToken: string,
    ): Promise<void> {
        await this._client.SREM(`txChain:${txChainAddress}:pushTokens`, pushToken)
    }

    async getSubscribedTokens(
        txChainAddress: string,
    ): Promise<Array<string>> {
        return this._client.SMEMBERS(`txChain:${txChainAddress}:pushTokens`)
    }


}