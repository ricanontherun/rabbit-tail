# Rabbit Tail

CLI utility for consuming and debugging RabbitMQ messages. It creates a transient queue (deleted on program termination), binds it to the target exchange and prints incoming messages.

## Usage

### Help
```sh
node tail --help
```

### Sample Usage
```sh
node tail --host rmq.something.com:port/vhost --exchange my-exchange --routingKeys key1,key2,...,keyN
```
You can also provide a prefix for the created transient queue.
```sh
node tail --queuePrefix myDebugQueue
```