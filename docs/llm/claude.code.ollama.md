# Claude Code CLI with Ollama Integration

This document covers how to set up and use Claude Code CLI functionality with local Ollama models, providing a privacy-first alternative to the official Claude API while maintaining the familiar Claude Code interface.

## Overview

Claude Code CLI is Anthropic's terminal-based coding assistant, but it requires an API connection to Claude models. Since there's no official Ollama support, this guide covers community solutions that provide Claude Code-like functionality with local models.

## Current State (2025)

### Official Claude Code CLI
- **Designed for**: Claude API integration only
- **Subscription**: Requires Pro/Max plan ($20-60/month)
- **Privacy**: Code sent to Anthropic servers
- **Internet**: Always requires connection

### Community Solutions
- **Multiple alternatives** provide Claude Code-like interfaces
- **Local inference** with Ollama models
- **Privacy-first** - no data leaves your machine
- **Offline capable** once models are downloaded

## Integration Options

### Option 1: Claude Code Router (Recommended)

**Best for**: Users who want closest experience to official Claude Code

#### Installation
```bash
# Install the community router
npm install -g claude-code-router

# Verify installation
claude-code-router --version
```

#### Configuration
Create configuration file for Ollama integration:

```bash
# Create config directory
mkdir -p ~/.claude-code-router

# Configure Ollama provider
cat > ~/.claude-code-router/config.json << 'EOF'
{
  "providers": [
    {
      "name": "ollama",
      "api_base_url": "http://localhost:11434/v1/chat/completions",
      "api_key": "ollama",
      "models": [
        "deepseek-coder:6.7b",
        "qwen2.5-coder:7b", 
        "codellama:7b",
        "qi-expert:latest"
      ],
      "default_model": "deepseek-coder:6.7b"
    },
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "your-openrouter-key",
      "models": ["anthropic/claude-3.5-sonnet"]
    }
  ],
  "default_provider": "ollama"
}
EOF
```

#### Usage Examples
```bash
# Start with default Ollama model
claude code

# Switch models dynamically
claude code /model ollama:qwen2.5-coder:7b

# Use specific model for a task
claude code /model ollama:qi-expert "Help me implement @qi/base Result patterns"

# Compare responses from different models
claude code /model ollama:deepseek-coder:6.7b "Explain this function"
claude code /model openrouter:claude-3.5-sonnet "Explain this function"
```

### Option 2: term-code (Direct Claude Code Alternative)

**Best for**: Users who want a cleanroom implementation with Ollama focus

#### Installation
```bash
# Clone the project
git clone https://github.com/Ishuin/term-code
cd term-code/claude-code

# Make executable
chmod +x run-term-code.js

# Create symlink for easy access
mkdir -p ~/bin
ln -sf "$(pwd)/run-term-code.js" ~/bin/tcode

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/bin:$PATH"
```

#### Configuration
```bash
# Configure Ollama endpoint
echo "OLLAMA_BASE_URL=http://localhost:11434" > .env
echo "DEFAULT_MODEL=deepseek-coder:6.7b" >> .env

# For WSL users (if Ollama runs on Windows)
echo "OLLAMA_BASE_URL=http://host.docker.internal:11434" > .env
```

#### Usage Examples
```bash
# Ask coding questions
tcode ask "How do I implement Result<T> error handling?"

# Work with files
tcode file src/index.ts "Add error handling to this function"

# List available Ollama models
tcode ollama:list

# Switch models
tcode ollama:use qwen2.5-coder:7b

# Explain code
tcode explain "What does this TypeScript interface do?"
```

### Option 3: Zen MCP Server (Advanced Integration)

**Best for**: Users wanting multiple model providers in one interface

#### Installation
```bash
# Clone the MCP server
git clone https://github.com/BeehiveInnovations/zen-mcp-server
cd zen-mcp-server

# Install dependencies
npm install

# Configure for Ollama
cat > config.json << 'EOF'
{
  "providers": {
    "ollama": {
      "api_url": "http://localhost:11434/v1",
      "api_key": "ollama",
      "models": ["deepseek-coder:6.7b", "qwen2.5-coder:7b"]
    },
    "openai": {
      "api_url": "https://api.openai.com/v1",
      "api_key": "your-openai-key",
      "models": ["gpt-4", "gpt-3.5-turbo"]
    }
  }
}
EOF
```

#### Add to Claude Desktop
```bash
# Add MCP server to Claude Desktop
claude mcp add-json "zen-mcp-server" '{
  "command": "python",
  "args": ["-m", "src.mcp_server.server"],
  "env": {
    "PYTHONPATH": "/path/to/zen-mcp-server",
    "OLLAMA_URL": "http://localhost:11434"
  }
}'
```

## WSL Configuration (Windows Users)

### Ollama on Windows Host
If running Ollama on Windows and accessing from WSL:

```bash
# Configure networking for WSL
echo "OLLAMA_BASE_URL=http://host.docker.internal:11434" > ~/.ollama_config

# Test connectivity
curl http://host.docker.internal:11434/api/tags

# Configure term-code for WSL
cd term-code/claude-code
echo "OLLAMA_BASE_URL=http://host.docker.internal:11434" > .env
```

### Ollama in WSL
If running Ollama directly in WSL:

```bash
# Install Ollama in WSL
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve &

# Pull models
ollama pull deepseek-coder:6.7b
ollama pull qwen2.5-coder:7b

# Test
ollama run deepseek-coder:6.7b "Hello, write a TypeScript function"
```

## Model Recommendations for Code Tasks

### General Purpose Code Models
```bash
# DeepSeek Coder (Recommended for TypeScript)
ollama pull deepseek-coder:6.7b  # 4.8GB, excellent for code generation
ollama pull deepseek-coder:1.3b  # 1.4GB, lighter but still capable

# Qwen2.5 Coder (Strong multilingual support)
ollama pull qwen2.5-coder:7b     # 5.4GB, excellent reasoning
ollama pull qwen2.5-coder:1.5b   # 1.8GB, efficient for smaller tasks

# CodeLlama (Meta's code model)
ollama pull codellama:7b         # 5.4GB, good for code completion
ollama pull codellama:13b        # 10GB, better reasoning but slower
```

### Specialized Models for @qi Patterns
```bash
# After fine-tuning on @qi patterns (covered in finetuning.qicore.md)
ollama pull qi-expert:latest     # Custom model trained on @qi patterns
ollama pull qi-market-data:latest # Specialized for market data DSL
```

## Common Workflows

### Development Session Setup
```bash
# 1. Start Ollama (if not running)
ollama serve &

# 2. Verify models
ollama list

# 3. Start Claude Code alternative
claude code  # or tcode, depending on chosen option

# 4. Set working directory
cd /path/to/your/project

# 5. Begin coding session
# Use natural language to describe what you want to build
```

### Example Coding Session
```bash
# Using term-code with TypeScript project
tcode ask "Help me create a new @qi/base Result function for price validation"

# Review suggested implementation
tcode explain "How does this Result<T> pattern handle errors?"

# Apply to existing file
tcode file src/validation.ts "Add Result<T> error handling to the validatePrice function"

# Test the implementation
tcode ask "Generate unit tests for this validation function"
```

### Model Switching During Development
```bash
# Start with fast model for exploration
claude code /model ollama:deepseek-coder:1.3b

# Switch to larger model for complex tasks
claude code /model ollama:qwen2.5-coder:7b

# Use specialized model for @qi patterns
claude code /model ollama:qi-expert:latest
```

## Performance Optimization

### Hardware Requirements
- **Minimum**: 16GB RAM, RTX 3060 (8GB VRAM)
- **Recommended**: 32GB RAM, RTX 4090 (24GB VRAM)
- **Enterprise**: 64GB+ RAM, A100 (40GB+ VRAM)

### Model Size vs Performance
```bash
# Fast response, good for simple tasks
ollama run deepseek-coder:1.3b   # ~2-3 tokens/sec on RTX 3060

# Balanced performance
ollama run deepseek-coder:6.7b   # ~1-2 tokens/sec on RTX 4090

# Best quality, slower response
ollama run qwen2.5-coder:32b     # ~0.5-1 tokens/sec on A100
```

### Optimization Tips
```bash
# Pre-load models for faster switching
ollama run deepseek-coder:6.7b "" --keep-alive 60m

# Use GPU acceleration
export OLLAMA_GPU_LAYERS=35  # Adjust based on VRAM

# Optimize context length
export OLLAMA_NUM_CTX=4096   # Reduce for faster inference
```

## Troubleshooting

### Connection Issues
```bash
# Test Ollama connectivity
curl http://localhost:11434/api/tags

# Check if Ollama is running
ps aux | grep ollama

# Restart Ollama service
pkill ollama
ollama serve &
```

### WSL Networking Problems
```bash
# Test Windows host connectivity from WSL
curl http://host.docker.internal:11434/api/tags

# Check Windows firewall (run on Windows)
netsh advfirewall firewall add rule name="Ollama" dir=in action=allow protocol=TCP localport=11434

# Alternative: Use WSL IP directly
export WSL_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "OLLAMA_BASE_URL=http://$WSL_HOST:11434" > .env
```

### Model Loading Issues
```bash
# Check available disk space
df -h

# Verify model integrity
ollama list
ollama pull deepseek-coder:6.7b --force

# Clear corrupted models
rm -rf ~/.ollama/models/manifests/registry.ollama.ai/library/corrupted-model
ollama pull model-name
```

### Performance Issues
```bash
# Monitor GPU usage
nvidia-smi -l 1

# Check RAM usage
htop

# Reduce model size if needed
ollama pull deepseek-coder:1.3b  # Smaller model for limited resources
```

## Advanced Configuration

### Custom Model Parameters
```bash
# Create custom Modelfile for optimized inference
cat > Modelfile << 'EOF'
FROM deepseek-coder:6.7b

PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER num_ctx 8192
PARAMETER num_predict 2048

SYSTEM You are an expert TypeScript developer specializing in @qi/base and @qi/core patterns. Always use Result<T> for error handling and follow functional programming principles.
EOF

# Build custom model
ollama create qi-assistant -f Modelfile

# Use with Claude Code router
claude code /model ollama:qi-assistant
```

### Multi-Model Workflows
```bash
# Use different models for different tasks
alias code-explore="claude code /model ollama:deepseek-coder:1.3b"
alias code-implement="claude code /model ollama:qwen2.5-coder:7b" 
alias code-review="claude code /model ollama:qi-expert:latest"

# Example workflow
code-explore "What are the main components I need for a market data API?"
code-implement "Implement the price validation using @qi patterns"
code-review "Review this implementation for @qi compliance"
```

### Integration with Development Tools

#### VS Code Integration
```json
// .vscode/settings.json
{
  "continue.modelProvider": "ollama",
  "continue.models": [
    {
      "title": "DeepSeek Coder",
      "provider": "ollama",
      "model": "deepseek-coder:6.7b"
    },
    {
      "title": "Qi Expert",
      "provider": "ollama", 
      "model": "qi-expert:latest"
    }
  ]
}
```

#### Git Hooks Integration
```bash
# .git/hooks/pre-commit
#!/bin/bash
# Use Ollama for code review before commits
tcode review "$(git diff --cached)" > review.txt
echo "Code review completed. Check review.txt"
```

## Security Considerations

### Local-Only Inference
- **No data transmission**: All code stays on your machine
- **No API keys required**: For Ollama models
- **Offline operation**: Works without internet after model download

### Model Validation
```bash
# Verify model checksums
ollama list --digests

# Use official models only
ollama pull registry.ollama.ai/library/deepseek-coder:6.7b
```

### Access Control
```bash
# Restrict Ollama to localhost only
export OLLAMA_HOST=127.0.0.1:11434

# Use firewall rules for additional security
sudo ufw allow from 127.0.0.1 to any port 11434
```

## Comparison with Official Claude Code

| Feature | Official Claude Code | Claude Code + Ollama |
|---------|---------------------|---------------------|
| **Cost** | $20-60/month | Free (after hardware) |
| **Privacy** | Data sent to Anthropic | Local inference only |
| **Internet** | Required | Optional |
| **Model Quality** | Claude 3.5 Sonnet | DeepSeek/Qwen2.5 Coder |
| **Customization** | Limited | Full model fine-tuning |
| **Speed** | Network dependent | Hardware dependent |
| **Updates** | Automatic | Manual model updates |

## Future Enhancements

### Planned Improvements
- **Better Claude Code compatibility**: Closer API matching
- **Model switching UI**: Graphical model selection
- **Performance monitoring**: Real-time inference metrics
- **Cloud integration**: Hybrid local/remote workflows

### Community Contributions
- **Model quantization**: Smaller, faster models
- **Fine-tuning scripts**: Domain-specific adaptations
- **Integration plugins**: IDE and editor extensions

## Resources

### Documentation
- [Claude Code Router GitHub](https://github.com/musistudio/claude-code-router)
- [term-code Project](https://github.com/Ishuin/term-code)
- [Zen MCP Server](https://github.com/BeehiveInnovations/zen-mcp-server)
- [Ollama Documentation](https://ollama.com/docs)

### Models
- [DeepSeek Coder Models](https://ollama.com/library/deepseek-coder)
- [Qwen2.5 Coder Models](https://ollama.com/library/qwen2.5-coder)
- [CodeLlama Models](https://ollama.com/library/codellama)

### Community
- [Ollama Discord](https://discord.gg/ollama)
- [Claude Code Reddit](https://reddit.com/r/ClaudeCode)
- [Continue.dev Community](https://discord.gg/NWtdYexhMs)

---

*This guide enables Claude Code-like functionality with local Ollama models, providing privacy-first AI coding assistance without subscription costs or data transmission concerns.*