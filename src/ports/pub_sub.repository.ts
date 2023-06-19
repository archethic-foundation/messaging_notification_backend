import { RedisDatabase } from "../adapters/redis.pub_sub.repository"

export type PubSubRepository = {
    subscribe(
        channel: string,
        listener: (message: String) => void
    ): Promise<void>
}

export const instance = new RedisDatabase()