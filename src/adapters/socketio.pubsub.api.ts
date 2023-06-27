import { createAdapter } from "@socket.io/redis-adapter";
import express, { Request, Response } from 'express';
import * as http from "http";
import { PushNotificationRepository } from "ports/push_notification.repository.js";
import { createClient } from "redis";
import * as socketio from "socket.io";
import { RedisConf, RedisConfUtils } from '../configuration.js';
import { HttpApi, TxChainPushSubscription, TxChainPushUnsubscription } from "../ports/http.api.js";
import { PubSubApi, TxChainSubscription, TxSentEvent } from "../ports/pubsub.api.js";
import { TransactionSent } from "../usecase/transaction_sent.usecase.js";


export enum PubSubEvent {
    txSent = "TxSent"
}

export class SocketIoPubSubApi implements PubSubApi, HttpApi {
    _port: number
    _redisConf: RedisConf
    _app
    _socketIo: socketio.Server
    _pubClient;
    _subClient;
    _httpServer: http.Server
    _pushNotificationRepository: PushNotificationRepository

    constructor(
        port: number,
        redisConf: RedisConf,
        pushNotificationRepository: PushNotificationRepository,
    ) {
        this._port = port
        this._redisConf = redisConf
        this._app = express()
        this._pushNotificationRepository = pushNotificationRepository

        this._setupExpress()
        this._setupSocketIo()
    }

    _setupExpress() {
        this._app = express()

        this._app.use(express.json())

        this._app.get('/', (req: Request, res: Response) => {
            res.send('Express + TypeScript Server');
        })

        this._app.post(
            '/transactionSent',
            async (req: Request, res: Response) => {
                try {
                    console.log(req.body)
                    const txSentEvent = req.body as TxSentEvent
                    console.log(`Transaction ${txSentEvent.txAddress} sent on chain ${txSentEvent.txChainGenesisAddress} event.`)

                    await new TransactionSent().run(txSentEvent)

                    res.status(200).send()

                } catch (e) {
                    console.log('TransactionSent failed', e)
                    res.status(500).send()
                }
            }
        )

        this._app.post(
            '/subscribe',
            async (req: Request, res: Response) => {
                try {
                    console.log(req.body)
                    const subscribeCommand = req.body as TxChainPushSubscription
                    console.log(`Subscription command received for chain ${subscribeCommand.txChainGenesisAddresses} with push token ${subscribeCommand.pushToken}.`)

                    for (const txChainGenesisAddress of subscribeCommand.txChainGenesisAddresses) {
                        await this._pushNotificationRepository.subscribeToken(
                            txChainGenesisAddress,
                            subscribeCommand.pushToken,
                        )
                    }
                    res.status(200).send()
                } catch (e) {
                    console.log('Subscription to push notifs failed', e)
                    res.status(500).send()
                }
            }
        )

        this._app.post(
            '/unsubscribe',
            async (req: Request, res: Response) => {
                try {
                    console.log(req.body)
                    const unsubscribeCommand = req.body as TxChainPushUnsubscription
                    console.log(`Unsubscription command received for chain ${unsubscribeCommand.txChainGenesisAddresses} with push token ${unsubscribeCommand.pushToken}.`)

                    for (const txChainGenesisAddress of unsubscribeCommand.txChainGenesisAddresses) {
                        await this._pushNotificationRepository.unsubscribeToken(
                            txChainGenesisAddress,
                            unsubscribeCommand.pushToken,
                        )
                    }

                    res.status(200).send()
                } catch (e) {
                    console.log('Unsubscription to push notifs failed', e)
                    res.status(500).send()
                }
            }
        )

        this._httpServer = http.createServer(this._app);
    }

    _txChainChannel(txChainAddress: string): string {
        return `txChain:${txChainAddress.toLowerCase()}`
    }

    _setupSocketIo() {
        this._pubClient = createClient({ url: RedisConfUtils.url(this._redisConf) });
        this._subClient = this._pubClient.duplicate();

        this._socketIo = new socketio.Server(
            this._httpServer,
            {
                transports: ['websocket'],
                adapter: createAdapter(this._pubClient, this._subClient)
            }
        );
        this._socketIo.on("connection", async (socket) => {
            console.log(socket);

            socket.on("subscribe", (data) => {
                try {
                    const txChainSubscription = data as TxChainSubscription
                    const channels = txChainSubscription.txChainGenesisAddresses.map(
                        txChainGenesisAddress => this._txChainChannel(txChainGenesisAddress),
                    )
                    socket.join(channels)
                    console.log(`${socket.id} subscribed to TxChains ${txChainSubscription.txChainGenesisAddresses}\n\tChannels joined : ${channels}`);
                } catch (e) {
                    console.log('Subscription failed', e)
                }
            });

            socket.on("unsubscribe", (data) => {
                try {
                    console.log(data)
                    const txChainSubscription = data as TxChainSubscription
                    const channels = txChainSubscription.txChainGenesisAddresses.map(
                        txChainGenesisAddress => this._txChainChannel(txChainGenesisAddress),
                    )
                    for (const channel of channels) {
                        socket.leave(channel)
                    }
                    console.log(`${socket.id} unsubscribed to TxChains ${txChainSubscription.txChainGenesisAddresses}\n\tChannels left : ${channels}`);
                } catch (e) {
                    console.log('Unsubscription failed', e)
                }
            });

            console.log("Set up done ");
        });

    }

    async start() {
        await this._pubClient.connect()
        await this._subClient.connect()
        this._httpServer.listen(this._port, () => {
            console.log(`⚡️[server]: Server is running at http://localhost:${this._port}`);
        });
    }

    async emitTxSentEvent(txSentEvent: TxSentEvent) {
        console.log(`Emit TxSent event : ${txSentEvent}`)
        this._socketIo.to(this._txChainChannel(txSentEvent.txChainGenesisAddress)).emit(PubSubEvent.txSent, txSentEvent)
        console.log(`Did Emit TxSent event : ${txSentEvent}`)
    }
}

