export type RedisConf = {
    port: number
    host: string
}

export type Configuration = {
    port: number
    redis: RedisConf
}

export const configuration = (): Configuration => ({
    port: Number(process.env.PORT) ?? 3000,
    redis: {
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
    },
});