# msa-api-gateway
## Installation
```bash
npm i msa-api-gateway
```
## Quick Start
step1:找到服务网关根目录下的zk_app.js文件，配置里面服务注册中心地址：
```$xslt
CONNECTION_STRING=你的zookeeper地址，多个以,分割
```
step2:启动服务网关
```$xslt
pm2 start zk_app.js
```
step3:发送http请求
```$xslt
curl -H 'Application-Name:sampleConsumer' http://localhost:1025/api/hello/123
```
> Application-Name：注册到注册中心时的应用名