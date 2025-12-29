# Feature: Bulk Import (JSON)

> **Status:** Draft
> **GitHub Issue:** #TBD
> **Author:** Adam Jez
> **Last Updated:** 2025-12-29

## Overview

Import family tree data from a JSON file, enabling users to migrate data from external sources such as genealogical PDFs (after AI-assisted extraction), other genealogy software exports, or programmatically generated datasets. The import creates persons and relationships in a single operation with full validation.

This feature is designed to support importing large family trees (up to 10,000 persons) extracted from sources like the Czech genealogical PDF documents where persons are in rectangles and lines represent relationships.

## User Stories

1. **As a genealogist**, I want to import a JSON file containing family data so that I can quickly populate a new family tree without manual entry.
2. **As a user**, I want to import data into an existing tree so that I can merge data from multiple sources.
3. **As a user**, I want clear error messages when my import file has issues so that I can correct them.
4. **As a user**, I want to preview what will be imported before committing so that I can verify the data is correct.
5. **As a developer**, I want a well-documented JSON schema so that I can build extraction tools that output compatible data.

## Requirements

### Functional

- [ ] Accept JSON file upload for bulk import
- [ ] Support creating a new tree with imported data
- [ ] Support importing into an existing tree
- [ ] Validate all persons and relationships before import (atomic operation)
- [ ] Use temporary IDs (`tempId`) in JSON to reference persons within the import file
- [ ] Create all relationships after persons are created
- [ ] Return detailed import summary with created entities
- [ ] Support dry-run mode for validation without persisting
- [ ] Handle duplicate detection by name + birth date (optional merge strategy)

### Non-functional

- [ ] Performance: Import 1,000 persons with relationships in < 5 seconds
- [ ] Performance: Import 10,000 persons with relationships in < 30 seconds
- [ ] Memory: Stream large files to avoid memory exhaustion
- [ ] Atomic: All-or-nothing import (rollback on any error)

## JSON Schema

### Import File Structure

```json
{
  "$schema": "https://famlyr.app/schemas/import-v1.json",
  "version": "1.0",
  "metadata": {
    "source": "PDF extraction - SEGEŤA family tree",
    "extractedAt": "2025-12-29T10:30:00Z",
    "notes": "10-page genealogical document from Vlčnov u Starého Jičína"
  },
  "tree": {
    "name": "Rod SEGEŤA",
    "description": "Family tree of SEGEŤA family from Vlčnov u Starého Jičína"
  },
  "persons": [
    {
      "tempId": "p1",
      "firstName": "Jan",
      "lastName": "SEGEŤA",
      "gender": "Male",
      "birthDate": "1850",
      "deathDate": "1920-03-15",
      "notes": "záznam 45/86 NJ 17; Loučka u NJ čp 38"
    },
    {
      "tempId": "p2",
      "firstName": "Marie",
      "lastName": "SEGEŤOVÁ",
      "gender": "Female",
      "birthDate": "1855-06",
      "deathDate": "1925"
    },
    {
      "tempId": "p3",
      "firstName": "František",
      "lastName": "SEGEŤA",
      "gender": "Male",
      "birthDate": "1880-04-12"
    }
  ],
  "relationships": [
    {
      "type": "Spouse",
      "person1TempId": "p1",
      "person2TempId": "p2"
    },
    {
      "type": "Parent",
      "parentTempId": "p1",
      "childTempId": "p3"
    },
    {
      "type": "Parent",
      "parentTempId": "p2",
      "childTempId": "p3"
    }
  ]
}
```

### Field Specifications

#### Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | string | Yes | Schema version (currently "1.0") |
| metadata | object | No | Optional metadata about the import source |
| tree | object | No | Tree details (required if creating new tree) |
| persons | array | Yes | Array of person objects to import |
| relationships | array | No | Array of relationship objects |

#### Metadata Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source | string | No | Description of data source |
| extractedAt | string | No | ISO 8601 timestamp of extraction |
| notes | string | No | Additional notes about the data |

#### Tree Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tree name (max 100 chars) |
| description | string | No | Tree description (max 500 chars) |

#### Person Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tempId | string | Yes | Temporary ID for referencing in relationships (unique within file) |
| firstName | string | No | First name (max 100 chars) |
| lastName | string | No | Last name (max 100 chars) |
| gender | string | No | Gender: Male, Female, Other, Unknown (default: Unknown) |
| birthDate | string | No | Birth date: YYYY, YYYY-MM, or YYYY-MM-DD |
| deathDate | string | No | Death date: YYYY, YYYY-MM, or YYYY-MM-DD |
| notes | string | No | Free-form notes (max 10,000 chars) |

#### Relationship Object

For **Spouse** relationships:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Must be "Spouse" |
| person1TempId | string | Yes | tempId of first spouse |
| person2TempId | string | Yes | tempId of second spouse |

For **Parent** relationships:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Must be "Parent" |
| parentTempId | string | Yes | tempId of the parent |
| childTempId | string | Yes | tempId of the child |

### Date Format Support

The import supports flexible date formats common in genealogical records:

| Format | Example | Stored As |
|--------|---------|-----------|
| Year only | "1850" | BirthDate = 1850-01-01 (year-only flag) |
| Year-month | "1855-06" | BirthDate = 1855-06-01 (month precision) |
| Full date | "1880-04-12" | BirthDate = 1880-04-12 |

## API Specification

### `POST /api/trees/{treeId}/import`

**Description:** Import persons and relationships into an existing tree

**Authentication:** None (v0.1), User token (v0.3+)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| treeId | Guid | Target family tree ID |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| dryRun | bool | No | false | Validate only, don't persist |

**Request:** `application/json`

```json
{
  "version": "1.0",
  "persons": [...],
  "relationships": [...]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "dryRun": false,
  "summary": {
    "personsCreated": 150,
    "relationshipsCreated": 200,
    "warnings": [
      {
        "tempId": "p45",
        "message": "Person has no relationships (isolated node)"
      }
    ]
  },
  "personIdMap": {
    "p1": "019b6252-6256-72f4-903d-8dd21ad3cc30",
    "p2": "019b6252-6256-72f4-903d-8dd21ad3cc31",
    "p3": "019b6252-6256-72f4-903d-8dd21ad3cc32"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "errors": [
    {
      "type": "VALIDATION_ERROR",
      "tempId": "p5",
      "field": "birthDate",
      "message": "Invalid date format: '1850/03/15'. Use YYYY, YYYY-MM, or YYYY-MM-DD"
    },
    {
      "type": "RELATIONSHIP_ERROR",
      "index": 12,
      "message": "Referenced tempId 'p99' does not exist in persons array"
    },
    {
      "type": "DUPLICATE_TEMP_ID",
      "tempId": "p1",
      "message": "tempId 'p1' is used by multiple persons"
    }
  ]
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_JSON | JSON parsing failed |
| 400 | SCHEMA_VERSION_UNSUPPORTED | Unsupported schema version |
| 400 | VALIDATION_ERROR | Person validation failed |
| 400 | RELATIONSHIP_ERROR | Relationship validation failed |
| 400 | DUPLICATE_TEMP_ID | Same tempId used multiple times |
| 400 | MISSING_TEMP_ID | Person missing required tempId |
| 400 | ORPHAN_RELATIONSHIP | Relationship references non-existent tempId |
| 400 | SELF_RELATIONSHIP | Person cannot be related to themselves |
| 400 | MAX_PARENTS_EXCEEDED | Child has more than 2 parents |
| 400 | IMPORT_TOO_LARGE | Exceeds 10,000 persons limit |
| 404 | TREE_NOT_FOUND | Target tree does not exist |

---

### `POST /api/trees/import`

**Description:** Create a new tree and import persons/relationships in one operation

**Authentication:** None (v0.1), User token (v0.3+)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| dryRun | bool | No | false | Validate only, don't persist |

**Request:** `application/json`

```json
{
  "version": "1.0",
  "tree": {
    "name": "Rod SEGEŤA",
    "description": "Family tree extracted from PDF"
  },
  "persons": [...],
  "relationships": [...]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "dryRun": false,
  "treeId": "019b6252-6256-72f4-903d-8dd21ad3cc00",
  "summary": {
    "personsCreated": 150,
    "relationshipsCreated": 200,
    "warnings": []
  },
  "personIdMap": {
    "p1": "019b6252-6256-72f4-903d-8dd21ad3cc30"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | MISSING_TREE_INFO | tree object required when creating new tree |
| 400 | TREE_NAME_REQUIRED | tree.name is required |
| 400 | TREE_NAME_TOO_LONG | tree.name exceeds 100 characters |
| (all errors from import endpoint) | | |

---

### `POST /api/import/validate`

**Description:** Validate an import file without targeting a specific tree

**Authentication:** None (v0.1), User token (v0.3+)

**Request:** `application/json` (same as import)

**Response (200 OK):**

```json
{
  "valid": true,
  "summary": {
    "personCount": 150,
    "relationshipCount": 200,
    "uniqueLastNames": 12,
    "dateRange": {
      "earliest": "1620",
      "latest": "2020"
    }
  },
  "warnings": []
}
```

**Response (200 OK with errors):**

```json
{
  "valid": false,
  "errors": [...],
  "summary": null
}
```

## Validation Rules

### Person Validation

| Rule | Error Code |
|------|------------|
| tempId is required and non-empty | MISSING_TEMP_ID |
| tempId must be unique across all persons | DUPLICATE_TEMP_ID |
| firstName max 100 chars | FIRST_NAME_TOO_LONG |
| lastName max 100 chars | LAST_NAME_TOO_LONG |
| gender must be valid enum value | INVALID_GENDER |
| birthDate must be valid format | INVALID_DATE_FORMAT |
| deathDate must be valid format | INVALID_DATE_FORMAT |
| deathDate year >= birthDate year | DEATH_BEFORE_BIRTH |
| notes max 10,000 chars | NOTES_TOO_LONG |

### Relationship Validation

| Rule | Error Code |
|------|------------|
| type must be Parent or Spouse | INVALID_RELATIONSHIP_TYPE |
| All tempIds must reference existing persons | ORPHAN_RELATIONSHIP |
| Person cannot be their own parent/spouse | SELF_RELATIONSHIP |
| Child cannot have > 2 parents | MAX_PARENTS_EXCEEDED |
| Duplicate relationships are ignored (warning) | (warning only) |

### Import Limits

| Limit | Value |
|-------|-------|
| Max persons per import | 10,000 |
| Max relationships per import | 50,000 |
| Max JSON file size | 50 MB |
| Max notes length per person | 10,000 chars |

## Processing Algorithm

```
1. Parse JSON and validate schema version
2. Validate all persons (collect errors, don't fail fast)
3. Build tempId → index map
4. Validate all relationships against tempId map
5. If any errors: return 400 with all errors
6. If dryRun: return success with summary

7. Begin database transaction
8. Create all Person entities (generate real IDs)
9. Build tempId → realId map
10. Create all Relationship entities using realId map
11. Commit transaction
12. Return success with personIdMap
```

## Data Model

No new entities required. Uses existing:

- `Person` - With all existing fields
- `Relationship` - With existing Parent/Spouse types

### Request/Response Models

```csharp
public record ImportRequest
{
    public required string Version { get; init; }
    public ImportMetadata? Metadata { get; init; }
    public ImportTreeInfo? Tree { get; init; }
    public required List<ImportPerson> Persons { get; init; }
    public List<ImportRelationship>? Relationships { get; init; }
}

public record ImportMetadata
{
    public string? Source { get; init; }
    public DateTime? ExtractedAt { get; init; }
    public string? Notes { get; init; }
}

public record ImportTreeInfo
{
    public required string Name { get; init; }
    public string? Description { get; init; }
}

public record ImportPerson
{
    public required string TempId { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? Gender { get; init; }
    public string? BirthDate { get; init; }
    public string? DeathDate { get; init; }
    public string? Notes { get; init; }
}

public record ImportRelationship
{
    public required string Type { get; init; }
    // For Spouse
    public string? Person1TempId { get; init; }
    public string? Person2TempId { get; init; }
    // For Parent
    public string? ParentTempId { get; init; }
    public string? ChildTempId { get; init; }
}

public record ImportResponse
{
    public required bool Success { get; init; }
    public bool DryRun { get; init; }
    public Guid? TreeId { get; init; }
    public ImportSummary? Summary { get; init; }
    public Dictionary<string, Guid>? PersonIdMap { get; init; }
    public List<ImportError>? Errors { get; init; }
}

public record ImportSummary
{
    public int PersonsCreated { get; init; }
    public int RelationshipsCreated { get; init; }
    public List<ImportWarning> Warnings { get; init; } = [];
}

public record ImportError
{
    public required string Type { get; init; }
    public string? TempId { get; init; }
    public int? Index { get; init; }
    public string? Field { get; init; }
    public required string Message { get; init; }
}

public record ImportWarning
{
    public string? TempId { get; init; }
    public required string Message { get; init; }
}
```

## Frontend (Future)

### Import Page Components

```
src/routes/trees/import/
├── +page.svelte           # Import wizard page
└── +page.ts               # Page setup

src/lib/components/import/
├── FileUploader.svelte    # Drag-drop JSON upload
├── ImportPreview.svelte   # Preview parsed data
├── ValidationResults.svelte # Show errors/warnings
└── ImportProgress.svelte  # Progress during import
```

### UI Flow

1. **Upload**: Drag-drop or browse for JSON file
2. **Validate**: Auto-validate on upload, show errors/warnings
3. **Preview**: Show summary (person count, date range, family names)
4. **Configure**: Choose target tree (existing or new)
5. **Import**: Execute with progress indicator
6. **Complete**: Show results, link to imported tree

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty persons array | Return 400 (at least 1 person required) |
| Persons with no relationships | Valid (warning: isolated nodes) |
| Circular parent relationships | Valid (genealogy allows this historically) |
| Same person as both parents | Return 400 (SELF_RELATIONSHIP) |
| Duplicate spouse relationships | Ignore duplicate (warning) |
| Very old dates (year 1000) | Valid (historical records) |
| Future birth dates | Valid (user responsibility) |
| Empty tempId string | Return 400 (MISSING_TEMP_ID) |
| Whitespace-only names | Treat as null |
| Unicode characters in names | Valid (full UTF-8 support) |
| BOM in JSON file | Handle gracefully |
| Nested/escaped quotes in notes | Standard JSON escaping |

## Security Considerations

- **File size limit**: 50 MB max to prevent DoS
- **Rate limiting**: Max 5 imports per minute per IP (v0.3+)
- **Input sanitization**: All string fields sanitized before storage
- **Transaction timeout**: 60 second max for import operation
- **No code execution**: JSON is data-only, no script evaluation

## Performance Considerations

- **Bulk insert**: Use EF Core `AddRange` for batch inserts
- **Index deferral**: Consider deferring index updates for large imports
- **Streaming**: For files > 10 MB, consider streaming JSON parser
- **Progress reporting**: For large imports, consider WebSocket progress updates

## Out of Scope

- GEDCOM format import (future feature)
- CSV format import (future feature)
- Photo import via JSON (use separate photo upload API)
- Merge/deduplication with existing persons
- Undo/rollback of completed imports
- Incremental/partial imports
- Export to JSON (separate feature)

## Open Questions

- [ ] Should we support importing photos via base64 in JSON?
- [ ] Should duplicate detection be based on exact name match or fuzzy matching?
- [ ] Should we generate a preview visualization before import?

## Related

### Depends on

- `Person` entity and validation rules
- `Relationship` entity and constraints
- `FamilyTree` entity for new tree creation

### Related specs

- `person-crud.md` - Person validation rules apply to import
- `view-tree.md` - Displays imported data

### Enables

- AI-assisted PDF extraction pipeline
- Migration from other genealogy software
- Programmatic tree generation
