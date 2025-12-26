# Famlyr

Family tree application for creating, managing, and visualizing lineage. Built with .NET Aspire, ASP.NET Core, and SvelteKit.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Orchestration | .NET Aspire |
| Backend | .NET 10, ASP.NET Core Web API |
| Frontend | SvelteKit + TypeScript |
| Database | PostgreSQL + Entity Framework Core |
| Auth | ASP.NET Core Identity + JWT |

## Project Structure

```
famlyr/
├── src/
│   ├── Famlyr.AppHost/          # Aspire orchestrator (entry point)
│   ├── Famlyr.ServiceDefaults/  # Shared Aspire config
│   ├── Famlyr.Api/              # ASP.NET Core Web API
│   ├── Famlyr.Core/             # Domain entities, interfaces
│   ├── Famlyr.Infrastructure/   # EF Core, repositories
│   └── Famlyr.Web/              # SvelteKit frontend
└── tests/
```

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for PostgreSQL via Aspire)

### Running the Application

```bash
dotnet run --project src/Famlyr.AppHost
```

This starts:
- Aspire Dashboard (logs, traces, metrics)
- API with Swagger
- PostgreSQL container (auto-managed)
- SvelteKit frontend

## License

[MIT](LICENSE)
