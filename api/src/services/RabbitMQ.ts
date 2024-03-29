import {IQueue,} from "./IQueue";
import * as amqp from 'amqplib/callback_api';
import {Channel} from "amqplib/callback_api";
import {Message, Replies} from "amqplib";
import {Connection} from "amqplib/callback_api";
import {Observable} from 'rxjs/Observable';
import {Promise} from 'es6-shim';
import rabbitmqConfig from './../configs/rabbitmq';
import AssertQueue = Replies.AssertQueue;
import {RESPONSE_TYPE_RECEIVED, RESPONSE_TYPE_SENT} from "../constants/index";
const md5 = require('md5');

export default class RabbitMQ implements IQueue {

    private connection: Connection; // one Conn for one RabbitMQ !
    private channel: Channel; // one Channel for one RabbitMQ !

    private openConnection(): Promise<Connection> {

        const {amqpUrl} = rabbitmqConfig;

        return new Promise<Connection>((resolve, reject) => {

            if (this.connection) {
                resolve(this.connection)

            } else {

                amqp.connect(amqpUrl, (err, conn) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.connection = conn;
                        resolve(conn);
                    }
                })
            }
        })
    }

    private getChannelFromConnection(conn: Connection): Promise<Channel> {

        return new Promise((resolve, reject) => {
            conn.createChannel((err, ch) => {
                if (err) {
                    reject(err);
                } else {
                    this.channel = ch;
                    resolve(ch);
                }
            });
        });
    }

    private connect(): Promise<Channel> {

        return new Promise<Channel>((resolve, reject) => {
            this.openConnection()
                .then(conn => this.getChannelFromConnection(conn))
                .then(ch => resolve(ch))
                .catch(err => reject(err))
        });
    }

    publishAndWait(queueName: string, data = {}) {
        return new Observable(observer => {

            this.connect()
                .then(ch => {

                    const exclusive = true;
                    ch.assertQueue('', { exclusive }, function(err, queueTemp) {

                        const correlationId = md5(Date.now());

                        const sendCall = function(data) {
                            ch.sendToQueue(queueName,
                                new Buffer(JSON.stringify(data)), {
                                    correlationId: data.correlationId,
                                    replyTo: queueTemp.queue
                                }
                            );
                        };

                        ch.consume(queueTemp.queue, msg => {

                            if (msg.properties.correlationId === correlationId) {
                                observer.next({
                                    type: RESPONSE_TYPE_RECEIVED,
                                    ...JSON.parse(msg.content.toString()),
                                    repeat: newData => {

                                        sendCall({
                                            correlationId,
                                            ...newData
                                        });

                                        observer.next({
                                            type: RESPONSE_TYPE_SENT,
                                            ...data
                                        });
                                    }
                                });
                            }
                        }, {noAck: true});

                        sendCall({
                            correlationId,
                            ...data
                        });

                        observer.next({
                            type: RESPONSE_TYPE_SENT,
                            ...data
                        });
                    })
                })
        })
    }

    publishAndWaitByRouteKeys(exchange: string, routeKeys: Array<string>, data = {}, {autoclose = false}) {

        return new Observable(observer => {

            this.connect()
                .then(ch => {

                    const exclusive = true;
                    const noAck = true;
                    ch.assertQueue('', {exclusive}, (err, queueTemp) => {

                        ch.assertExchange(exchange, 'direct', {durable: false});

                        const correlationId = md5(Date.now());

                        ch.consume(queueTemp.queue, (msg) => {
                            if (msg.properties.correlationId === correlationId) {
                                observer.next({
                                    type: RESPONSE_TYPE_RECEIVED,
                                    ...JSON.parse(msg.content.toString())
                                });
                            }

                            if (autoclose) {
                                setTimeout(() => this.destroy(), 500);
                            }

                        }, {noAck});

                        routeKeys.forEach(routeKey => {
                            const buffer = new Buffer(JSON.stringify(data));
                            ch.publish(exchange, routeKey, buffer, {
                                correlationId,
                                replyTo: queueTemp.queue
                            });
                        });

                        observer.next({
                            type: RESPONSE_TYPE_SENT,
                            ...data
                        });
                    });
                })
        })
    }

    publish(queueName: string, data = {}): Promise<any> {

        return new Promise((resolve, reject) => {

            this.connect()
                .then(ch => {
                    ch.assertQueue(queueName, {
                        durable: false
                    });

                    ch.sendToQueue(queueName, new Buffer(JSON.stringify(data)));

                    setTimeout(() => this.connection.close(), 500);

                    resolve();
                })
                .catch(err => reject(err))
        });
    }

    consume(queueName: string, {lazy = false}): Observable<any> {

        return new Observable<any>(observer => {

            this.connect()
                .then(ch => {

                    const durable = false;
                    ch.assertQueue(queueName, {durable});

                    if (lazy) {
                        ch.prefetch(1);
                    }

                    ch.consume(queueName, msg => {

                        const response = {
                            ...JSON.parse(msg.content.toString()),
                            onReply: Function()
                        };

                        const { replyTo, correlationId } = msg.properties;
                        if (correlationId && replyTo) {
                            response.onReply = (replyData) => {
                                const buffer = new Buffer(JSON.stringify(replyData));
                                ch.sendToQueue(replyTo, buffer, {correlationId});
                            };
                        }

                        observer.next(response);

                    }, { noAck: !lazy });
                })
                .catch(err => {
                    throw new Error('Connect invalid');
                });
        });
    }

    consumeByRouteKeys(exchange: string, routeKeys: Array<string>, {resolve = Function(), lazy = true} = {}) {

        return new Observable<Message>(observer => {

            this.connect()
                .then(ch => {
                    const durable = false;
                    // const durable = true;
                    ch.assertExchange(exchange, 'direct', {durable});

                    const exclusive = true;
                    ch.assertQueue('', {exclusive}, function (err, queueTemp) {

                        routeKeys.forEach(routeKey => {
                            ch.bindQueue(queueTemp.queue, exchange, routeKey);
                        });

                        if (lazy) {
                            ch.prefetch(1);
                        }

                        resolve();
                        ch.consume(queueTemp.queue, msg => {
                            // from MasterServer (client request redirect)

                            const response = {
                                ...JSON.parse(msg.content.toString()),
                                onReply: Function()
                            };

                            const { replyTo, correlationId } = msg.properties;
                            if (correlationId && replyTo) {

                                response.onReply = (replyData) => {
                                    const buffer = new Buffer(JSON.stringify(replyData));
                                    ch.sendToQueue(replyTo, buffer, {correlationId});
                                    if (lazy) {
                                        ch.ack(msg);
                                    }
                                };
                            }

                            observer.next(response);

                        }, { noAck: !lazy });
                    });
                });
        });
    }

    destroy() {
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
    }
}