var express = require('express');
var zookeeper = require('node-zookeeper-client');
var httpProxy = require('http-proxy');

var PORT = 1025;
var CONNECTION_STRING = '127.0.0.1:2181';
var REGISTRY_ROOT = '/registry';
var cache = {};

//连接zookeeper
var zk = zookeeper.createClient(CONNECTION_STRING);
zk.connect();

// 创建代理服务器对象并监听错误事件
var proxy = httpProxy.createProxyServer();
proxy.on('error', function (err, req, res) {
    res.end();
});

// 启动web服务
var app = express();
app.use(express.static('public'));
app.all('*', function (req, res) {
    // 处理图片请求
    if (req.path == '/favicon.io') {
        res.end();
        return;
    }
    // 获取应用名称
    var applicationName = req.get('Application-Name');
    console.log('ApplicationName %s', applicationName);
    if (!applicationName) {
        console.log('Application-Name request header is not exist');
        res.end();
        return;
    }

    // 对某个应用目标地址进行缓存
    if (cache[applicationName]) {
        var applicationAddress = cache[applicationName];
        // 执行反向代理
        proxy.web(req, res, {
            target: 'http://' + applicationAddress //目标地址
        });
        return;
    }

    // 获取应用路径
    var applicationPath = REGISTRY_ROOT + '/' + applicationName;
    console.log('applicationPath: %s', applicationPath);
    // 获取应用路径下的地址服务节点
    zk.getChildren(applicationPath, function (error, addressNodes) {
        if (error) {
            console.log(error.stack);
            res.end();
            return;
        }
        var size = addressNodes.length;
        if (size == 0) {
            console.log('address node is not exist');
            res.end();
            return;
        }
        // 生成服务地址
        var addressPath = applicationPath + "/";
        if (size == 1) {
            addressPath += addressNodes[0];
        } else {
            addressPath += addressNodes[parseInt(Math.random() * size)];
        }
        console.log('addressPath: %s', addressPath);
        // 获取服务
        zk.getData(addressPath, function (error, applicationAddress) {
                if (error) {
                    console.log(error.stack);
                    res.end();
                    return;
                }
                console.log('applicationAddress: %s', applicationAddress);
                if (!applicationAddress) {
                    console.log('application address is not exist');
                    res.end();
                    return;
                }
                // 进行缓存
                cache[applicationName] = applicationAddress;
                console.log("cache[%s]:%s", applicationName, cache[applicationName]);
                zk.exists(addressPath, function (event) {
                    if (event.NODE_DELETED) {
                        cache = {};
                    }
                }, function (error, stat) {
                    if (stat) {
                        zk.getData(addressPath, function (error, applicationAddress) {
                            if (error) {
                                cache = {};
                                console.log(error.stack);
                                res.end();
                                return;
                            }
                            cache[applicationName] = applicationAddress;
                        });
                    }
                });
                // 执行反向代理
                proxy.web(req, res, {
                    target: 'http://' + applicationAddress //目标地址
                });
            }
        );
    });
});
app.listen(PORT, function () {
    console.log('server is running at %d', PORT);
});
