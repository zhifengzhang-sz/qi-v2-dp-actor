# Streaming Examples Makefile
# Provides convenient commands for running the streaming examples

.PHONY: help start stop logs admin producer consumer dev-producer dev-consumer demo clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make start        - Start Redpanda service"
	@echo "  make stop         - Stop Redpanda service"
	@echo "  make logs         - View Redpanda logs"
	@echo "  make admin        - Run admin example"
	@echo "  make producer     - Run producer example"
	@echo "  make consumer     - Run consumer example"
	@echo "  make dev-producer - Run producer in development mode"
	@echo "  make dev-consumer - Run consumer in development mode"
	@echo "  make demo         - Run complete demo (admin + consumer + producer)"
	@echo "  make clean        - Stop services and clean up"
	@echo ""
	@echo "Environment variables:"
	@echo "  TOPIC_NAME=<name>         - Set topic name (default: example-events)"
	@echo "  TOTAL_MESSAGES=<num>      - Set message count for producer (default: 10)"
	@echo "  MESSAGE_INTERVAL=<ms>     - Set interval between messages (default: 1000)"
	@echo "  GROUP_ID=<id>            - Set consumer group ID (default: example-consumer-group)"
	@echo ""
	@echo "Examples:"
	@echo "  make start"
	@echo "  TOPIC_NAME=user-events make admin"
	@echo "  TOTAL_MESSAGES=50 make producer"

# Infrastructure commands
start:
	@echo "🚀 Starting Redpanda service..."
	docker-compose up -d
	@echo "⏳ Waiting for Redpanda to be ready..."
	@sleep 10
	@echo "✅ Redpanda is ready!"
	@echo ""
	@echo "🌐 Web UIs available at:"
	@echo "  - Redpanda Console: http://localhost:8080"
	@echo "  - Schema Registry UI: http://localhost:8001"
	@echo ""

stop:
	@echo "🛑 Stopping Redpanda service..."
	docker-compose down

logs:
	@echo "📋 Viewing Redpanda logs (Ctrl+C to exit)..."
	docker-compose logs -f redpanda

# Application commands
admin:
	@echo "🔧 Running admin example..."
	bun run admin

producer:
	@echo "📤 Running producer example..."
	bun run producer

consumer:
	@echo "📨 Running consumer example..."
	bun run consumer

dev-producer:
	@echo "📤 Running producer in development mode..."
	bun run dev:producer

dev-consumer:
	@echo "📨 Running consumer in development mode..."
	bun run dev:consumer

# Demo workflow
demo:
	@echo "🎬 Running complete streaming demo..."
	@echo ""
	@echo "Step 1: Creating topic..."
	@$(MAKE) admin
	@echo ""
	@echo "Step 2: Starting consumer in background..."
	@echo "(You should see this consuming messages shortly)"
	@bun run consumer &
	@export CONSUMER_PID=$$!
	@sleep 3
	@echo ""
	@echo "Step 3: Starting producer..."
	@$(MAKE) producer
	@echo ""
	@echo "✅ Demo complete! Check the consumer output above."

# Cleanup
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	docker volume rm qi-streaming-data 2>/dev/null || true
	docker network rm qi-streaming-net 2>/dev/null || true
	@echo "✅ Cleanup complete!"

# Development helpers
check-deps:
	@echo "🔍 Checking dependencies..."
	@command -v bun >/dev/null 2>&1 || { echo "❌ bun is required but not installed. Install from https://bun.sh"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ docker is required but not installed."; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "❌ docker-compose is required but not installed."; exit 1; }
	@echo "✅ All dependencies are installed!"

status:
	@echo "📊 Service Status:"
	@docker-compose ps

quick-test:
	@echo "⚡ Quick test: admin + producer + consumer"
	@$(MAKE) admin TOPIC_NAME=test-topic
	@echo "Starting consumer..." & bun run consumer TOPIC_NAME=test-topic &
	@sleep 2
	@TOPIC_NAME=test-topic TOTAL_MESSAGES=5 MESSAGE_INTERVAL=500 $(MAKE) producer
	@echo "✅ Quick test complete!"