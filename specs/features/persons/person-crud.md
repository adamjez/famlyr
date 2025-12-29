# Feature: Person Create & Edit

> **Status:** Implemented
> **GitHub Issue:** #TBD
> **Author:** Adam Jez
> **Last Updated:** 2025-12-29

## Overview

Allow users to create, edit, and delete persons in a family tree. Each person can have optional biographical information including names, gender, dates, notes (with markdown support), and photos. This spec also covers photo management including upload, deletion, setting primary, and reordering.

> **Note:** Photo storage uses database blob (byte[]) as a **temporary solution**. This must be migrated to Azure Blob Storage or similar before production deployment.

## User Stories

1. **As a user**, I want to add a new person to my family tree so that I can document family members.
2. **As a user**, I want to edit an existing person's details so that I can correct or update information.
3. **As a user**, I want to add notes to a person so that I can record additional biographical information.
4. **As a user**, I want to upload photos when creating a person so that I can visually document them.
5. **As a user**, I want to delete photos from a person so that I can remove unwanted images.
6. **As a user**, I want to set a primary photo for a person so that it displays as their main image.
7. **As a user**, I want to reorder photos so that I can organize the gallery meaningfully.
8. **As a user**, I want to assign parents to a person so that I can document their lineage.
9. **As a user**, I want to assign children to a person so that I can document their descendants.
10. **As a user**, I want to assign a spouse to a person so that I can document their marriage.
11. **As a user**, I want to search for existing people when assigning relationships so that I can find the right person.

## Requirements

### Functional

- [x] Create a new person with optional biographical fields
- [x] Edit an existing person's details
- [x] Delete a person (cascade deletes photos and relationships)
- [x] Get a person's full details
- [x] Support inline photo upload during create/edit
- [x] Notes field with markdown support
- [x] All biographical fields are optional (names, dates, gender, notes)
- [x] Delete photos from a person
- [x] Set a photo as primary (only one primary per person)
- [x] Reorder photos for gallery display
- [x] When primary photo is deleted, next photo becomes primary (or none if last)
- [x] Support JPEG, PNG, and WebP image formats
- [x] Add parent relationship (assign existing person as parent)
- [x] Add child relationship (assign existing person as child)
- [x] Add spouse relationship (assign existing person as spouse)
- [x] Remove relationships
- [x] Search existing people in tree for relationship assignment

### Non-functional

- [x] Response time < 500ms for create/edit without photos
- [x] Response time < 1000ms for create/edit with photos
- [x] Support up to 1000 persons per tree

## API Specification

### `POST /api/trees/{treeId}/persons`

**Description:** Create a new person in a family tree

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | No | Person's first name (max 100 chars) |
| lastName | string | No | Person's last name (max 100 chars) |
| gender | string | No | Gender: Male, Female, Other, Unknown (default: Unknown) |
| birthDate | string | No | Birth date (YYYY or YYYY-MM-DD) |
| deathDate | string | No | Death date (YYYY or YYYY-MM-DD) |
| notes | string | No | Free-form notes with markdown support (max 10,000 chars) |
| photos | File[] | No | Photo files (JPEG, PNG, WebP; max 5MB each; max 20 files) |

**Response (201 Created):**

```json
{
  "id": "019b6252-6256-72f4-903d-8dd21ad3cc30",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "Male",
  "birthDate": "1950-03-15",
  "deathDate": null,
  "notes": "Served in the military during the 1970s.",
  "photos": [
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc31",
      "isPrimary": true,
      "createdAt": "2025-01-15T10:30:00Z",
      "order": 0,
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ]
}
```

**Note:** Date fields return in the same format they were stored (year-only returns "1950", full date returns "1950-03-15").

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | FIRST_NAME_TOO_LONG | firstName exceeds 100 characters |
| 400 | LAST_NAME_TOO_LONG | lastName exceeds 100 characters |
| 400 | NOTES_TOO_LONG | notes exceeds 10,000 characters |
| 400 | INVALID_GENDER | gender is not a valid enum value |
| 400 | INVALID_DATE_FORMAT | birthDate or deathDate is not valid (use YYYY or YYYY-MM-DD) |
| 400 | DEATH_BEFORE_BIRTH | deathDate year is before birthDate year |
| 400 | INVALID_PHOTO_FORMAT | Photo file is not JPEG, PNG, or WebP |
| 400 | PHOTO_TOO_LARGE | Photo file exceeds 5MB |
| 400 | PHOTO_DIMENSIONS_INVALID | Photo dimensions out of range (100x100 to 4096x4096) |
| 400 | TOO_MANY_PHOTOS | More than 20 photos provided |
| 404 | TREE_NOT_FOUND | Family tree not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

### `PUT /api/trees/{treeId}/persons/{personId}`

**Description:** Update an existing person's details

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID |

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| firstName | string | No | Person's first name (max 100 chars) |
| lastName | string | No | Person's last name (max 100 chars) |
| gender | string | No | Gender: Male, Female, Other, Unknown |
| birthDate | string | No | Birth date (YYYY or YYYY-MM-DD, empty to clear) |
| deathDate | string | No | Death date (YYYY or YYYY-MM-DD, empty to clear) |
| notes | string | No | Free-form notes with markdown support (max 10,000 chars, empty to clear) |
| photos | File[] | No | New photos to add (max 5MB each) |

**Notes:**
- Only provided fields are updated; omitted fields remain unchanged
- To clear a nullable field, send empty string
- New photos are appended to existing photos
- Use photo management endpoints below to delete/reorder photos
- Total photos cannot exceed 20 (existing + new)

**Response (200 OK):**

```json
{
  "id": "019b6252-6256-72f4-903d-8dd21ad3cc30",
  "firstName": "John",
  "lastName": "Smith",
  "gender": "Male",
  "birthDate": "1950-03-15",
  "deathDate": "2020-08-22",
  "notes": "Updated notes with more information.",
  "photos": [
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc31",
      "isPrimary": true,
      "createdAt": "2025-01-15T10:30:00Z",
      "order": 0,
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ]
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | FIRST_NAME_TOO_LONG | firstName exceeds 100 characters |
| 400 | LAST_NAME_TOO_LONG | lastName exceeds 100 characters |
| 400 | NOTES_TOO_LONG | notes exceeds 10,000 characters |
| 400 | INVALID_GENDER | gender is not a valid enum value |
| 400 | INVALID_DATE_FORMAT | birthDate or deathDate is not valid (use YYYY or YYYY-MM-DD) |
| 400 | DEATH_BEFORE_BIRTH | deathDate year is before birthDate year |
| 400 | INVALID_PHOTO_FORMAT | Photo file is not JPEG, PNG, or WebP |
| 400 | PHOTO_TOO_LARGE | Photo file exceeds 5MB |
| 400 | PHOTO_DIMENSIONS_INVALID | Photo dimensions out of range |
| 400 | PHOTO_LIMIT_EXCEEDED | Adding photos would exceed 20 total |
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

### `DELETE /api/trees/{treeId}/persons/{personId}`

**Description:** Delete a person from a family tree

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID |

**Response (204 No Content):** No body

**Notes:**
- All photos for the person are deleted
- All relationships involving the person are deleted (cascade)

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

### `GET /api/trees/{treeId}/persons/{personId}`

**Description:** Get a single person's full details

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID |

**Response (200 OK):**

```json
{
  "id": "019b6252-6256-72f4-903d-8dd21ad3cc30",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "Male",
  "birthDate": "1950-03-15",
  "deathDate": null,
  "notes": "Served in the military during the 1970s.",
  "photos": [
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc31",
      "isPrimary": true,
      "createdAt": "2025-01-15T10:30:00Z",
      "order": 0,
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ]
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

## Photo Management Endpoints

### `DELETE /api/trees/{treeId}/persons/{personId}/photos/{photoId}`

**Description:** Delete a photo from a person

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID |
| photoId | Guid | Photo ID |

**Response (204 No Content):** No body

**Notes:**
- If deleted photo was primary, the photo with the lowest order becomes the new primary
- If no photos remain, person has no primary photo (valid state)

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 404 | PHOTO_NOT_FOUND | Photo not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

### `PUT /api/trees/{treeId}/persons/{personId}/photos/{photoId}/primary`

**Description:** Set a photo as the primary photo for a person

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID |
| photoId | Guid | Photo ID |

**Response (200 OK):**

```json
{
  "id": "019b6252-6256-72f4-903d-8dd21ad3cc31",
  "isPrimary": true,
  "createdAt": "2025-01-16T14:22:00Z",
  "order": 1,
  "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Notes:**
- Clears primary flag from any previously primary photo
- Only one photo per person can be primary
- If photo is already primary, no-op (returns success)

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 404 | PHOTO_NOT_FOUND | Photo not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

### `PUT /api/trees/{treeId}/persons/{personId}/photos/reorder`

**Description:** Reorder photos for a person

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID |

**Request:**

```json
{
  "photoIds": [
    "019b6252-6256-72f4-903d-8dd21ad3cc31",
    "019b6252-6256-72f4-903d-8dd21ad3cc32",
    "019b6252-6256-72f4-903d-8dd21ad3cc30"
  ]
}
```

**Response (200 OK):**

```json
{
  "photos": [
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc31",
      "isPrimary": true,
      "createdAt": "2025-01-16T14:22:00Z",
      "order": 0,
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    },
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc32",
      "isPrimary": false,
      "createdAt": "2025-01-17T09:00:00Z",
      "order": 1,
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ]
}
```

**Notes:**
- All photo IDs must belong to the person
- Order is determined by position in the array (index 0 = order 0, etc.)
- Missing photo IDs result in error

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_PHOTO_IDS | Photo IDs don't match person's photos |
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

## Relationship Management Endpoints

### `GET /api/trees/{treeId}/persons/search`

**Description:** Search for people in the tree (for relationship assignment)

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (min 2 chars, searches firstName and lastName) |
| excludePersonId | Guid | No | Exclude this person from results (e.g., can't be own parent) |
| limit | int | No | Max results (default 10, max 50) |

**Response (200 OK):**

```json
{
  "persons": [
    {
      "id": "019b6252-6256-72f4-903d-8dd21ad3cc30",
      "firstName": "John",
      "lastName": "Doe",
      "gender": "Male",
      "birthDate": "1950-03-15",
      "deathDate": null
    }
  ]
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | QUERY_TOO_SHORT | Search query must be at least 2 characters |
| 404 | TREE_NOT_FOUND | Family tree not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

### `POST /api/trees/{treeId}/persons/{personId}/relationships`

**Description:** Add a relationship to a person

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID (the subject of the relationship) |

**Request:**

```json
{
  "relatedPersonId": "019b6252-6256-72f4-903d-8dd21ad3cc31",
  "type": "Parent"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| relatedPersonId | Guid | Yes | The ID of the related person |
| type | string | Yes | Relationship type: Parent, Child, or Spouse |

**Notes:**
- `Parent`: relatedPersonId is a parent of personId
- `Child`: personId is a parent of relatedPersonId (creates inverse Parent relationship)
- `Spouse`: personId and relatedPersonId are spouses

**Response (201 Created):**

```json
{
  "id": "019b6252-6256-72f4-903d-8dd21ad3cc32",
  "type": "Parent",
  "subjectId": "019b6252-6256-72f4-903d-8dd21ad3cc30",
  "relativeId": "019b6252-6256-72f4-903d-8dd21ad3cc31"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_RELATIONSHIP_TYPE | Type must be Parent, Child, or Spouse |
| 400 | SELF_RELATIONSHIP | Cannot create relationship with self |
| 400 | RELATIONSHIP_EXISTS | This relationship already exists |
| 400 | MAX_PARENTS_EXCEEDED | Person already has 2 parents |
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 404 | RELATED_PERSON_NOT_FOUND | Related person not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

### `DELETE /api/trees/{treeId}/persons/{personId}/relationships/{relationshipId}`

**Description:** Remove a relationship from a person

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID |
| relationshipId | Guid | Relationship ID |

**Response (204 No Content):** No body

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 404 | RELATIONSHIP_NOT_FOUND | Relationship not found |
| 500 | INTERNAL_ERROR | Internal server error |

---

### `GET /api/trees/{treeId}/persons/{personId}/relationships`

**Description:** Get all relationships for a person

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Family tree ID |
| personId | Guid | Person ID |

**Response (200 OK):**

```json
{
  "parents": [
    {
      "relationshipId": "019b6252-6256-72f4-903d-8dd21ad3cc32",
      "person": {
        "id": "019b6252-6256-72f4-903d-8dd21ad3cc31",
        "firstName": "Robert",
        "lastName": "Doe",
        "gender": "Male"
      }
    }
  ],
  "children": [
    {
      "relationshipId": "019b6252-6256-72f4-903d-8dd21ad3cc33",
      "person": {
        "id": "019b6252-6256-72f4-903d-8dd21ad3cc34",
        "firstName": "Jane",
        "lastName": "Doe",
        "gender": "Female"
      }
    }
  ],
  "spouses": [
    {
      "relationshipId": "019b6252-6256-72f4-903d-8dd21ad3cc35",
      "person": {
        "id": "019b6252-6256-72f4-903d-8dd21ad3cc36",
        "firstName": "Mary",
        "lastName": "Doe",
        "gender": "Female"
      }
    }
  ]
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | TREE_NOT_FOUND | Family tree not found |
| 404 | PERSON_NOT_FOUND | Person not found |
| 500 | INTERNAL_ERROR | Internal server error |

## Data Model

### Person Entity (Updated)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| Id | Guid | PK, UUIDv7 | Unique identifier |
| FirstName | string? | Max 100 chars | Person's first name |
| LastName | string? | Max 100 chars | Person's last name |
| Gender | Gender | Required, default Unknown | Person's gender |
| BirthYear | int? | 1-9999 | Year of birth |
| BirthMonth | int? | 1-12 | Month of birth (null if only year known) |
| BirthDay | int? | 1-31 | Day of birth (null if only year/month known) |
| DeathYear | int? | 1-9999 | Year of death |
| DeathMonth | int? | 1-12 | Month of death (null if only year known) |
| DeathDay | int? | 1-31 | Day of death (null if only year/month known) |
| Notes | string? | Max 10,000 chars | **NEW** Free-form notes with markdown support |
| FamilyTreeId | Guid | FK to FamilyTree, Required | Reference to family tree |
| Photos | ICollection<PersonPhoto> | | **NEW** Navigation to photos |

### PersonPhoto Entity

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| Id | Guid | PK, UUIDv7 | Unique identifier |
| PersonId | Guid | FK to Person, Required | Reference to person |
| ImageData | byte[] | Required | Photo binary data |
| IsPrimary | bool | Default false | Is this the primary photo |
| CreatedAt | DateTime | Required | Upload timestamp (UTC) |
| Order | int | Required | Display order in gallery |

> **TEMPORARY SOLUTION:** `ImageData` as byte[] stores photo data directly in PostgreSQL. This approach is acceptable for development but must be migrated to Azure Blob Storage (or similar) before production to:
> - Reduce database size
> - Improve backup/restore performance
> - Enable CDN delivery
> - Support image transformations

### Database Configuration Update

```csharp
// PersonConfiguration.cs - additions
builder.Property(p => p.Notes)
    .HasMaxLength(10000);

builder.HasMany(p => p.Photos)
    .WithOne()
    .HasForeignKey(pp => pp.PersonId)
    .OnDelete(DeleteBehavior.Cascade);

// PersonPhotoConfiguration.cs
builder.HasKey(p => p.Id);
builder.Property(p => p.ImageData).IsRequired();
builder.Property(p => p.IsPrimary).HasDefaultValue(false);
builder.Property(p => p.CreatedAt).IsRequired();
builder.Property(p => p.Order).IsRequired();

builder.HasIndex(p => p.PersonId);
builder.HasIndex(p => new { p.PersonId, p.IsPrimary });
```

## Validation Rules

| Field | Rules |
|-------|-------|
| firstName | Optional, max 100 chars |
| lastName | Optional, max 100 chars |
| gender | Optional, must be valid Gender enum value |
| birthDate | Optional, format YYYY or YYYY-MM-DD, must be before deathDate if both provided (compared at year level if either is year-only) |
| deathDate | Optional, format YYYY or YYYY-MM-DD, must be after birthDate if both provided (compared at year level if either is year-only) |
| notes | Optional, max 10,000 chars, supports markdown |
| photos | Optional, each max 5MB, JPEG/PNG/WebP, 100x100 to 4096x4096 px, max 20 total |
| photoIds (reorder) | Required, must contain all photo IDs for the person |
| searchQuery | Required, min 2 characters, searches firstName and lastName |
| relatedPersonId | Required, must be different from personId, must be in same tree |
| relationship type | Required, must be Parent, Child, or Spouse |
| parents per person | Max 2 parents allowed |

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Create with firstName only | Valid, lastName remains null |
| Create with lastName only | Valid, firstName remains null |
| Create with neither name | Valid, both names remain null (unknown person) |
| Edit to remove both names | Valid, both names set to null (unknown person) |
| Create with future birthDate | Valid (user responsibility) |
| Birth date as year only "1920" | Valid, stored with month/day as null |
| Death date as year only "1985" | Valid, stored with month/day as null |
| Birth "1920", death "1920" (same year) | Valid (can't determine order with year-only) |
| Birth "1920-06-15", death "1920" | Valid (year comparison only when either is year-only) |
| deathDate year before birthDate year | Return 400 DEATH_BEFORE_BIRTH |
| Upload 21 photos on create | Return 400 TOO_MANY_PHOTOS |
| Add photos exceeding 20 total on edit | Return 400 PHOTO_LIMIT_EXCEEDED |
| First photo uploaded | Automatically set as primary |
| Delete person with relationships | Relationships cascade deleted |
| Delete person with photos | Photos cascade deleted |
| Empty notes string on edit | Clear notes field (set to null) |
| Tree not found | Return 404 TREE_NOT_FOUND |
| Person not found on edit | Return 404 PERSON_NOT_FOUND |
| Corrupted image file | Return 400 INVALID_PHOTO_FORMAT |
| Delete last/only photo | Person has no photos (valid state) |
| Delete primary photo | Next photo (lowest order) becomes primary |
| Delete non-primary photo | No change to primary status |
| Set already-primary as primary | No-op, return success |
| Reorder with missing photo IDs | Return 400 INVALID_PHOTO_IDS |
| Reorder with extra photo IDs | Return 400 INVALID_PHOTO_IDS |
| Photo not found | Return 404 PHOTO_NOT_FOUND |
| Add self as parent/child/spouse | Return 400 SELF_RELATIONSHIP |
| Add 3rd parent | Return 400 MAX_PARENTS_EXCEEDED |
| Add duplicate relationship | Return 400 RELATIONSHIP_EXISTS |
| Search with 1 character | Return 400 QUERY_TOO_SHORT |
| Search for person in different tree | Not found (only searches within tree) |
| Delete relationship | Removes only the relationship, not the persons |
| Related person not in same tree | Return 404 RELATED_PERSON_NOT_FOUND |

## Security Considerations

- v0.1: Public endpoints (no auth)
- v0.3+: Verify user owns the tree before allowing person operations
- Validate image content (not just extension) to prevent malicious files
- Sanitize notes field to prevent XSS (if rendered as HTML)

## Frontend Implementation

### Components

| Component | File | Description |
|-----------|------|-------------|
| PersonFormPanel | `src/lib/components/PersonFormPanel.svelte` | Slide-in panel for creating/editing persons with photo upload |
| PersonDetailPanel | `src/lib/components/PersonDetailPanel.svelte` | Slide-in panel showing person details with relationship management |
| PersonSearch | `src/lib/components/PersonSearch.svelte` | Reusable person search dropdown with debounced search |
| Toast | `src/lib/components/Toast.svelte` | Toast notification component for success/error messages |

### User Experience

- **Toast Notifications**: Success toasts shown when person is created, updated, or when relationships are added/removed
- **Error Display**: API error messages displayed near the save button (not at top of form) for better visibility
- **User-Friendly Errors**: API client parses error response bodies to show meaningful messages (e.g., "Cannot add more than 2 parents") instead of generic "400 Bad Request"
- **Relationship Editing**: Users can add/remove relationships directly in PersonDetailPanel without opening a separate form
- **Responsive Header**: Tree page header buttons stack vertically on mobile, horizontally on larger screens

### API Client

The API client (`src/lib/api/client.ts`) parses error response bodies to extract the `message` field:

```typescript
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let message: string | undefined;
        try {
            const errorBody = await response.json();
            message = errorBody?.message;
        } catch {
            // Response body is not JSON or empty
        }
        throw new ApiError(response.status, response.statusText, message);
    }
    return response.json();
}
```

### Toast Store

Global toast state managed in `src/lib/stores/toast.svelte.ts`:

```typescript
showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000)
```

## Out of Scope

- Bulk person creation/import
- Person merge/deduplication
- Person search/filtering (handled by tree view)
- Photo cropping/editing
- Photo captions/descriptions
- Strip EXIF metadata for privacy (future, before production release)

## Open Questions

- [ ] Should there be a minimum age check (deathDate - birthDate)?
- [ ] Should we auto-rotate images based on EXIF orientation?

## Related

### Depends on

- `FamilyTree` entity for tree context
- `PersonPhoto` entity for photo storage

### Related specs

- `view-tree-detail.md` - Displays person details including photos
- `view-tree.md` - Displays primary photo in tree nodes
