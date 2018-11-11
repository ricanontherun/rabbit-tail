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

### Sample Usage
```sh
rabbit-tail --host rmq.something.com:port/vhost --exchange my-exchange --routingKeys key1,key2,...,keyN
```

You can also provide a prefix for the created transient queue.
```sh
rabbit-tail tail --queuePrefix myDebugQueue
```