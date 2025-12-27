# Add SvelteKit Frontend (Famlyr.Web)

## Overview
Add a SvelteKit frontend project with Svelte 5, TypeScript, and Tailwind CSS v4, integrated with .NET Aspire.

## Files to Modify

| File | Action |
|------|--------|
| `src/Famlyr.AppHost/Famlyr.AppHost.csproj` | Add `Aspire.Hosting.JavaScript` package |
| `src/Famlyr.AppHost/AppHost.cs` | Wire up SvelteKit frontend with API reference |
| `src/Famlyr.Api/Program.cs` | Add CORS configuration for frontend |

## Files to Create

```
src/Famlyr.Web/
├── src/
│   ├── app.css                    # Tailwind import
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts          # Fetch wrapper
│   │   │   └── familyTree.ts      # API functions
│   │   └── types/
│   │       └── api.ts             # TypeScript interfaces
│   └── routes/
│       ├── +layout.svelte         # App shell
│       └── +page.svelte           # Home page
├── .env                           # PUBLIC_API_URL
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

## Implementation Steps

### Step 1: Create SvelteKit Project
```bash
cd src
npx sv create Famlyr.Web --template minimal --types ts
```
Select: No add-ons, npm package manager

### Step 2: Install Tailwind CSS v4
```bash
cd src/Famlyr.Web
npm install -D tailwindcss @tailwindcss/vite
```

### Step 3: Configure Vite
Edit `vite.config.ts`:
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    server: {
        port: parseInt(process.env.PORT || '5173'),
        strictPort: true,
        host: true
    }
});
```

### Step 4: Create app.css
```css
@import "tailwindcss";
```

### Step 5: Create TypeScript Types
`src/lib/types/api.ts`:
```typescript
export type Gender = 'Male' | 'Female' | 'Other' | 'Unknown';
export type RelationshipType = 'Parent' | 'Spouse';

export interface PersonModel {
    id: string;
    firstName: string | null;
    lastName: string | null;
    gender: Gender;
    birthDate: string | null;
    deathDate: string | null;
}

export interface RelationshipModel {
    id: string;
    type: RelationshipType;
    subjectId: string;
    relativeId: string;
}

export interface FamilyTreeModel {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    persons: PersonModel[];
    relationships: RelationshipModel[];
}
```

### Step 6: Create API Client
`src/lib/api/client.ts` - Fetch wrapper using `PUBLIC_API_URL_HTTPS` env var
`src/lib/api/familyTree.ts` - `getFamilyTree(id)` function

### Step 7: Create Layout and Home Page
- `+layout.svelte` - Import app.css, render children with Svelte 5 runes
- `+page.svelte` - Display family tree data from API

### Step 8: Add Aspire Integration

**Famlyr.AppHost.csproj** - Add package:
```xml
<PackageReference Include="Aspire.Hosting.JavaScript" />
```

**AppHost.cs** - Wire up frontend:
```csharp
var api = builder.AddProject<Projects.Famlyr_Api>("api")
    .WithReference(database)
    .WaitFor(database);

builder.AddViteApp("web", "../Famlyr.Web")
    .WithHttpEndpoint(port: 5173, env: "PORT")
    .WithEnvironment("PUBLIC_API_URL", api.GetEndpoint("http"))
    .WithReference(api)
    .WaitFor(api);
```

### Step 9: Add CORS to API

**appsettings.json** - Add CORS origins:
```json
{
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173", "http://127.0.0.1:5173"]
  }
}
```

**Program.cs**:
```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];

        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// After app.Build(), before UseAuthorization:
app.UseCors();
```

## Run Command
```bash
dotnet run --project src/Famlyr.AppHost
```

Starts PostgreSQL, API (port 5240), and SvelteKit (port 5173) via Aspire dashboard.

## Sources
- [Tailwind CSS v4 Vite Setup](https://tailwindcss.com/docs/installation/using-vite)
- [Aspire JavaScript Integration](https://aspire.dev/integrations/frameworks/javascript/)
- [SvelteKit Creating a Project](https://svelte.dev/docs/kit/creating-a-project)
