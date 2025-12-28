# Feature: Genus Coloring

> **Status:** Draft
> **GitHub Issue:** #TBD
> **Author:** Adam Jež
> **Last Updated:** 2025-12-28

## Overview

Genus coloring allows users to visually distinguish family groups (persons with the same last name) by assigning them a shared background color. This enhances tree readability by making surname-based lineages immediately recognizable at a glance. Colors are auto-generated for each unique surname and can be customized by the user. Genus colors are displayed as node backgrounds while gender-based colors remain as accents (borders).

## User Stories

- As a user, I want to see family members with the same surname highlighted with the same color so that I can quickly identify lineage groups
- As a user, I want colors to be automatically assigned to each surname so that I don't have to configure everything manually
- As a user, I want to customize the color assigned to a specific surname so that I can personalize my tree visualization
- As a user, I want my color assignments to persist across sessions so that I don't have to reconfigure them each time

## Requirements

### Functional

#### Genus Detection
- [ ] Group persons by `lastName` field (case-insensitive comparison)
- [ ] Treat `null` or empty lastName as a special "Unknown" genus
- [ ] Handle whitespace trimming for surname matching

#### Color Generation
- [ ] Auto-generate distinct colors for each unique surname in a tree
- [ ] Use a perceptually uniform color palette (HSL-based) to ensure readability
- [ ] Ensure minimum contrast between adjacent surname colors
- [ ] Support at least 20 distinct colors before repeating hues

#### Color Display
- [ ] Display genus color as node background fill
- [ ] Display gender color as node border (existing behavior, now accent)
- [ ] Maintain text contrast against genus background colors
- [ ] Apply genus coloring at all LOD levels

#### Color Customization
- [ ] User can open a genus color management panel
- [ ] Panel lists all unique surnames in the tree with their assigned colors
- [ ] User can click a surname to open a color picker
- [ ] Color changes apply immediately to all persons with that surname
- [ ] User can reset a surname color to auto-generated value

#### Persistence
- [ ] Store genus settings in the database (per family tree)
- [ ] Load genus settings when tree is opened
- [ ] Save changes immediately (or debounced)

### Non-functional

#### Performance
- [ ] Color lookup by surname: O(1) using Map/dictionary
- [ ] Re-render all affected nodes within 100ms when color changes
- [ ] Color generation for 100 unique surnames < 10ms

#### Accessibility
- [ ] Ensure genus colors meet WCAG AA contrast ratio (4.5:1) for text
- [ ] Provide colorblind-friendly palette option
- [ ] Don't rely solely on color - surnames remain visible in nodes

## API Specification

### `GET /api/familytrees/{treeId}/genera`

**Description:** Fetch all genus settings for a family tree

**Authentication:** Required

**Response (200 OK):**
```json
{
  "treeId": "019400a0-7b1a-7abc-8def-0123456789ab",
  "genera": [
    {
      "surname": "Smith",
      "color": "#4A90D9"
    },
    {
      "surname": "Johnson",
      "color": "#D94A4A"
    }
  ]
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 404 | NOT_FOUND | Family tree not found |

### `PUT /api/familytrees/{treeId}/genera`

**Description:** Update genus settings for a family tree

**Authentication:** Required

**Request:**
```json
{
  "genera": [
    {
      "surname": "Smith",
      "color": "#4A90D9"
    },
    {
      "surname": "Johnson",
      "color": "#D94A4A"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "treeId": "019400a0-7b1a-7abc-8def-0123456789ab",
  "genera": [
    {
      "surname": "Smith",
      "color": "#4A90D9"
    },
    {
      "surname": "Johnson",
      "color": "#D94A4A"
    }
  ]
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid color format (must be hex) |
| 404 | NOT_FOUND | Family tree not found |

### `DELETE /api/familytrees/{treeId}/genera/{surname}`

**Description:** Delete genus settings for a specific surname (resets to auto-generated values)

**Authentication:** Required

**Response (204 No Content)**

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 404 | NOT_FOUND | Family tree or surname not found |

## Data Model

### Genus Entity (New)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| Id | Guid | PK, UUIDv7 | Primary key |
| FamilyTreeId | Guid | FK, Required, Indexed | References FamilyTree |
| Surname | string | Required, Max 100 chars | Normalized (trimmed, lowercase for comparison) |
| Color | string? | Max 7 chars | Hex color code (#RRGGBB), null = auto-generate |
| CreatedAt | DateTime | Required | Auto-set on creation |
| UpdatedAt | DateTime | Required | Auto-set on update |

**Unique Constraint:** (FamilyTreeId, Surname)

### Entity Configuration

```csharp
// GenusConfiguration.cs
public class GenusConfiguration : IEntityTypeConfiguration<Genus>
{
    public void Configure(EntityTypeBuilder<Genus> builder)
    {
        builder.HasKey(g => g.Id);

        builder.Property(g => g.Surname)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(g => g.Color)
            .HasMaxLength(7);

        builder.HasIndex(g => new { g.FamilyTreeId, g.Surname })
            .IsUnique();

        builder.HasOne<FamilyTree>()
            .WithMany()
            .HasForeignKey(g => g.FamilyTreeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

## Frontend Components

### New Components

```
src/lib/
├── components/tree/
│   └── GenusPanel.svelte         # Slide-out panel for managing genus settings
├── services/tree/
│   └── genusService.ts           # Genus management and color generation logic
└── types/
    └── genus.ts                  # Genus type definitions
```

### GenusPanel.svelte

- Slide-out panel (from left or as modal)
- Lists all unique surnames with color swatches
- Click swatch to open color picker
- "Reset" button per surname to restore auto-generated color
- Shows count of persons per surname

### Color Generation Algorithm

```typescript
// genusService.ts
function generateGenusColors(surnames: string[]): Map<string, string> {
  const colors = new Map<string, string>();
  const count = surnames.length;

  surnames.forEach((surname, index) => {
    // Distribute hues evenly across the color wheel
    const hue = (index * 360 / count) % 360;
    // Use consistent saturation and lightness for readability
    const saturation = 45; // Muted but distinct
    const lightness = 75;  // Light enough for dark text
    colors.set(surname.toLowerCase(), hslToHex(hue, saturation, lightness));
  });

  return colors;
}
```

## Validation Rules

| Field | Rules |
|-------|-------|
| surname | Required, max 100 chars, trimmed |
| color | Required, valid hex format (#RRGGBB), 7 chars |

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Person with null lastName | Assign to "Unknown" genus with distinct color |
| Person with empty string lastName | Treat same as null (Unknown genus) |
| Surnames differing only by case | Treat as same genus (case-insensitive) |
| Surnames with leading/trailing spaces | Trim and normalize |
| Single person with unique surname | Still gets a color assigned |
| All persons have same surname | Single genus color applied to all |
| Tree with 50+ unique surnames | Colors may repeat after palette exhausted |
| User assigns same color to multiple surnames | Allowed (user choice) |
| Surname contains special characters | Allowed, stored as-is (normalized for comparison) |
| Hyphenated surnames (e.g., "Smith-Jones") | Treated as single distinct surname |

## Security Considerations

- Color values validated as proper hex format to prevent injection
- Surname input sanitized before storage
- API endpoints require authentication (when auth is implemented)
- Cascade delete when family tree is deleted

## Out of Scope

- Surname resolution beyond exact match (e.g., maiden names, variants)
- Automatic detection of surname variants (e.g., "Smythe" = "Smith")
- Phonetic matching for surname grouping
- Genus grouping by relationship rather than surname
- Export/import of color schemes between trees
- Predefined color themes/palettes

## Open Questions

- [x] Should genus coloring replace or coexist with gender coloring? → **Overlay: genus as background, gender as border**
- [x] Should colors auto-generate or require manual assignment? → **Auto-generate with manual override**
- [x] Should color assignments be persisted on the backend? → **Yes, backend persistence**
- [ ] Should there be a toggle to disable genus coloring entirely?
- [ ] How to handle very long surnames in the color panel list?

## Related

- Depends on: View Tree (rendering infrastructure)
- Related to: Person entity (lastName field)
- Updates: view-tree.md (coloring system now includes genus colors)

## Implementation Phases

### Phase 1: Frontend Color Generation
- Implement `genusService.ts` with auto-generation algorithm
- Update `treeRenderer.ts` to use genus colors for backgrounds
- Maintain gender colors as borders
- Store colors in client state only (no persistence yet)

### Phase 2: Color Customization UI
- Create `GenusPanel.svelte` component
- Add color picker integration
- Add panel toggle to `TreeControls.svelte`

### Phase 3: Backend Persistence
- Create `Genus` entity and migration
- Implement API endpoints
- Connect frontend to API for load/save
- Handle sync and conflict resolution
