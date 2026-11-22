# Claude Code Context

This file provides context for Claude Code when working on the Famlyr project.

## Project Overview

Famlyr is a family tree application for creating, managing, and visualizing lineage (family trees). It supports up to 10,000 persons per tree.

## Architecture

- **Clean Architecture** with 3 layers: Core (domain), Infrastructure (data), Api (presentation)
- **Aspire** orchestrates all services (API, PostgreSQL, frontend)
- **UUIDv7** for all entity IDs (`Guid.CreateVersion7()`)
- **Frontend**: SvelteKit 5 with TypeScript and Tailwind CSS v4
- **Central Package Management** - package versions defined in `Directory.Packages.props`

## Key Design Decisions

### Data Model
- `Person.FirstName` and `Person.LastName` are **nullable** - historical figures may have unknown names
- `Relationship` connects two persons with type `Parent` or `Spouse`
- All foreign keys are indexed for performance with large trees

### Performance Requirements
- Optimized for **10,000 persons** per family tree
- **Sibling folding** - descendants collapsed by default for scalability
- Use projection DTOs for tree views (minimal fields)
- Single query loading to avoid N+1 problems

## Commands

### Run the application
```bash
dotnet run --project src/Famlyr.AppHost
```

### Run tests
```bash
dotnet test
```

### Add EF Core migration
```bash
dotnet ef migrations add <MigrationName> --project src/Famlyr.Infrastructure --startup-project src/Famlyr.Api
```

### Update database
```bash
dotnet ef database update --project src/Famlyr.Infrastructure --startup-project src/Famlyr.Api
```

## Development Workflow

- Use **git worktrees** when implementing features to keep the main worktree clean for quick context switches

## Code Conventions

- Avoid excessive comments - code should be self-explanatory; don't add section divider comments
- Use `Guid.CreateVersion7()` for generating new IDs
- Entity configuration via Fluent API in `Infrastructure/Data/Configurations/`
- Controllers in `Api/Controllers/` with `[ApiController]` attribute
- Models in `Api/Models/` - separate Request and Response models
- Do not use `Async` suffix on method names
- Do not create interfaces for services with only a single implementation unless the interface is used for mocking in tests

### Code Quality

- **Follow `.editorconfig`** - defines code style rules (formatting, naming, C# conventions). All generated code must respect these rules.
- `EnableNETAnalyzers` and `EnforceCodeStyleInBuild` are enabled in `Directory.Build.props`
- `AnalysisLevel` set to `latest-recommended`

## Project References

```
Famlyr.Api
├── Famlyr.Infrastructure
│   └── Famlyr.Core
└── Famlyr.ServiceDefaults

Famlyr.Web (SvelteKit)
└── Calls Famlyr.Api via PUBLIC_API_URL
```

## Frontend (Famlyr.Web)

- **SvelteKit 5** with runes syntax (`$state`, `$derived`, `$props`, `$effect`)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **Pixi.js 8** for WebGL-based tree visualization (60fps rendering)
- **OpenTelemetry** for traces and metrics via `instrumentation.server.ts`
- **Winston** for structured logging with OpenTelemetry transport

### Tree Visualization Components

```
src/lib/
├── components/tree/
│   ├── TreeViewer.svelte         # Main container with fullscreen support
│   ├── TreeCanvas.svelte         # Pixi.js canvas with pan/zoom
│   ├── TreeControls.svelte       # Zoom, reset, fullscreen buttons
│   └── PersonDetailPanel.svelte  # Slide-in panel with person details
├── services/tree/
│   ├── layoutEngine.ts           # Sugiyama-style tree layout algorithm
│   └── treeRenderer.ts           # Pixi.js rendering and interaction
├── stores/
│   └── treeView.svelte.ts        # Reactive state with Svelte 5 runes
└── types/
    ├── api.ts                    # API response types
    └── tree.ts                   # Tree visualization types
```

### Logging

Use the `createLogger` factory for structured logs that flow to Aspire:

```typescript
import { createLogger } from '$lib/logger';
const logger = createLogger('my-category');
logger.info('Message here');
```

## Specification-Driven Workflow

Feature specs are written in markdown before implementation.

### Workflow
1. Write spec in `specs/features/<area>/<feature>.md`
2. Create linked GitHub issue
3. Get spec approved
4. Implement following the spec
5. **Update spec after implementation** - mark status as "Implemented", check off requirements, resolve open questions

**Important:** When implementing a feature based on a spec, always update the spec at the end to reflect what was built.

### Spec Location
- Template: `specs/_template.md`
- Features: `specs/features/`

## Plans

Implementation plans are stored in `.claude/plans/`:
- Current: `.claude/plans/v0.1-implementation.md`
