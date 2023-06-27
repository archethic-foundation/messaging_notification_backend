import { Deps } from "./deps.js";

async function bootstrap() {
    console.log(`Starting with configuration : ${JSON.stringify(Deps.instance.configuration)}`)

    await Deps.instance.httpApi.start()
    await Deps.instance.pushNotifsRepository.init()
}
bootstrap();