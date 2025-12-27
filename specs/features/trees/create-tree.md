# Feature: Create Family Tree

> **Status:** Draft
> **GitHub Issue:** #6
> **Author:** Adam Jež
> **Last Updated:** 2025-12-27

## Overview

Allow users to create new family trees. A family tree is the top-level container that holds persons and their relationships.

> **Note:** In v0.1, all endpoints are public (no authentication). User ownership will be added in v0.3.

## User Stories

- As a user, I want to create a new family tree so that I can start documenting my family lineage
- As a user, I want to give my tree a name and description so that I can identify it among multiple trees

## Requirements

### Functional

- [ ] User can create a new family tree with a name
- [ ] User can optionally provide a description
- [ ] System generates UUIDv7 for the tree ID
- [ ] System records CreatedAt and UpdatedAt timestamps
- [ ] User receives the created tree data in response

### Non-functional

- [ ] Response time < 200ms for tree creation
- [ ] Tree creation is idempotent-safe (duplicate submissions don't create duplicates if same request ID used)

## API Specification

### `POST /api/trees`

**Description:** Create a new family tree

**Authentication:** None (v0.1) / Required in v0.3

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Smith Family Tree",
  "description": "Our family history dating back to 1850"
}
```

**Response (201 Created):**
```json
{
  "id": "019400a0-7b1a-7abc-8def-0123456789ab",
  "name": "Smith Family Tree",
  "description": "Our family history dating back to 1850",
  "createdAt": "2025-12-27T10:30:00Z",
  "updatedAt": "2025-12-27T10:30:00Z"
}
```

**Response Headers:**
```
Location: /api/trees/019400a0-7b1a-7abc-8def-0123456789ab
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input (see validation rules) |

**Validation Error Response (400):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Validation Error",
  "status": 400,
  "errors": {
    "name": ["Name is required", "Name must not exceed 200 characters"]
  }
}
```

## Data Model

### FamilyTree Entity (v0.1)

| Field | Type | Constraints |
|-------|------|-------------|
| Id | Guid (UUIDv7) | PK, generated |
| Name | string | Required, max 200 chars |
| Description | string? | Optional, max 2000 chars |
| CreatedAt | DateTime | UTC, auto-set |
| UpdatedAt | DateTime | UTC, auto-set |

> **v0.3:** OwnerId (FK to AspNetUsers) will be added for user ownership.

## Validation Rules

| Field | Rules |
|-------|-------|
| name | Required, 1-200 characters, trimmed whitespace |
| description | Optional, max 2000 characters |

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty name | Return 400 with validation error |
| Name with only whitespace | Return 400 with validation error |
| Name exceeds 200 chars | Return 400 with validation error |
| Description exceeds 2000 chars | Return 400 with validation error |
| Very long valid request | Process normally if within limits |

## Security Considerations

> **v0.1:** Endpoints are public. Security will be added in v0.3.

- Input is sanitized to prevent XSS (HTML encoded on output)
- Rate limiting: Consider adding in future versions

**v0.3 additions:**
- Only authenticated users can create trees
- OwnerId set server-side from JWT claims

## Out of Scope

- Tree sharing with other users (future feature)
- Tree templates or import (future feature)
- Tree limits per user (may add in future)
- Soft delete / archiving (future feature)

## Open Questions

- [ ] Should we add a `isPublic` flag for sharing trees publicly in the future?
- [ ] Do we need tree-level settings (e.g., date format preference)?

## Related

- Depends on: Aspire Setup (#1), Domain Entities (#3), DbContext (#4)
- Next: View Tree, Update Tree, Delete Tree, Add Person
