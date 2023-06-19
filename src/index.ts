import * as RestApi from "./ports/rest.api";

async function bootstrap() {
    RestApi.instance.start()
}
bootstrap();