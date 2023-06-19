import express, { Request, Response } from 'express';
import { configuration } from '../configuration';
import { RestServer } from '../ports/rest.api';
import { ListenNotifications } from '../usecases/listen_notifications';

const app = express()

export class ExpressRestApi implements RestServer {
    _port = configuration().port

    start() {
        app.get('/', (req: Request, res: Response) => {
            res.send('Express + TypeScript Server');
        })

        app.post(
            '/subscribe',
            (req: Request, res: Response) => {
                console.log(`Listening to Transactions on chain 0`)

                const listenNotifications = new ListenNotifications()
                listenNotifications.run(
                    '0',
                    (message) => {
                        console.log(`Transaction received : ${message}`)
                    }
                )
            }
        )

        app.listen(this._port, () => {
            console.log(`⚡️[server]: Server is running at http://localhost:${this._port}`);
        });
    }
}
