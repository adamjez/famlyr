# Claude Code Context

This file provides context for Claude Code when working on the Famlyr project.

## Project Overview

Famlyr is a family tree application for creating, managing, and visualizing lineage (family trees). It supports up to 1000 persons per tree.

## Architecture

- **Clean Architecture** with 3 layers: Core (domain), Infrastructure (data), Api (presentation)
- **Aspire** orchestrates all services (API, PostgreSQL, frontend)
- **UUIDv7** for all entity IDs (`Guid.CreateVersion7()`)

## Key Design Decisions

### Data Model
- `Person.FirstName` and `Person.LastName` are **nullable** - historical figures may have unknown names
- `Relationship` connects two persons with type `Parent` or `Spouse`
- All foreign keys are indexed for performance with large trees

### Performance Requirements
- Optimized for **1000 persons** per family tree
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

## Code Conventions

- Use `Guid.CreateVersion7()` for generating new IDs
- Entity configuration via Fluent API in `Infrastructure/Data/Configurations/`
- Controllers in `Api/Controllers/` with `[ApiController]` attribute
- Models in `Api/Models/` - separate Request and Response models

## Project References

```
Famlyr.Api
├── Famlyr.Infrastructure
│   └── Famlyr.Core
└── Famlyr.ServiceDefaults
```

## Specification-Driven Workflow

Feature specs are written in markdown before implementation.

### Workflow
1. Write spec in `specs/features/<area>/<feature>.md`
2. Create linked GitHub issue
3. Get spec approved
4. Implement following the spec
5. Update spec status to "Implemented"

### Spec Location
- Template: `specs/_template.md`
- Features: `specs/features/`

## Plans

Implementation plans are stored in `.claude/plans/`:
- Current: `.claude/plans/v0.1-implementation.md`
