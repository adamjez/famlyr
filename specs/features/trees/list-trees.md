# Feature: List Family Trees

> **Status:** Implemented
> **GitHub Issue:** #TBD
> **Author:** Adam Jež
> **Last Updated:** 2025-12-28

## Overview

Allow users to view a list of all family trees with basic information including name, description, and number of persons. Clicking on a tree navigates to the tree detail/viewer page.

## User Stories

1. **As a user**, I want to see a list of all my family trees so that I can choose which one to view or manage.
2. **As a user**, I want to see the name and description of each tree so that I can identify them easily.
3. **As a user**, I want to see how many persons are in each tree so that I can understand the tree's size at a glance.
4. **As a user**, I want to click on a tree to navigate to its detail page so that I can view and interact with it.

## Requirements

### Functional

- Display a list of all family trees
- Show for each tree:
  - Name (required)
  - Description (optional, truncated if too long)
  - Person count
- Clicking a tree navigates to `/tree/{id}`
- Empty state when no trees exist
- Loading state while fetching data

### Non-functional

- Response time < 200ms for list endpoint
- Support displaying up to 100 trees efficiently
- Responsive design (mobile and desktop)

## API Specification

### GET /api/trees

Returns a list of all family trees with summary information.

**Authentication:** None (v0.1), User token (v0.3+)

**Request:** No body required

**Response (200 OK):**

```json
{
  "trees": [
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc22",
      "name": "Smith Family",
      "description": "The Smith family tree going back to 1850",
      "personCount": 47
    }
  ]
}
```

**Response Model:**

| Field | Type | Description |
|-------|------|-------------|
| id | Guid | UUIDv7 identifier |
| name | string | Tree name (1-200 chars) |
| description | string? | Optional description (truncated to 200 chars) |
| personCount | int | Number of persons in the tree |

**Error Responses:**

| Status | Description |
|--------|-------------|
| 500 | Internal server error |

## Data Model

No new entities required. Uses existing `FamilyTree` entity with a projection query to count persons.

**Query Strategy:**
```csharp
context.FamilyTrees
    .Select(ft => new FamilyTreeSummaryModel
    {
        Id = ft.Id,
        Name = ft.Name,
        Description = ft.Description,
        PersonCount = ft.Persons.Count
    })
    .ToListAsync();
```

## Frontend Components

### New Files

| File | Purpose |
|------|---------|
| `src/routes/trees/+page.svelte` | Tree list page component |
| `src/routes/trees/+page.server.ts` | Server-side data loading |
| `src/lib/api/familyTree.ts` | Add `getTreeList()` function |
| `src/lib/types/api.ts` | Add `FamilyTreeSummaryModel` type |

### UI Design

- Grid or list layout of tree cards
- Each card displays:
  - Tree name (bold, primary text)
  - Description (secondary text, max 2 lines with ellipsis)
  - Person count with icon
- Hover state indicating clickability
- Empty state with message when no trees exist

## Validation Rules

No user input validation required for this read-only feature.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| No trees exist | Show empty state with message |
| Tree with no persons | Display "0 persons" |
| Very long description | Truncate with ellipsis (200 chars) |
| Many trees (100+) | Consider pagination in future |
| Network error | Show error message with retry option |

## Security Considerations

- v0.1: Public endpoint (no auth)
- v0.3+: Filter trees by authenticated user's `OwnerId`
- No sensitive data exposed in list view

## Out of Scope

- Pagination (future enhancement if needed)
- Sorting options
- Filtering by name
- Search functionality
- Tree deletion from list view
- Bulk operations

## Open Questions

None.

## Related

### Depends on

- Existing `FamilyTree` entity and `FamlyrDbContext`
- Tree viewer page (`/tree/[id]`)

### Related specs

- `create-tree.md` - Creating new trees
- `view-tree.md` - Viewing tree details
