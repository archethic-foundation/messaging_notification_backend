import { ExpressRestApi } from "../adapters/express.rest.api"

export type RestServer = {
    start()
}

export const instance: RestServer = new ExpressRestApi()