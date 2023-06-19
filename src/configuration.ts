export type RedisConf = {
    port: number
    host: string
}

export type Configuration = {
    port: number
    redis: RedisConf
}

export const configuration = (): Configuration => ({
    port: parseNumber(process.env.PORT) ?? 3000,
    redis: {
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
    },
});

function parseNumber(stringValue: String): number | undefined {
    const numberOrNan = Number(stringValue)
    if (isNaN(numberOrNan)) return undefined;
    return numberOrNan;
}