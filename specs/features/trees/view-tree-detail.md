# Feature: View Family Tree Detail

> **Status:** Implemented
> **GitHub Issue:** #TBD
> **Author:** Adam Jež
> **Last Updated:** 2025-12-28

## Overview

Display detailed information about a family tree after clicking it in the list view. Shows tree metadata, statistics (person count, year range), and a list of all persons with the ability to view person details and navigate to the tree visualization.

## User Stories

1. **As a user**, I want to see the name and description of my family tree so that I understand what it contains.
2. **As a user**, I want to see when the tree was created and last updated so that I know its history.
3. **As a user**, I want to see how many persons are in the tree so that I understand its size.
4. **As a user**, I want to see the year range the tree spans so that I understand its historical coverage.
5. **As a user**, I want to browse a list of all persons in the tree so that I can find specific family members.
6. **As a user**, I want to click on a person to see their details so that I can learn more about them.
7. **As a user**, I want to navigate to the tree visualization from a person's details so that I can see them in context.
8. **As a user**, I want to see a person's parents, spouse(s), and children so that I can understand their family relationships.
9. **As a user**, I want to click on a family member to navigate to their details so that I can explore the family tree.
10. **As a user**, I want to see a person's primary photo in the person list so that I can visually identify family members.
11. **As a user**, I want to see all photos of a person in the detail panel so that I can view their complete photo collection.
12. **As a user**, I want to upload, delete, and manage photos for a person so that I can maintain their photo gallery.
13. **As a user**, I want to set a primary photo for a person so that it displays as their main image in lists.

## Requirements

### Functional

- Display tree metadata:
  - Name
  - Description (if present)
  - Created at timestamp
  - Updated at timestamp
- Display tree statistics:
  - Total person count
  - Year range (earliest to latest year from birth/death dates)
- Display list of all persons with basic info (name, birth/death years, gender)
  - Sorted by birthdate (youngest to oldest)
- Click person to show slide-in detail panel
- Person detail panel shows:
  - Basic info (name, gender, birth/death dates)
  - Parents (clickable to navigate)
  - Spouse(s) (clickable to navigate)
  - Children (clickable to navigate)
- Button in person details to navigate to tree viewer focused on that person
- Link to open full tree visualization

**Photo Display:**
- Display primary photo thumbnail in person list cards (circular, ~48px)
- Show placeholder avatar when no photo exists (gender-based icon or initials)
- Display all photos in person detail panel as a gallery
- Allow setting primary photo from detail panel
- Allow uploading new photos from detail panel
- Allow deleting photos from detail panel
- See `person-photos.md` spec for photo management API details

### Non-functional

- Response time < 300ms for detail endpoint
- Handle trees with up to 1000 persons efficiently
- Responsive design (mobile and desktop)

## API Specification

### GET /api/trees/{id}/details

Returns family tree with metadata, computed statistics, and all persons.

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | Guid | Family tree ID |

**Response (200 OK):**

```json
{
  "id": "019b6252-6256-72f4-903d-8dd21ad3cc22",
  "name": "Smith Family",
  "description": "The Smith family tree going back to 1850",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T14:22:00Z",
  "personCount": 47,
  "yearRange": {
    "start": 1850,
    "end": 2024
  },
  "persons": [
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc23",
      "firstName": "John",
      "lastName": "Smith",
      "gender": "Male",
      "birthDate": "1920-05-15",
      "deathDate": "1995-03-22",
      "primaryPhotoUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ],
  "relationships": [
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc24",
      "type": "Parent",
      "subjectId": "019b6252-6256-72f4-903d-8dd21ad3cc25",
      "relativeId": "019b6252-6256-72f4-903d-8dd21ad3cc23"
    }
  ]
}
```

**Response Model:**

| Field | Type | Description |
|-------|------|-------------|
| id | Guid | UUIDv7 identifier |
| name | string | Tree name (1-200 chars) |
| description | string? | Optional description |
| createdAt | DateTime | UTC timestamp of creation |
| updatedAt | DateTime | UTC timestamp of last update |
| personCount | int | Number of persons in the tree |
| yearRange | object? | Year range object (null if no dates available) |
| yearRange.start | int | Earliest year (min of all birth/death years) |
| yearRange.end | int | Latest year (max of all birth/death years) |
| persons | array | List of all persons in the tree (sorted by birthdate, youngest first) |
| persons[].primaryPhotoUrl | string? | Base64 data URL of primary photo (null if no photos) |
| relationships | array | List of all relationships between persons |
| relationships[].id | Guid | Relationship ID |
| relationships[].type | string | "Parent" or "Spouse" |
| relationships[].subjectId | Guid | For Parent: child ID. For Spouse: either spouse |
| relationships[].relativeId | Guid | For Parent: parent ID. For Spouse: other spouse |

**Error Responses:**

| Status | Description |
|--------|-------------|
| 404 | Family tree not found |
| 500 | Internal server error |

## Data Model

Uses existing `FamilyTree` and `Person` entities with a projection query.

**Photo Support:**
- `PersonPhoto` entity stores photos for each person
- See `person-photos.md` spec for full data model details
- Query includes primary photo URL via subquery or join

**Query Strategy:**

Single query to fetch tree, persons, and relationships. Year range computed in memory from results:

```csharp
var result = await context.FamilyTrees
    .Where(ft => ft.Id == id)
    .Select(ft => new
    {
        ft.Id, ft.Name, ft.Description, ft.CreatedAt, ft.UpdatedAt,
        Persons = ft.Persons
            .OrderByDescending(p => p.BirthDate)
            .Select(p => new PersonModel
            {
                // ... basic fields
                PrimaryPhotoUrl = p.Photos
                    .Where(ph => ph.IsPrimary)
                    .Select(ph => Convert.ToBase64String(ph.ImageData))
                    .FirstOrDefault()
            }).ToList(),
        Relationships = ft.Persons
            .SelectMany(p => p.RelationshipsAsSubject)
            .Select(r => new RelationshipModel { ... }).ToList()
    })
    .FirstOrDefaultAsync();

// Compute year range in memory
var allYears = result.Persons
    .SelectMany(p => new[] { p.BirthDate, p.DeathDate })
    .Where(d => d != null)
    .Select(d => d!.Value.Year)
    .ToList();

var yearRange = allYears.Count > 0
    ? new YearRangeModel { Start = allYears.Min(), End = allYears.Max() }
    : null;
```

## Frontend Components

### New Files

| File | Purpose |
|------|---------|
| `src/routes/trees/[id]/+page.svelte` | Tree detail page component |
| `src/routes/trees/[id]/+page.server.ts` | Server-side data loading |
| `src/lib/components/PersonDetailPanel.svelte` | Slide-in panel for person details with family navigation |
| `src/lib/api/familyTree.ts` | Add `getTreeDetails()` function |
| `src/lib/types/api.ts` | Add `FamilyTreeDetailModel`, `YearRangeModel` types |

### UI Sections

1. **Header Section**
   - Tree name (large heading)
   - Description (if present)
   - Metadata: Created/Updated timestamps

2. **Statistics Section**
   - Person count with icon
   - Year range (e.g., "1850 - 2024")

3. **Actions Section**
   - "View Tree" button → navigates to `/tree/{id}`

4. **Persons List Section**
   - Scrollable/paginated list of persons
   - Each item shows: name, birth-death years, gender indicator
   - Click to expand/show modal with full details
   - "View in Tree" button in details → `/tree/{id}?focus={personId}`

### Person Detail Panel

When clicking a person, a slide-in panel appears from the right showing:
- Full name (header)
- Gender (badge)
- Birth date (formatted)
- Death date (formatted, if applicable)
- Parents (clickable links with green accent, navigate to parent's panel)
- Spouse(s) (clickable links with purple accent, navigate to spouse's panel)
- Children (clickable links with orange accent, navigate to child's panel)
- "View in Tree" button → `/tree/{id}?focus={personId}`

**Photo Gallery Section:**
- Display all photos in a scrollable gallery/grid
- Primary photo shows a star/badge indicator
- Click photo to view full size (lightbox)
- "Set as Primary" button on each non-primary photo
- "Upload Photo" button to add new photos
- "Delete" button on each photo (with confirmation)
- Empty state: "No photos yet" with upload prompt
- See `person-photos.md` spec for API details

Panel features:
- Backdrop overlay (click to close)
- Close button (X icon)
- Escape key to close
- Animated slide-in from right

## Validation Rules

No user input validation required for this read-only feature.

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Tree not found | Show 404 error page |
| Tree with no persons | Show "No persons yet" message, hide year range |
| All dates null | Show "Unknown" for year range |
| Single year (start == end) | Display single year (e.g., "1950") |
| Person with no name | Display "Unknown" as name |
| Very long person list | Consider virtualization or pagination |
| Network error | Show error message with retry option |
| Person with no photos | Show placeholder avatar (gender-based or initials) |
| Person with photos but no primary | Show first photo as thumbnail (or enforce primary) |
| Photo upload fails | Show error message, keep gallery unchanged |
| Photo delete fails | Show error message, photo remains in gallery |

## Security Considerations

- v0.1: Public endpoint (no auth)
- v0.3+: Verify user owns the tree or has access
- No sensitive data exposed beyond what's in the tree

## Out of Scope

- Editing tree metadata
- Adding/removing persons
- Exporting tree data
- Sharing tree with others
- Search within person list
- Custom sorting/filtering options (default sort by birthdate is implemented)

## Open Questions

None.

## Related

### Depends on

- Existing `FamilyTree` and `Person` entities
- Tree visualization page (`/tree/[id]`)
- List trees feature (`/trees`)
- `PersonPhoto` entity for photo storage

### Related specs

- `list-trees.md` - Lists trees, clicking navigates here
- `view-tree.md` - Tree visualization (linked from this page)
- `create-tree.md` - Creating new trees
- `person-photos.md` - Photo management APIs (upload, delete, set primary)
