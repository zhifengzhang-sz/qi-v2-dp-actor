# @qi Training Dataset Setup Guide

This guide covers how to extract and prepare training data from the qi-v2-qicore/typescript codebase for LLM fine-tuning.

## Data Sources Assessment

### Available Training Data (~19,331 lines)

**qi-v2-qicore/typescript contains exceptional training material:**

1. **Documentation (12,921 lines)**
   - `docs/tutorial/`: Progressive learning (qi-base.md, qi-core-*.md)
   - `docs/api/`: Complete API reference with examples
   - `docs/impl/`: Implementation guides and patterns

2. **Demo Applications (1,797 lines)**
   - `app/basic-result/`: Essential Result<T> patterns
   - `app/error-extension/`: Domain-specific error types
   - `app/error-handling/`: Comprehensive error management
   - `app/config-example/`: Multi-source configuration
   - `app/cache-example/`: Memory/Redis caching patterns

3. **Production Code (2,997 lines)**
   - `lib/src/base/`: Result<T> and error implementations
   - `lib/src/core/`: Config, Logger, Cache implementations

4. **Test Suite (1,616 lines)**
   - Unit tests with comprehensive coverage
   - Integration tests with real dependencies
   - Property-based tests (functor/monad laws)

## Dataset Management Platform Recommendations

### 1. **ChromaDB + TypeScript (Recommended)**

**Best choice for @qi training data management:**

```bash
npm install chromadb
```

**Benefits:**
- Native TypeScript support
- Excellent for code embeddings
- RAG-friendly for pattern retrieval
- Integration with LangChain/LlamaIndex

### 2. **LanceDB (Alternative)**
- Open-source, AI-native database
- Hyperscalable vector search
- Good for streaming training data

### 3. **Pinecone (Enterprise)**
- Managed vector database
- High-performance for large-scale deployment
- Built-in scaling and monitoring

## Dataset Extraction Pipeline

### 1. Data Collection Script

```typescript
// scripts/extract-qi-patterns.ts
import fs from 'fs/promises';
import path from 'path';
import { ChromaClient } from 'chromadb';

interface TrainingExample {
  id: string;
  instruction: string;
  output: string;
  category: 'basic' | 'error' | 'config' | 'cache' | 'advanced';
  source: string;
  metadata: {
    file_path: string;
    pattern_type: string;
    complexity: number;
  };
}

class QiDatasetExtractor {
  private client = new ChromaClient();
  private collection = await this.client.createCollection({
    name: "qi_patterns",
    embeddingFunction: "sentence-transformers/all-MiniLM-L6-v2"
  });

  async extractFromDemoApps(): Promise<TrainingExample[]> {
    const examples: TrainingExample[] = [];
    const appsDir = '../../qi-v2-qicore/typescript/app';
    
    // Extract from each demo app
    for (const appName of ['basic-result', 'error-extension', 'error-handling', 'config-example', 'cache-example']) {
      const srcPath = path.join(appsDir, appName, 'src/index.ts');
      const readmePath = path.join(appsDir, appName, 'README.md');
      
      const code = await fs.readFile(srcPath, 'utf-8');
      const readme = await fs.readFile(readmePath, 'utf-8');
      
      // Extract code patterns
      examples.push(...this.extractCodePatterns(code, readme, appName));
    }
    
    return examples;
  }

  async extractFromTutorials(): Promise<TrainingExample[]> {
    const examples: TrainingExample[] = [];
    const tutorialDir = '../../qi-v2-qicore/typescript/docs/tutorial';
    
    for (const file of ['qi-base.md', 'qi-core-config.md', 'qi-core-logger.md', 'qi-core-cache.md']) {
      const content = await fs.readFile(path.join(tutorialDir, file), 'utf-8');
      examples.push(...this.extractTutorialPatterns(content, file));
    }
    
    return examples;
  }

  private extractCodePatterns(code: string, readme: string, appName: string): TrainingExample[] {
    const examples: TrainingExample[] = [];
    
    // Extract Result<T> patterns
    const resultPatterns = this.findResultPatterns(code);
    for (const pattern of resultPatterns) {
      examples.push({
        id: `${appName}-result-${examples.length}`,
        instruction: `Implement ${pattern.description} using @qi/base Result patterns`,
        output: pattern.code,
        category: this.categorizePattern(pattern.type),
        source: appName,
        metadata: {
          file_path: `app/${appName}/src/index.ts`,
          pattern_type: pattern.type,
          complexity: pattern.complexity
        }
      });
    }

    return examples;
  }

  private findResultPatterns(code: string): Array<{type: string, description: string, code: string, complexity: number}> {
    const patterns = [];
    
    // Match Result creation patterns
    const resultCreation = code.match(/const\s+\w+\s*=\s*(success|failure)\([^}]+\);/g);
    if (resultCreation) {
      patterns.push({
        type: 'result_creation',
        description: 'Result type creation with success/failure',
        code: resultCreation[0],
        complexity: 1
      });
    }

    // Match functional composition patterns
    const composition = code.match(/\.(map|flatMap|match)\([^}]+\}/gs);
    if (composition) {
      patterns.push({
        type: 'functional_composition',
        description: 'Result functional composition with map/flatMap/match',
        code: composition[0],
        complexity: 2
      });
    }

    // Match error handling patterns
    const errorHandling = code.match(/create\(\s*['"][^'"]+['"][^}]+\}/gs);
    if (errorHandling) {
      patterns.push({
        type: 'error_handling',
        description: 'Custom error creation and handling',
        code: errorHandling[0],
        complexity: 2
      });
    }

    return patterns;
  }

  async storeInChroma(examples: TrainingExample[]): Promise<void> {
    const docs = examples.map(ex => ex.output);
    const metadatas = examples.map(ex => ex.metadata);
    const ids = examples.map(ex => ex.id);

    await this.collection.add({
      documents: docs,
      metadatas: metadatas,
      ids: ids
    });
  }

  async generateJSONL(examples: TrainingExample[]): Promise<string> {
    return examples
      .map(ex => JSON.stringify({
        instruction: ex.instruction,
        output: ex.output
      }))
      .join('\n');
  }
}
```

### 2. Pattern Categories

```typescript
// Training data categories for systematic coverage
export const QI_PATTERN_CATEGORIES = {
  BASIC: [
    'result_creation',
    'success_failure_handling', 
    'basic_error_types'
  ],
  FUNCTIONAL: [
    'map_operations',
    'flatMap_chaining',
    'match_pattern_handling',
    'composition_patterns'
  ],
  ERROR_HANDLING: [
    'custom_error_creation',
    'error_category_usage',
    'domain_specific_errors',
    'error_recovery_patterns'
  ],
  INFRASTRUCTURE: [
    'config_management',
    'logger_integration',
    'cache_patterns',
    'factory_functions'
  ],
  ADVANCED: [
    'async_result_handling',
    'complex_compositions',
    'integration_patterns',
    'mathematical_laws'
  ]
} as const;
```

### 3. Training Data Quality Validation

```typescript
// Validate extracted patterns follow @qi conventions
export class QiPatternValidator {
  validateResultPattern(code: string): boolean {
    // Must use Result<T> type
    if (!code.includes('Result<')) return false;
    
    // Must use functional patterns (no direct error throwing)
    if (code.includes('throw new Error')) return false;
    
    // Must use @qi/base imports
    if (!code.includes('from "@qi/base"')) return false;
    
    return true;
  }

  validateErrorPattern(code: string): boolean {
    // Must use create() for custom errors
    if (code.includes('Error(') && !code.includes('create(')) return false;
    
    // Must specify error category
    const categories = ['VALIDATION', 'NETWORK', 'SYSTEM', 'TIMEOUT', 'BUSINESS'];
    return categories.some(cat => code.includes(cat));
  }

  validateConfigPattern(code: string): boolean {
    // Must use @qi/core Config patterns
    return code.includes('createConfig') || code.includes('ConfigBuilder');
  }
}
```

## Dataset Storage Options

### Option 1: ChromaDB + File Storage
```typescript
// Store embeddings in ChromaDB, raw data in JSONL
const examples = await extractor.extractAllPatterns();
await extractor.storeInChroma(examples);
await fs.writeFile('qi-training-dataset.jsonl', extractor.generateJSONL(examples));
```

### Option 2: Pure File-Based
```typescript
// Traditional approach for frameworks like Unsloth
const jsonlData = await extractor.generateJSONL(examples);
await fs.writeFile('qi-patterns.jsonl', jsonlData);
```

### Option 3: Hybrid Approach
```typescript
// ChromaDB for retrieval, JSONL for training
await extractor.storeInChroma(examples);        // For RAG and pattern search
await extractor.exportForTraining(examples);    // For fine-tuning
```

## Expected Dataset Statistics

Based on qi-v2-qicore analysis:

```
Total Training Examples: ~500-800
├── Basic patterns: ~150 examples
├── Error handling: ~200 examples  
├── Infrastructure: ~150 examples
├── Advanced patterns: ~100-200 examples
└── Integration examples: ~100 examples

File Distribution:
├── Demo apps: 40% of examples
├── Documentation: 30% of examples
├── Test patterns: 20% of examples
└── Implementation: 10% of examples
```

## Usage with Fine-tuning Frameworks

### Unsloth Integration
```python
# Use generated JSONL with Unsloth
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/deepseek-coder-6.7b-bnb-4bit",
    max_seq_length=2048,
    dtype=None,
    load_in_4bit=True,
)

# Load qi patterns dataset
from datasets import load_dataset
dataset = load_dataset("json", data_files="qi-patterns.jsonl")
```

### Ollama Export
```bash
# After training, export to Ollama
python export_to_ollama.py --adapter qi-adapter --model deepseek-coder:6.7b
ollama create qi-expert -f Modelfile
```

## Maintenance and Updates

### Automated Dataset Updates
```typescript
// Monitor qi-v2-qicore for changes
export class DatasetMonitor {
  async updateDataset(): Promise<void> {
    const extractor = new QiDatasetExtractor();
    const newExamples = await extractor.extractAllPatterns();
    
    // Compare with existing dataset
    const changes = await this.detectChanges(newExamples);
    
    if (changes.length > 0) {
      await this.updateChromaCollection(changes);
      await this.regenerateTrainingFiles();
      console.log(`Updated ${changes.length} patterns`);
    }
  }
}
```

This setup provides a robust foundation for managing @qi training data, with ChromaDB for intelligent retrieval and traditional JSONL for fine-tuning workflows.