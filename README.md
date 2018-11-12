# Rabbit Tail

CLI utility for consuming and debugging RabbitMQ messages. It creates a transient queue (deleted on program termination), binds it to the target exchange and prints incoming messages.

## Install

```sh
npm install -g rabbit-tail
```

## Usage

### Help
```sh
rabbit-tail --help
```


### Tail all incoming messages on an exchange
```sh
rabbit-tail --host rmq.something.com:port --vhost / --exchange my-exhcnage
```
### Tail certain keys
```sh
rabbit-tail --host rmq.something.com:port --vhost / --exchange my-exchange --routingKeys key1,key2,...,keyN
```

### Provide a queue prefix, as opposed to the default usage of the exchange name.
```sh
rabbit-tail tail --queuePrefix myDebugQueue
```

## TODO

1. Tests.