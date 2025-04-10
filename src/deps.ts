import Archethic from "@archethicjs/sdk";
import { SocketIoPubSubApi } from "./adapters/express_socketio.api.js";
import { LibjsBlockchainRepository } from "./adapters/libjs.blockchain.repository.js";
import { RedisPushNotificationRepository } from "./adapters/push_notification.repository.js";
import * as conf from "./configuration.js";
import { BlockchainRepository } from "./ports/blockchain.repository.js";
import { HttpApi } from "./ports/http.api.js";
import { PubSubApi } from "./ports/pubsub.api.js";
import { PushNotificationRepository } from "./ports/push_notification.repository.js";

export class Deps {
    static _instance: Deps

    static get instance() {
        return Deps._instance ??= new Deps()
    }

    configuration: conf.Configuration
    httpApi: HttpApi
    pubSubApi: PubSubApi
    blockchainRepository: BlockchainRepository
    pushNotifsRepository: PushNotificationRepository

    constructor() {
        this.configuration = conf.configuration()
        this.pushNotifsRepository = new RedisPushNotificationRepository(
            this.configuration.redis
        )
        this.pubSubApi = new SocketIoPubSubApi(
            this.configuration.port,
            this.configuration.redis,
            this.pushNotifsRepository,
        )
        this.httpApi = this.pubSubApi
        this.blockchainRepository = new LibjsBlockchainRepository(
            new Archethic(this.configuration.archethic.endpoint),
        )
    }
}