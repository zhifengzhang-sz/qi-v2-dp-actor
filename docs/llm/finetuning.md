# Finetuning LLMs for @qi Ecosystem

This document outlines approaches for finetuning local language models to understand and generate code following `@qi/base` and `@qi/core` patterns, using Ollama for local deployment.

## Overview

Finetuning a local model on the `@qi` ecosystem can significantly improve code generation quality by teaching the model:

- **`@qi/base` Result<T> patterns**: Functional error handling with `match()`, `map()`, `flatMap()`
- **`@qi/core` infrastructure**: Config, Logger, Cache patterns and factory functions
- **DSL architecture principles**: Vocabulary vs implementation separation
- **Domain knowledge**: Market data concepts, FIX Protocol context

## Technology Stack (2025)

### Base Models
- **DeepSeek Coder 6.7B**: Outperforms CodeLlama 13B, better real-world completions
- **CodeLlama 7B/13B**: Strong code understanding, wide ecosystem support
- **Qwen2.5-Coder**: Recent competitive performance for code tasks

### Finetuning Frameworks
- **Unsloth**: Easy LoRA/QLoRA finetuning with direct Ollama export
- **LLaMA-Factory**: Unified efficient finetuning of 100+ LLMs
- **Axolotl**: Flexible training configuration and dataset management

### Local Deployment
- **Ollama**: Simple local model serving with Modelfile configuration
- **Hardware**: RTX 4090 or similar (24GB+ VRAM recommended for QLoRA finetuning)

## Finetuning Approaches

### 1. QLoRA (Recommended)
**Quantized Low-Rank Adaptation** - Most memory efficient approach.

**Benefits:**
- Finetune 7B-13B models on 24GB GPU
- 4-bit quantization with minimal quality loss
- Faster convergence than full precision training
- Small adapter files (100MB vs multi-GB full models)

**Process:**
```bash
# Using Unsloth for QLoRA finetuning
python finetune_qi_patterns.py \
  --model_name "unsloth/deepseek-coder-6.7b-bnb-4bit" \
  --dataset "qi_patterns_dataset.jsonl" \
  --output_dir "./qi-adapter" \
  --lora_r 16 \
  --lora_alpha 32 \
  --learning_rate 2e-5 \
  --max_steps 1000
```

### 2. LoRA (Standard)
**Low-Rank Adaptation** - Good balance of efficiency and performance.

**When to use:**
- Sufficient GPU memory available
- Need faster inference than QLoRA
- Experimenting with different adapter configurations

### 3. Full Finetuning
**Complete model retraining** - Highest quality but resource intensive.

**When to use:**
- Large-scale deployment requirements
- Maximum performance needed
- Substantial computational resources available

## Training Dataset Structure

### Dataset Format
Training data should follow the instruction-output format:

```jsonl
{"instruction": "Create a function that validates a market price using @qi/base Result patterns", "output": "import { Result, success, failure, match } from '@qi/base';\n\nconst validatePrice = (price: number): Result<number> => {\n  if (price <= 0) {\n    return failure(create('INVALID_PRICE', 'Price must be positive', 'VALIDATION'));\n  }\n  return success(price);\n};\n\n// Usage\nconst result = validatePrice(100.50);\nmatch(\n  validPrice => console.log(`Valid price: ${validPrice}`),\n  error => console.error(`Error: ${error.message}`),\n  result\n);"}
{"instruction": "Implement error handling for market data retrieval using @qi/base patterns", "output": "import { Result, success, failure, flatMap, map } from '@qi/base';\nimport type { Price, MarketData } from '@qi/dp/dsl';\n\nconst fetchMarketData = async (symbol: string): Promise<Result<MarketData<Price>>> => {\n  try {\n    const response = await fetch(`/api/price/${symbol}`);\n    if (!response.ok) {\n      return failure(create('NETWORK_ERROR', 'Failed to fetch market data', 'NETWORK'));\n    }\n    const data = await response.json();\n    return success(data);\n  } catch (error) {\n    return failure(create('SYSTEM_ERROR', error.message, 'SYSTEM'));\n  }\n};"}
```

### Data Categories

#### 1. @qi/base Patterns
- Result<T> creation and handling
- Error pattern usage
- Functional composition with `map()`, `flatMap()`, `match()`
- Type-safe error handling

#### 2. @qi/core Infrastructure
- Configuration management with `createConfig()`
- Logging patterns with `createLogger()`
- Cache usage patterns
- Factory function implementations

#### 3. DSL Architecture
- Vocabulary vs implementation separation
- Interface definitions vs concrete implementations
- Dependency management (DSL → @qi/base only)
- Clean architecture principles

#### 4. Market Data Domain
- FIX Protocol compliance
- Market data type usage (Price, Level1, OHLCV, MarketDepth)
- Financial validation patterns
- Real-time vs historical data handling

### Example Training Patterns

#### ✅ Correct @qi/base Usage
```typescript
const result = createPrice(timestamp, price, size);
match(
  price => processPrice(price),
  error => handleError(error),
  result
);
```

#### ❌ Anti-patterns to Avoid
```typescript
// Direct error throwing
if (price <= 0) throw new Error("Invalid price");

// Manual validation without Result<T>
if (!isValidPrice(price)) return null;
```

## Ollama Integration

### Modelfile Configuration
Create a custom Modelfile for your finetuned model:

```dockerfile
FROM deepseek-coder:6.7b
ADAPTER ./qi-patterns-adapter.gguf

SYSTEM You are a TypeScript expert specializing in the @qi ecosystem. You understand:
- @qi/base Result<T> functional error handling patterns
- @qi/core infrastructure (Config, Logger, Cache)
- DSL architecture with clean separation of concerns
- Market data domain with FIX Protocol compliance

Always use @qi/base Result<T> patterns for error handling.
Follow clean architecture: DSL = vocabulary, Utils = implementation.
Generate type-safe, functional code following @qi patterns.

PARAMETER temperature 0.1
PARAMETER num_ctx 8192
PARAMETER top_p 0.9
```

### Deployment Commands
```bash
# Create custom model
ollama create qi-expert -f ./Modelfile

# Run the model
ollama run qi-expert

# Use in applications
curl http://localhost:11434/api/generate -d '{
  "model": "qi-expert",
  "prompt": "Create a market data factory function using @qi/base patterns"
}'
```

### TypeScript Integration
```typescript
import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });

const generateQiCode = async (prompt: string) => {
  const response = await ollama.generate({
    model: 'qi-expert',
    prompt: `Generate TypeScript code using @qi patterns: ${prompt}`,
    stream: false
  });
  return response.response;
};
```

## Training Process

### 1. Data Collection
```bash
# Extract patterns from codebase
find qi-v2-qicore/typescript -name "*.ts" -exec grep -l "@qi/base\|@qi/core" {} \;

# Create training examples from documentation
parse_qi_docs.py --input docs/ --output training_data.jsonl

# Add domain-specific examples
generate_market_data_examples.py --output market_examples.jsonl
```

### 2. Preprocessing
```python
# Format training data
def format_training_example(code_snippet, description):
    return {
        "instruction": f"Implement {description} using @qi patterns",
        "output": code_snippet
    }

# Validate examples
validate_qi_patterns(training_data)
```

### 3. Finetuning
```bash
# Using Unsloth for QLoRA
python train_qi_model.py \
  --base_model "unsloth/deepseek-coder-6.7b-bnb-4bit" \
  --dataset "qi_training_data.jsonl" \
  --output_dir "./qi-adapter" \
  --max_seq_length 2048 \
  --learning_rate 2e-5 \
  --batch_size 4 \
  --gradient_accumulation_steps 4 \
  --warmup_steps 100 \
  --max_steps 1000 \
  --save_steps 200 \
  --logging_steps 50
```

### 4. Export to Ollama
```python
# Convert LoRA adapter to GGUF format
model.export_to_gguf(
    "qi-patterns-adapter.gguf",
    quantization="q8_0",
    include_adapter=True
)
```

### 5. Validation
```bash
# Test the finetuned model
ollama run qi-expert "Create a price validation function"

# Evaluate against test cases
python evaluate_qi_model.py --model qi-expert --test_set qi_test_cases.jsonl
```

## Expected Benefits

### Code Quality Improvements
- **Consistent error handling**: Always uses Result<T> patterns
- **Architectural compliance**: Understands DSL vs utils separation
- **Type safety**: Generates properly typed TypeScript code
- **Domain awareness**: Understands market data concepts and FIX Protocol

### Development Efficiency
- **Faster prototyping**: Model generates @qi-compliant code from descriptions
- **Pattern consistency**: Reduces architectural drift in team development
- **Documentation**: Model can explain @qi patterns and best practices
- **Code review**: Can identify anti-patterns and suggest improvements

### Example Outputs
```typescript
// Prompt: "Create a market data reader with error handling"
// Generated:
import { Result, success, failure, match } from '@qi/base';
import type { MarketDataReader, Price } from '@qi/dp/dsl';

export class MarketDataReaderImpl implements MarketDataReader {
  async getCurrentPrice(symbol: string): Promise<Result<Price>> {
    try {
      const response = await this.fetchPrice(symbol);
      return match(
        price => success(price),
        error => failure(error),
        response
      );
    } catch (error) {
      return failure(create('NETWORK_ERROR', error.message, 'NETWORK'));
    }
  }
}
```

## Hardware Requirements

### Training (QLoRA)
- **GPU**: RTX 4090 (24GB) or A100 (40GB+)
- **RAM**: 32GB+ system memory
- **Storage**: 100GB+ for datasets and checkpoints

### Inference (Ollama)
- **GPU**: RTX 4080 (16GB) or better
- **RAM**: 16GB+ system memory  
- **Storage**: 10GB+ for model and adapters

### Cloud Alternatives
- **Google Colab Pro+**: A100 access for training
- **Vast.ai**: Affordable GPU rentals
- **RunPod**: On-demand GPU instances

## Future Enhancements

### Advanced Techniques
- **AdaLoRA**: Adaptive rank allocation for better efficiency
- **DoRA**: Direction-optimized LoRA for improved stability
- **Multi-task learning**: Train on multiple @qi domains simultaneously

### Integration Improvements
- **VS Code extension**: Real-time @qi pattern suggestions
- **CI/CD integration**: Automated pattern validation
- **Documentation generation**: Auto-generate examples from finetuned model

### Evaluation Metrics
- **Pattern compliance**: Measure adherence to @qi architectures
- **Code quality**: Static analysis integration
- **Domain accuracy**: Market data concept understanding
- **Performance**: Inference speed and memory usage

## Resources

### Documentation
- [Unsloth Documentation](https://docs.unsloth.ai/)
- [Ollama Modelfile Reference](https://github.com/ollama/ollama/blob/main/docs/modelfile.md)
- [QLoRA Paper](https://arxiv.org/abs/2305.14314)

### Tools
- [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory)
- [Ollama JavaScript Library](https://github.com/ollama/ollama-js)
- [Axolotl Training Framework](https://github.com/OpenAccess-AI-Collective/axolotl)

### Models
- [DeepSeek Coder Models](https://huggingface.co/deepseek-ai)
- [Unsloth 4-bit Models](https://huggingface.co/unsloth)
- [Ollama Model Library](https://ollama.com/library)

---

*This document provides a comprehensive guide for finetuning language models on @qi ecosystem patterns. For implementation details and training scripts, see the accompanying code examples in this directory.*