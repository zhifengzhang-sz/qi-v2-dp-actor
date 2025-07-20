# Dependency Management Strategy

This document outlines the recommended approach for managing dependencies between qi-v2-dp-actor and its foundation libraries.

## Current Dependencies

1. **[qi-v2-qicore](https://github.com/zhifengzhang-sz/qi-v2-qicore)**: QiCore Foundation
   - **Haskell**: `qi-foundation` package (version 0.2.7)
   - **TypeScript**: `@qi` package (version ts-1.0.0)
   - **Components**: qi/base (Result<T>, QiError), qi/core (Config, Logger, Cache)
   - **Status**: ✅ Active implementation with 39 passing tests

2. **[qi-v2-services](https://github.com/zhifengzhang-sz/qi-v2-services)**: Service layer abstractions (to be created)
   - **Haskell**: `qi-services` package (version 0.1.0)
   - **TypeScript**: `@qi/services` package (version 0.1.0)
   - **Status**: ⏳ To be created

## Recommended Approach: Hybrid Strategy

### Development Phase (Local Development)
For local development with all repositories checked out, use **local workspace dependencies**:

#### Haskell (cabal.project)
```cabal
packages:
  .
  ../../../qi-v2-qicore/haskell
  ../../../qi-v2-services/haskell  -- When created
```

#### TypeScript (package.json)
```json
{
  "dependencies": {
    "@qi": "workspace:../../../qi-v2-qicore/typescript",
    "@qi/services": "workspace:../../../qi-v2-services/typescript"
  }
}
```

### GitHub Users (Git Submodules)
For users cloning from GitHub, use **git submodules** for automatic dependency management:

#### Setup Git Submodules
```bash
# Add submodules to qi-v2-dp-actor
git submodule add https://github.com/zhifengzhang-sz/qi-v2-qicore.git deps/qi-v2-qicore
git submodule add https://github.com/zhifengzhang-sz/qi-v2-services.git deps/qi-v2-services
```

#### Haskell (cabal.project)
```cabal
packages:
  .
  ../deps/qi-v2-qicore/haskell
  ../deps/qi-v2-services/haskell
```

#### TypeScript (package.json)
```json
{
  "dependencies": {
    "@qi": "workspace:../deps/qi-v2-qicore/typescript",
    "@qi/services": "workspace:../deps/qi-v2-services/typescript"
  }
}
```

#### Users Clone With
```bash
git clone --recursive https://github.com/zhifengzhang-sz/qi-v2-dp-actor.git
# or
git clone https://github.com/zhifengzhang-sz/qi-v2-dp-actor.git
cd qi-v2-dp-actor
git submodule update --init --recursive
```

### Production Phase (Source Repository Dependencies)
For production releases, use **Git source dependencies** with pinned versions:

#### Haskell (cabal.project)
```cabal
packages: .

source-repository-package
  type: git
  location: https://github.com/zhifengzhang-sz/qi-v2-qicore.git
  tag: v0.2.7
  subdir: haskell

source-repository-package
  type: git
  location: https://github.com/zhifengzhang-sz/qi-v2-services.git
  tag: v0.1.0
  subdir: haskell
```

#### TypeScript (package.json)
```json
{
  "dependencies": {
    "@qi": "github:zhifengzhang-sz/qi-v2-qicore#v0.2.7",
    "@qi/services": "github:zhifengzhang-sz/qi-v2-services#v0.1.0"
  }
}
```

## Migration Steps

### Step 1: Create qi-v2-services Repository
```bash
# Create the new repository
gh repo create zhifengzhang-sz/qi-v2-services --public --description "QiCore Services Layer"

# Create basic structure
mkdir -p /tmp/qi-v2-services
cd /tmp/qi-v2-services
git init && git branch -m main

# Create directories
mkdir -p haskell/src/qi/services
mkdir -p typescript/src
mkdir -p docs examples

# Add basic files (see templates in this document)
git add . && git commit -m "Initial commit: QiCore Services"
git remote add origin https://github.com/zhifengzhang-sz/qi-v2-services.git
git push -u origin main
```

### Step 2: Setup Git Submodules (for GitHub users)
```bash
# In qi-v2-dp-actor repository
git submodule add https://github.com/zhifengzhang-sz/qi-v2-qicore.git deps/qi-v2-qicore
git submodule add https://github.com/zhifengzhang-sz/qi-v2-services.git deps/qi-v2-services

# Update cabal.project and package.json to use deps/ paths
# Commit submodule configuration
git add .gitmodules deps/
git commit -m "Add dependency submodules for GitHub users"
```

### Step 3: Update Project Configuration
```bash
# For local development (current working setup)
# haskell/cabal.project uses: ../../../qi-v2-qicore/haskell
# typescript/package.json uses: workspace:../../../qi-v2-qicore/typescript

# For GitHub users (via submodules)  
# haskell/cabal.project uses: ../deps/qi-v2-qicore/haskell
# typescript/package.json uses: workspace:../deps/qi-v2-qicore/typescript
```

### Step 4: Add Development Scripts
```json
{
  "scripts": {
    "deps:check": "npm list --depth=0",
    "deps:update": "npm update @qi @qi/services",
    "deps:git": "npm install @qi@github:zhifengzhang-sz/qi-v2-qicore#v0.2.7 @qi/services@github:zhifengzhang-sz/qi-v2-services#v0.1.0",
    "deps:local": "npm install @qi@workspace:../../../qi-v2-qicore/typescript @qi/services@workspace:../../../qi-v2-services/typescript"
  }
}
```

## Benefits of This Approach

### Development Benefits
- **Fast Iteration**: Local workspace dependencies enable immediate testing of changes
- **Unified Development**: All projects stay in sync during development
- **No Version Conflicts**: Workspace dependencies ensure consistency

### GitHub User Benefits  
- **Automatic Dependencies**: Git submodules provide dependencies automatically on clone
- **Version Control**: Exact dependency versions are tracked in git
- **Simple Setup**: `git clone --recursive` gets everything needed

### Production Benefits
- **Reproducible Builds**: Pinned Git tags ensure consistent builds across environments
- **Independent Releases**: Each project can be released independently
- **Semantic Versioning**: Proper version management across the entire ecosystem

### Maintenance Benefits
- **Clear Dependency Graph**: Easy to understand project relationships
- **Flexible Migration**: Can switch between local, submodule, and Git dependencies
- **CI/CD Friendly**: All dependency modes work in continuous integration

## Best Practices

### 1. Version Management
```bash
# Always tag releases
git tag -a v4.0.0 -m "Release v4.0.0"
git push origin v4.0.0

# Update dependent projects
# Edit cabal.project or package.json with new tag
```

### 2. Development Workflow
```bash
# Daily development - use local dependencies
npm run dev
cabal build

# Pre-release testing - switch to Git dependencies
# Update cabal.project and package.json
# Test with pinned versions
```

### 3. CI/CD Configuration
```yaml
# .github/workflows/test.yml
- name: Setup dependencies
  run: |
    if [ "${{ github.event_name }}" = "push" ]; then
      # Use Git dependencies for release builds
      npm run deps:git
    else
      # Use local dependencies for development
      npm run deps:local
    fi
```

## Troubleshooting

### Common Issues
1. **Version Mismatches**: Use `npm list` and `cabal freeze` to debug
2. **Build Failures**: Check that all dependencies use compatible versions
3. **Circular Dependencies**: Ensure clean dependency hierarchy

### Resolution Steps
1. Clean build artifacts: `rm -rf dist node_modules`
2. Reinstall dependencies: `npm install` / `cabal clean && cabal build`
3. Check dependency versions: `npm list --depth=0`

## Future Considerations

### Monorepo Migration
If projects become tightly coupled, consider migrating to a monorepo:
```
qi-platform/
├── packages/
│   ├── qicore/
│   ├── services/
│   └── dp-actor/
├── package.json (root)
└── cabal.project (root)
```

### Package Publishing
For wider distribution, consider publishing to:
- **Hackage** (Haskell packages)
- **npm registry** (TypeScript packages)
- **Private registry** (Enterprise use)

This hybrid approach provides the flexibility needed for both development and production use cases.