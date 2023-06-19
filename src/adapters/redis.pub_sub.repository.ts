import { createClient } from 'redis';
import { configuration } from '../configuration';
import { PubSubRepository } from '../ports/pub_sub.repository';
export class RedisDatabase implements PubSubRepository {
    _client = createClient({
        socket: {
            host: configuration().redis.host,
            port: configuration().redis.port
        }
    });

    async init() {
        this._client.on('error', err => console.log('Redis Client Error', err));
        await this._client.connect();
    }

    async dispose() {
        this._client.disconnect()
    }

    async subscribe(
        channel: string,
        listener: (message: String) => void
    ): Promise<void> {
        const subscriber = this._client.duplicate()
        await subscriber.connect();

        await subscriber.subscribe(channel, listener);
    }
}