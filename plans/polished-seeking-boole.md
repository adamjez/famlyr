# Famlyr - Family Tree Application Plan

## Tech Stack (Confirmed)
| Layer | Technology |
|-------|------------|
| Orchestration | .NET Aspire |
| Backend | .NET 10, ASP.NET Core Web API |
| Frontend | SvelteKit + TypeScript |
| Database | PostgreSQL (via Aspire) + Entity Framework Core |
| Auth | ASP.NET Core Identity + JWT |
| Architecture | Clean Architecture (3 projects) |
| IDs | UUIDv7 (time-sortable, .NET 9+ native support) |

## Performance Requirements
- Support up to **1000 persons** per family tree
- Optimized viewing and editing for large trees

---

## Project Structure

```
famlyr/
├── src/
│   ├── Famlyr.AppHost/          # Aspire orchestrator (entry point)
│   ├── Famlyr.ServiceDefaults/  # Shared Aspire config (telemetry, health checks)
│   ├── Famlyr.Api/              # ASP.NET Core Web API (controllers, DTOs)
│   ├── Famlyr.Core/             # Domain entities, interfaces, enums
│   ├── Famlyr.Infrastructure/   # EF Core DbContext, repositories
│   └── Famlyr.Web/              # SvelteKit frontend
├── tests/
│   ├── Famlyr.Api.Tests/
│   └── Famlyr.Core.Tests/
├── Famlyr.sln
└── README.md
```

### Aspire Projects
- **Famlyr.AppHost** - Orchestrates all services, configures PostgreSQL container, wires up dependencies
- **Famlyr.ServiceDefaults** - Shared configuration for OpenTelemetry, health checks, service discovery

---

## Implementation Steps (Backend First)

### Step 1: Aspire Solution Setup
1. Create Aspire starter solution using `dotnet new aspire-starter -n Famlyr`
   - This creates: AppHost, ServiceDefaults, and a sample API project
2. Rename/restructure to match our architecture:
   - Keep `Famlyr.AppHost` and `Famlyr.ServiceDefaults`
   - Create `Famlyr.Core` class library (domain layer)
   - Create `Famlyr.Infrastructure` class library (data layer)
   - Create `Famlyr.Api` web API project (or rename the starter one)
3. Add project references (Api → Infrastructure → Core, Api → ServiceDefaults)

### Step 2: Configure AppHost (Famlyr.AppHost/Program.cs)
```csharp
var builder = DistributedApplication.CreateBuilder(args);

// PostgreSQL managed by Aspire (runs in container)
var postgres = builder.AddPostgres("postgres")
    .AddDatabase("famlyrdb");

// API project with database dependency
var api = builder.AddProject<Projects.Famlyr_Api>("api")
    .WithReference(postgres);

// SvelteKit frontend (npm project)
builder.AddNpmApp("web", "../Famlyr.Web")
    .WithReference(api)
    .WithHttpEndpoint(env: "PORT");

builder.Build().Run();
```

### Step 3: Domain Entities (Famlyr.Core)
Create entities in `src/Famlyr.Core/Entities/`:
- `FamilyTree.cs` - tree metadata
- `Person.cs` - individual family members
- `Relationship.cs` - connections between persons
- `Gender.cs` (enum)
- `RelationshipType.cs` (enum: Parent, Spouse)

### Step 4: Database Setup (Famlyr.Infrastructure)
1. Add NuGet packages:
   - `Aspire.Npgsql.EntityFrameworkCore.PostgreSQL` (Aspire-aware EF Core)
   - `Microsoft.AspNetCore.Identity.EntityFrameworkCore`
2. Create `FamlyrDbContext.cs` with Identity support
3. Configure entity relationships (fluent API)
4. Register DbContext in API's Program.cs using Aspire extension:
   ```csharp
   builder.AddNpgsqlDbContext<FamlyrDbContext>("famlyrdb");
   ```
5. Create initial migration

### Step 5: Authentication Setup (Famlyr.Api)
1. Configure Identity in `Program.cs`
2. Add JWT authentication middleware
3. Create `AuthController` with:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `GET /api/auth/me`

### Step 6: Core API Endpoints
Create controllers:
- `TreesController` - CRUD for family trees
- `PersonsController` - CRUD for persons within a tree
- `RelationshipsController` - manage connections

### Step 7: Frontend Setup (Famlyr.Web)
1. Initialize SvelteKit project with TypeScript in `src/Famlyr.Web`
2. Add Tailwind CSS
3. Create API client (`$lib/api.ts`) - API URL injected by Aspire via environment
4. Implement auth store and pages

### Step 8: Tree Visualization (Optimized for 1000 persons)
- Use **d3.js** for interactive family tree rendering
- Pan, zoom, click-to-select functionality
- **Virtualization**: Only render visible nodes (viewport culling)
- **Canvas/WebGL fallback**: For trees >500 persons, use canvas instead of SVG
- **Lazy loading**: Load person details on demand, not all at once

---

## Data Model

### FamilyTree
| Column | Type | Notes |
|--------|------|-------|
| Id | UUIDv7 | PK, `Guid.CreateVersion7()` |
| Name | string | Required |
| Description | string? | Optional |
| OwnerId | string | FK → AspNetUsers |
| CreatedAt | DateTime | |
| UpdatedAt | DateTime | |

### Person
| Column | Type | Notes |
|--------|------|-------|
| Id | UUIDv7 | PK |
| FamilyTreeId | UUIDv7 | FK, indexed |
| FirstName | string? | **Optional** (unknown for historical figures) |
| LastName | string? | **Optional** (unknown for historical figures) |
| MaidenName | string? | |
| Gender | enum | Male, Female, Other, Unknown |
| BirthDate | DateOnly? | |
| DeathDate | DateOnly? | |
| BirthPlace | string? | |
| Notes | string? | |
| PhotoUrl | string? | |

### Relationship
| Column | Type | Notes |
|--------|------|-------|
| Id | UUIDv7 | PK |
| FamilyTreeId | UUIDv7 | FK, indexed |
| Person1Id | UUIDv7 | FK → Person, indexed |
| Person2Id | UUIDv7 | FK → Person, indexed |
| Type | enum | Parent, Spouse |
| StartDate | DateOnly? | Marriage date |
| EndDate | DateOnly? | Divorce/death |

### Database Indexes (for 1000+ persons)
- `IX_Persons_FamilyTreeId` - fast lookup of all persons in tree
- `IX_Relationships_FamilyTreeId` - fast lookup of all relationships
- `IX_Relationships_Person1Id` / `Person2Id` - fast relationship queries

---

## API Endpoints Summary

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/me` - Current user

### Trees
- `GET /api/trees` - List my trees
- `POST /api/trees` - Create tree
- `GET /api/trees/{id}` - Get tree with persons
- `PUT /api/trees/{id}` - Update tree
- `DELETE /api/trees/{id}` - Delete tree

### Persons
- `POST /api/trees/{treeId}/persons` - Add person
- `PUT /api/trees/{treeId}/persons/{id}` - Update person
- `DELETE /api/trees/{treeId}/persons/{id}` - Delete person

### Relationships
- `POST /api/trees/{treeId}/relationships` - Create relationship
- `DELETE /api/trees/{treeId}/relationships/{id}` - Remove relationship

---

## Performance Optimizations (1000 persons)

### Backend
- **Single query loading**: Load tree with persons + relationships in one query (avoid N+1)
- **Projection DTOs**: Return only needed fields for tree view (not full person details)
- **Indexed queries**: All FK columns indexed for fast joins
- **UUIDv7 benefits**: Time-sortable IDs, better index locality than random UUIDs

### Frontend
- **Viewport culling**: Only render nodes visible on screen
- **Level-of-detail**: Show simplified nodes when zoomed out
- **Incremental rendering**: Render in batches (requestAnimationFrame)
- **Web Workers**: Offload layout calculations to background thread
- **Efficient state**: Use Svelte stores with fine-grained reactivity

### API Response Structure (tree view)
```json
{
  "id": "...",
  "name": "Smith Family",
  "persons": [
    { "id": "...", "firstName": "John", "lastName": "Smith", "birthYear": 1950 }
  ],
  "relationships": [
    { "person1Id": "...", "person2Id": "...", "type": "Parent" }
  ]
}
```
Minimal fields for rendering; full details fetched on person click.

---

## First Session Goal
Set up the complete backend foundation with Aspire:
1. Aspire solution with AppHost, ServiceDefaults, Api, Core, Infrastructure
2. Domain entities and DbContext
3. PostgreSQL container managed by Aspire
4. JWT authentication working
5. Basic tree CRUD endpoints

**To run:** `dotnet run --project src/Famlyr.AppHost`
- Aspire Dashboard at https://localhost:17xxx (shows logs, traces, metrics)
- API with Swagger at https://localhost:5xxx
- PostgreSQL container auto-started
