# Integration Tests

These tests require **real Redpanda services** running on `localhost:9092`.

## Prerequisites

1. **Start Redpanda Services**:
   ```bash
   cd ../qi-v2-dp-ts-actor/services
   docker-compose up -d redpanda
   ```

2. **Verify Redpanda is Running**:
   ```bash
   # Check if Redpanda is accepting connections
   docker logs services_redpanda_1
   
   # Or test with kafkajs directly
   npx kafkajs admin --brokers localhost:9092
   ```

## Running Integration Tests

```bash
# Run all integration tests
bun run test:integration

# Run specific integration test
bun test lib/tests/integration/streaming/producer.integration.test.ts

# Run with verbose logging
DEBUG=* bun run test:integration
```

## What These Tests Validate

### ✅ Real Network Operations
- Actual TCP connections to Redpanda brokers
- Real Kafka protocol message exchange
- Network timeout and failure scenarios
- Connection pooling and reconnection logic

### ✅ Real Topic Management  
- Topic creation with partitions and replication
- Topic deletion and cleanup
- Topic metadata queries
- Partition assignment and leadership

### ✅ Real Message Publishing
- Publishing messages to real topics
- Batch message operations
- Partition assignment and offset tracking
- Message serialization and headers

### ✅ Real Performance Testing
- High-volume message throughput
- Connection handling under load
- Memory usage with real data
- Latency measurements

## Test Categories

- **Connection Tests**: Real broker connections, timeouts, failures
- **Topic Management**: Create/delete/list topics on real Redpanda
- **Message Publishing**: Send messages to real topics with real offsets
- **Error Scenarios**: Network failures, invalid configurations, timeouts
- **Performance Tests**: High-volume publishing, throughput measurement

## Environment Variables

```bash
# Optional: Override default broker
export REDPANDA_BROKERS="localhost:9092"

# Optional: Test timeout settings
export INTEGRATION_TEST_TIMEOUT="30000"

# Optional: Enable debug logging  
export DEBUG="kafkajs*"
```

## Debugging Integration Test Failures

1. **Check Redpanda Status**:
   ```bash
   docker ps | grep redpanda
   docker logs services_redpanda_1 --tail 50
   ```

2. **Verify Network Connectivity**:
   ```bash
   telnet localhost 9092
   ```

3. **Check Topic State**:
   ```bash
   npx kafkajs admin --brokers localhost:9092 --list-topics
   ```

4. **Clean Up Test Topics**:
   ```bash
   npx kafkajs admin --brokers localhost:9092 --delete-topic integration-test-topic
   ```

## Differences from Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|------------|-------------------|
| **Brokers** | Mocked with `vi.fn()` | Real Redpanda on localhost:9092 |
| **Topics** | Simulated responses | Real topic creation/deletion |
| **Messages** | Mock metadata | Real offsets and partitions |
| **Network** | No network calls | Actual TCP connections |
| **Errors** | Simulated failures | Real network/broker errors |
| **Performance** | Not measured | Real throughput/latency |

Integration tests provide **end-to-end validation** that the streaming infrastructure works with actual Redpanda services.