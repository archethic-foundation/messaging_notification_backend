import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator'

export type RedisConf = {
    port: number
    host: string
}

export type ArchethicConf = {
    endpoint: string
}

export abstract class RedisConfUtils {
    static url(redisConf: RedisConf): string {
        return `redis://${redisConf.host}:${redisConf.port}`
    }
}

export type Configuration = {
    instanceName: string
    port: number
    redis: RedisConf
    archethic: ArchethicConf
    transactionMaxAge: number //expressed in milliseconds
}

export const configuration = (): Configuration => ({
    instanceName: process.env.INSTANCE_NAME ?? uniqueNamesGenerator({ dictionaries: [adjectives, animals], length: 2, }),
    port: parseNumber(process.env.PORT) ?? 3000,
    transactionMaxAge: 15000,
    redis: {
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
    },
    archethic: {
        endpoint: process.env.ARCHETHIC_ENDPOINT
    }
});

function parseNumber(stringValue: String): number | undefined {
    const numberOrNan = Number(stringValue)
    if (isNaN(numberOrNan)) return undefined;
    return numberOrNan;
}