# Rabbit Tail

CLI utility for consuming and debugging RabbitMQ messages. It creates a transient queue (deleted on program termination), binds it to the target exchange and prints incoming messages.

## Install

```sh
npm install -g rabbit-tail
```

## Usage

### Basic (--remoteUrl)

```
rabbit-tail --remoteUrl username:password@rabbit.host.com/myvhost --exchange my-exchange --routingKeys routingKey1,routingKey2
```

### Basic (individual arguments)
```
rabbit-tail --host rabbit.host.com --auth username:password --vhost myvhost --exchange my-exchange --routingKeys routingKey1,routingKey2
```

### Bind to all keys on topic exchange
```
rabbit-tail --host rabbit.host.com --auth username:password --vhost myvhost --exchange my-exchange --routingKeys '#'
```

### Help
```sh
rabbit-tail --help
```

## TODO

1. Tests.
