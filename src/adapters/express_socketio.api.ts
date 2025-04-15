import { createAdapter } from "@socket.io/redis-adapter";
import express, { Request, Response } from 'express';
import * as http from "http";
import { PushNotificationRepository } from "ports/push_notification.repository.js";
import { createClient } from "redis";
import * as socketio from "socket.io";
import { ChatCreated } from "usecase/chat_created.usecase.js";
import { AlreadySentNotificationError, InvalidNotificationDelayError, InvalidNotificationSignatureError, UnknownTransactionError } from "usecase/guard/errors.js";
import { MessageSent } from "usecase/message_sent.usecase.js";
import { RedisConf, RedisConfUtils } from '../configuration.js';
import { HttpApi, PushNotificationSettings, TxChainPushSubscription, TxChainPushUnsubscription } from "../ports/http.api.js";
import { ChatCreatedEvent, MessageSentEvent, MessagingNotification, PubSubApi, TxChainWebsocketSubscription } from "../ports/pubsub.api.js";


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
            '/chatCreated',
            async (req: Request, res: Response) => {
                try {
                    const chatCreatedEvent: ChatCreatedEvent = {
                        smartContractGenesisAddress: req.body.contractTxAddress,
                        payloadSignature: req.body.payloadSignature
                    }
                    console.log(`⚡️ Chat ${chatCreatedEvent.smartContractGenesisAddress} created.`)


                    await new ChatCreated().run(chatCreatedEvent)

                    res.status(200).send()


                } catch (e) {

                }
            }
        )

        this._app.post(
            '/messageSent',
            async (req: Request, res: Response) => {
                try {
                    const messageSentEvent: MessageSentEvent = {
                        smartContractGenesisAddress: req.body.smartContractGenesisAddress,
                        txAddress: req.body.txAddress,
                        payloadSignature: req.body.payloadSignature,
                    }

                    console.log(`⚡️ Transaction ${messageSentEvent.txAddress} sent on chain ${messageSentEvent.smartContractGenesisAddress} event.`)

                    await new MessageSent().run(messageSentEvent)

                    res.status(200).send()

                } catch (e) {
                    console.log('TransactionSent failed', e)
                    if (e instanceof UnknownTransactionError) {
                        res.status(404).send({
                            "error": "Unknown transaction."
                        })
                        return
                    } else if (e instanceof InvalidNotificationDelayError) {
                        res.status(400).send({
                            "error": "Notification delay expired."
                        })
                        return
                    } else if (e instanceof InvalidNotificationSignatureError) {
                        res.status(400).send({
                            "error": "Invalid payload signature."
                        })
                        return
                    } else if (e instanceof AlreadySentNotificationError) {
                        res.status(400).send({
                            "error": "Notification already sent for that transaction."
                        })
                        return
                    } else if (e instanceof TypeError) {
                        res.status(400).send({
                            "error": "Invalid body format."
                        })
                        return
                    }
                    res.status(500).send()
                }
            }
        )

        this._app.put(
            '/pushSettings',
            async (req: Request, res: Response) => {
                try {
                    const pushSettings = req.body as PushNotificationSettings
                    console.log(`[PUSH] Updating push notifications settings : ${JSON.stringify(pushSettings)}`)

                    await this._pushNotificationRepository.updateSettings(pushSettings)
                } catch (e) {
                    console.log('[PUSH] Push notifications settings update failed', e)
                    if (e instanceof TypeError) {
                        res.status(400).send({
                            "error": "Invalid body format."
                        })
                        return
                    }

                    res.status(500).send()
                }
            }
        )

        this._app.post(
            '/subscribePush',
            async (req: Request, res: Response) => {
                try {
                    const subscribeCommand = req.body as TxChainPushSubscription
                    console.log(`[PUSH] Subscription command received for chain ${subscribeCommand.txChainGenesisAddresses} with push token ${subscribeCommand.pushToken}.`)

                    for (const txChainGenesisAddress of subscribeCommand.txChainGenesisAddresses) {
                        await this._pushNotificationRepository.subscribeToken(
                            txChainGenesisAddress,
                            subscribeCommand.pushToken,
                        )
                    }
                    res.status(200).send()
                } catch (e) {
                    console.log('[PUSH] Subscription to push notifs failed', e)
                    if (e instanceof TypeError) {
                        res.status(400).send({
                            "error": "Invalid body format."
                        })
                        return
                    }

                    res.status(500).send()
                }
            }
        )

        this._app.post(
            '/unsubscribePush',
            async (req: Request, res: Response) => {
                try {
                    const unsubscribeCommand = req.body as TxChainPushUnsubscription
                    console.log(`[PUSH] Unsubscription command received for chain ${unsubscribeCommand.txChainGenesisAddresses} with push token ${unsubscribeCommand.pushToken}.`)

                    for (const txChainGenesisAddress of unsubscribeCommand.txChainGenesisAddresses) {
                        await this._pushNotificationRepository.unsubscribeToken(
                            txChainGenesisAddress,
                            unsubscribeCommand.pushToken,
                        )
                    }

                    res.status(200).send()
                } catch (e) {
                    console.log('[PUSH] Unsubscription to push notifs failed', e)
                    if (e instanceof TypeError) {
                        res.status(400).send({
                            "error": "Invalid body format."
                        })
                        return
                    }
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
            socket.on("subscribe", (data) => {
                try {
                    const txChainSubscription = data as TxChainWebsocketSubscription
                    const channels = txChainSubscription.txChainGenesisAddresses.map(
                        txChainGenesisAddress => this._txChainChannel(txChainGenesisAddress),
                    )
                    socket.join(channels)
                    console.log(`[Websocket] ${socket.id} subscribed to TxChains ${txChainSubscription.txChainGenesisAddresses}`);
                } catch (e) {
                    console.log('[Websocket] Subscription failed', e)
                }
            });

            socket.on("unsubscribe", (data) => {
                try {
                    const txChainSubscription = data as TxChainWebsocketSubscription
                    const channels = txChainSubscription.txChainGenesisAddresses.map(
                        txChainGenesisAddress => this._txChainChannel(txChainGenesisAddress),
                    )
                    for (const channel of channels) {
                        socket.leave(channel)
                    }
                    console.log(`[Websocket] ${socket.id} unsubscribed to TxChains ${txChainSubscription.txChainGenesisAddresses}`);
                } catch (e) {
                    console.log('[Websocket] Unsubscription failed', e)
                }
            });

            console.log("[Websocket] New connection ready");
        });

    }

    async start() {
        await this._pubClient.connect()
        await this._subClient.connect()
        this._httpServer.listen(this._port, () => {
            console.log(`⚡️[server]: Server is running at http://localhost:${this._port}`);
        });
    }

    async emitNotification(notification: MessagingNotification) {
        console.log(`[Websocket] Emit Notification : {genesis: ${notification.smartContractGenesisAddress}, txAddress: ${notification.txAddress}}`)
        this._socketIo.to(this._txChainChannel(notification.smartContractGenesisAddress)).emit(PubSubEvent.txSent, Notification)
    }
}

