"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var Server_1 = require("../Server");
var rabbitmq_1 = require("./../../constants/rabbitmq");
var index_1 = require("../../helpers/index");
var MasterServer = (function (_super) {
    __extends(MasterServer, _super);
    function MasterServer(provider, serverData) {
        var _this = _super.call(this, provider) || this;
        _this.subscriptionsMap = {};
        var isMaster = serverData.isMaster;
        _this.isMaster = isMaster;
        _this.subordinates = [];
        return _this;
    }
    ;
    MasterServer.prototype.save = function (hRow) {
        var getSlaveServerNo = this.distrubutionBehavior.getSlaveServerNo;
        var attemptCounter = 0;
        var idx;
        var completed;
        var safeLimit = Math.pow(this.getSlaveServersNumber(), 2);
        do {
            attemptCounter++;
            idx = getSlaveServerNo(hRow, this.subordinates.length);
            completed = this.subordinates[idx].save(hRow);
        } while (!completed && attemptCounter < safeLimit);
        if (!completed) {
            throw new Error("\u0417\u0430\u043F\u0438\u0441\u044C \u0440\u0430\u0437\u043C\u0435\u0440\u043E\u043C " + hRow.getSize() + " \u043D\u0435 \u0431\u044B\u043B\u0430 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u0430 \u043D\u0438 \u0432 \u043E\u0434\u0438\u043D \u0440\u0435\u0433\u0438\u043E\u043D");
        }
        console.log(false, "Region no " + idx);
    };
    MasterServer.prototype.getSlaveServersNumber = function () {
        return this.subordinates.length;
    };
    MasterServer.prototype.prepare = function () {
        this.listen(rabbitmq_1.RABBITMQ_QUEUE_MASTER_SERVER);
        var promises = [];
        this.subordinates.forEach(function (slaveServer) {
            promises.push(slaveServer.listenExchange(rabbitmq_1.RABBITMQ_EXCHANGE_SLAVE_SERVERS));
        });
        return Promise.all(promises);
    };
    MasterServer.prototype.listen = function (queueName, lazy) {
        var _this = this;
        if (lazy === void 0) { lazy = false; }
        console.log('Мастер-сервер ожидает запросы...');
        this.clientsSubscription = this.provider
            .consume(queueName, { lazy: lazy })
            .subscribe(function (clientRequest) {
            // from Clients
            var onClientReply = clientRequest.onClientReply, clientId = clientRequest.clientId;
            console.log("\u041C\u0430\u0441\u0442\u0435\u0440-\u0441\u0435\u0440\u0432\u0435\u0440 \u043F\u043E\u043B\u0443\u0447\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441 \u043E\u0442 \u043A\u043B\u0438\u0435\u043D\u0442\u0430 #" + clientId);
            var getSlaveServerNo = _this.distrubutionBehavior.getSlaveServerNo;
            var idx = getSlaveServerNo(null, _this.subordinates.length);
            var slaveServer = _this.subordinates[idx];
            console.log("\u041C\u0430\u0441\u0442\u0435\u0440-\u0441\u0435\u0440\u0432\u0435\u0440 \u043F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442 \u0437\u0430\u043F\u0440\u043E\u0441 \u043E\u0442 \u043A\u043B\u0438\u0435\u043D\u0442\u0430 #" + clientId + " \u043D\u0430 \u0440\u0435\u0433\u0438\u043E\u043D-\u0441\u0435\u0440\u0432\u0435\u0440 #" + slaveServer.id);
            _this
                .redirectToSlaveServer(slaveServer, { clientId: clientId })
                .then(onClientReply);
        });
    };
    MasterServer.prototype.redirectToSlaveServer = function (slaveServer, data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var routeKey = slaveServer.id;
            var subKey = index_1.hash(routeKey, Date.now());
            _this.subscriptionsMap[subKey] = _this.provider
                .publishAndWaitByRouteKeys(rabbitmq_1.RABBITMQ_EXCHANGE_SLAVE_SERVERS, [routeKey], __assign({}, data, { subKey: subKey }))
                .subscribe(function (response) {
                // from SlaveServer
                switch (response.type) {
                    case 'sent':
                        break;
                    case 'received':
                        var slaveServerId = response.slaveServerId, clientId = response.clientId, subKey_1 = response.subKey;
                        console.log("\u041C\u0430\u0441\u0442\u0435\u0440-\u0441\u0435\u0440\u0432\u0435\u0440 \u043F\u043E\u043B\u0443\u0447\u0438\u043B \u043E\u0442\u0432\u0435\u0442 \u0441 \u0440\u0435\u0433\u0438\u043E\u043D-\u0441\u0435\u0440\u0432\u0435\u0440\u0430 " + slaveServerId + " \u043D\u0430 \u0437\u0430\u043F\u0440\u043E\u0441 \u043E\u0442 \u043A\u043B\u0438\u0435\u043D\u0442\u0430 #" + clientId);
                        resolve(response);
                        _this.subscriptionsMap[subKey_1].unsubscribe();
                        break;
                    default:
                        throw new Error("Unexpected response type from server. Type: " + response.type);
                }
            });
        });
    };
    MasterServer.prototype.close = function () {
        _super.prototype.close.call(this);
        this.subordinates.forEach(function (s) { return s.close(); });
        this.clientsSubscription.unsubscribe();
    };
    return MasterServer;
}(Server_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MasterServer;
