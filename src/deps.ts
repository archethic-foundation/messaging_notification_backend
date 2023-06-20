import Archethic from "archethic";
import { SocketIoPubSubApi } from "./adapters/socketio.pubsub.api.js";
import * as conf from "./configuration.js";
import { HttpApi } from "./ports/http.api.js";
import { PubSubApi } from "./ports/pubsub.api.js";

export class Deps {
    static _instance: Deps

    static get instance() {
        return Deps._instance ??= new Deps()
    }

    configuration: conf.Configuration
    httpApi: HttpApi
    pubSubApi: PubSubApi
    archethicClient: Archethic

    constructor() {
        this.configuration = conf.configuration()
        this.archethicClient = new Archethic(this.configuration.archethic.endpoint)
        this.pubSubApi = new SocketIoPubSubApi(
            this.configuration.port,
            this.configuration.redis,
        )
        this.httpApi = this.pubSubApi
    }
}