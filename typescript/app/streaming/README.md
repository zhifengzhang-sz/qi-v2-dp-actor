# Streaming Examples

This directory contains example applications demonstrating how to use the `@qi/base` streaming module to interact with Kafka/Redpanda services.

## Prerequisites

### 1. Kafka/Redpanda Service
You need a running Kafka or Redpanda instance. Here are a few options:

#### Option A: Docker Compose (Recommended)
Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:latest
    container_name: redpanda-dev
    command:
      - redpanda
      - start
      - --kafka-addr=PLAINTEXT://0.0.0.0:9092
      - --advertise-kafka-addr=PLAINTEXT://localhost:9092
      - --pandaproxy-addr=PLAINTEXT://0.0.0.0:8082
      - --advertise-pandaproxy-addr=PLAINTEXT://localhost:8082
      - --schema-registry-addr=PLAINTEXT://0.0.0.0:8081
      - --rpc-addr=PLAINTEXT://0.0.0.0:33145
      - --advertise-rpc-addr=PLAINTEXT://localhost:33145
      - --smp=1
      - --reserve-memory=0M
      - --overprovisioned
      - --node-id=0
      - --check=false
    ports:
      - "8081:8081"
      - "8082:8082"
      - "9092:9092"
      - "9644:9644"
    volumes:
      - "redpanda-data:/var/lib/redpanda/data"
    networks:
      - redpanda-network

volumes:
  redpanda-data:

networks:
  redpanda-network:
    driver: bridge
```

Start with: `docker-compose up -d`

#### Option B: Local Kafka Installation
Follow the [Apache Kafka Quickstart](https://kafka.apache.org/quickstart) guide.

#### Option C: Confluent Cloud
Sign up for [Confluent Cloud](https://confluent.cloud) and use their managed Kafka service.

### 2. Dependencies
Install dependencies from the project root:

```bash
cd typescript
bun install
```

## Examples

### 1. Admin Operations (`admin.ts`)

Demonstrates topic management operations:

```bash
# Basic usage
bun run admin

# With custom topic name
TOPIC_NAME=my-events bun run admin

# With cleanup (deletes topic after demo)
CLEANUP_TOPIC=true bun run admin

# With custom Kafka brokers
KAFKA_BROKERS=localhost:9092,localhost:9093 bun run admin
```

**What it demonstrates:**
- Creating streaming client and admin
- Listing existing topics
- Creating topics with custom configuration
- Getting topic metadata (partitions, replicas, leaders)
- Optionally deleting topics
- Proper resource cleanup

### 2. Producer (`producer.ts`)

Demonstrates message publishing:

```bash
# Basic usage (sends 10 messages)
bun run producer

# Send 100 messages every 500ms
TOTAL_MESSAGES=100 MESSAGE_INTERVAL=500 bun run producer

# Custom topic and brokers
TOPIC_NAME=user-events KAFKA_BROKERS=localhost:9092 bun run producer

# Development mode with auto-restart
bun run dev:producer
```

**What it demonstrates:**
- Creating and connecting producer
- Sending individual messages with structured data
- Message keys, headers, and timestamps
- Error handling and retry logic
- Graceful shutdown and statistics
- Different message types and payloads

### 3. Consumer (`consumer.ts`)

Demonstrates message consumption:

```bash
# Basic usage
bun run consumer

# Custom consumer group
GROUP_ID=my-consumer-group bun run consumer

# Manual offset management
AUTO_COMMIT=false bun run consumer

# Custom topic and brokers
TOPIC_NAME=user-events KAFKA_BROKERS=localhost:9092 bun run consumer

# Development mode with auto-restart
bun run dev:consumer
```

**What it demonstrates:**
- Creating and connecting consumer
- Subscribing to topics
- Processing messages with different complexities
- Manual and automatic offset management
- Error handling during message processing
- Graceful shutdown and statistics

## Configuration

All examples support environment variable configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated list of Kafka broker addresses |
| `TOPIC_NAME` | `example-events` | Name of the topic to use |
| `GROUP_ID` | `example-consumer-group` | Consumer group ID (consumer only) |
| `MESSAGE_INTERVAL` | `1000` | Interval between messages in ms (producer only) |
| `TOTAL_MESSAGES` | `10` | Total number of messages to send (producer only) |
| `AUTO_COMMIT` | `true` | Enable automatic offset commits (consumer only) |
| `CLEANUP_TOPIC` | `false` | Delete topic after admin demo (admin only) |

## Usage Patterns

### End-to-End Demo

1. **Start Kafka/Redpanda**:
   ```bash
   docker-compose up -d
   ```

2. **Create topic** (in one terminal):
   ```bash
   bun run admin
   ```

3. **Start consumer** (in second terminal):
   ```bash
   bun run consumer
   ```

4. **Start producer** (in third terminal):
   ```bash
   bun run producer
   ```

5. **Watch the consumer process messages in real-time!**

### Development Workflow

Use the development scripts for auto-restart during development:

```bash
# Terminal 1: Auto-restarting consumer
bun run dev:consumer

# Terminal 2: Auto-restarting producer
bun run dev:producer
```

## Message Format

The examples use a standardized JSON message format:

```json
{
  "id": "msg-1-1672531200000",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "counter": 1,
  "data": {
    "userId": "user-123",
    "action": "user_login",
    "metadata": {
      "source": "producer-example",
      "version": "1.0.0"
    }
  }
}
```

**Message Headers:**
- `content-type`: `application/json`
- `producer-id`: Client ID of the producer
- `message-version`: Message format version

## Error Handling

All examples demonstrate proper error handling using `@qi/base` Result<T> patterns:

```typescript
const result = await producer.send(topic, message);
match(
  (success) => {
    console.log(`Message sent to partition ${success.partition}`);
  },
  (error) => {
    console.error(`Send failed: ${error.message}`);
    console.error(`Error code: ${error.code}`);
  },
  result
);
```

## Performance Notes

- **Producer**: Supports batching and in-flight request limits
- **Consumer**: Simulates different processing times for different message types
- **Admin**: Includes proper retry logic and timeout handling
- **All examples**: Include comprehensive statistics and monitoring

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Kafka/Redpanda is running
   - Check broker address (`KAFKA_BROKERS` environment variable)
   - Verify ports are not blocked by firewall

2. **Topic Not Found**
   - Run the admin example first to create topics
   - Check topic name matches between producer and consumer

3. **Consumer Not Receiving Messages**
   - Check consumer group ID
   - Verify topic has messages (check producer logs)
   - Try setting `fromBeginning: true` in subscription config

4. **TypeScript Compilation Errors**
   - Run `bun install` from the typescript/ directory
   - Ensure all dependencies are properly installed

### Debug Mode

Add debug logging to any example:

```bash
DEBUG=true bun run producer
```

## Integration with Your Application

These examples show the basic patterns. In your application:

1. **Create a service layer**:
   ```typescript
   class EventService {
     constructor(private streaming: IStreamingClient) {}

     async publishUserEvent(userId: string, action: string) {
       const producer = await this.streaming.getProducer();
       return producer.send('user-events', {
         key: userId,
         value: Buffer.from(JSON.stringify({ userId, action }))
       });
     }
   }
   ```

2. **Add proper configuration management**
3. **Implement proper logging and monitoring**
4. **Add schema validation for your data types**
5. **Consider using TypeScript strict mode**

## Next Steps

- Review the [streaming module documentation](../../docs/base/streaming/)
- Explore advanced Kafka features like transactions and exactly-once semantics
- Integrate with your application's schema registry
- Add monitoring and alerting for production use