import { createAdapter } from "@socket.io/redis-adapter";
import express, { Request, Response } from 'express';
import * as http from "http";
import { createClient } from "redis";
import * as socketio from "socket.io";
import { RedisConf, RedisConfUtils } from '../configuration.js';
import { HttpApi } from "../ports/http.api.js";
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

    constructor(port: number, redisConf: RedisConf) {
        this._port = port
        this._redisConf = redisConf
        this._app = express()

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


        this._httpServer = http.createServer(this._app);
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
                    console.log(data)
                    const txChainSubscription = data as TxChainSubscription
                    socket.join(`txChain:${txChainSubscription.txChainGenesisAddress}`)
                    console.log(`${socket.id} subscribed to TxChain ${txChainSubscription.txChainGenesisAddress}`);
                } catch (e) {
                    console.log('Subscription failed', e)
                }
            });

            socket.on("unsubscribe", (data) => {
                try {
                    console.log(data)
                    const txChainSubscription = data as TxChainSubscription
                    socket.leave(`txChain:${txChainSubscription.txChainGenesisAddress}`)
                    console.log(`${socket.id} unsubscribed to TxChain ${txChainSubscription.txChainGenesisAddress}`);
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

    emitTxSentEvent(txSentEvent: TxSentEvent) {
        this._socketIo.to(`txChain:${txSentEvent.txChainGenesisAddress}`).emit(PubSubEvent.txSent, txSentEvent)
    }
}

