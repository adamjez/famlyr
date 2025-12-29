# Feature: Tree Management

> **Status:** Draft
> **GitHub Issue:** #6
> **Author:** Adam Jež
> **Last Updated:** 2025-12-29

## Overview

Manage family trees including creating, editing, and deleting. A family tree is the top-level container that holds persons and their relationships.

This spec covers:
- **Create** - POST /api/trees
- **Update** - PUT /api/trees/{id}
- **Delete** - DELETE /api/trees/{id}

> **Note:** In v0.1, all endpoints are public (no authentication). User ownership will be added in v0.3.

## User Stories

### Create
- As a user, I want to create a new family tree so that I can start documenting my family lineage
- As a user, I want to give my tree a name and description so that I can identify it among multiple trees

### Edit
- As a user, I want to edit my tree's name so that I can correct mistakes or update it as the tree evolves
- As a user, I want to edit my tree's description so that I can provide more accurate information

### Delete
- As a user, I want to delete a tree I no longer need so that I can keep my workspace organized
- As a user, I want to see a confirmation before deleting so that I don't accidentally lose my data

## Requirements

### Functional

**Create:**
- [ ] User can create a new family tree with a name
- [ ] User can optionally provide a description
- [ ] System generates UUIDv7 for the tree ID
- [ ] System records CreatedAt and UpdatedAt timestamps
- [ ] User receives the created tree data in response

**Edit:**
- [ ] User can update a tree's name
- [ ] User can update a tree's description
- [ ] System updates the UpdatedAt timestamp on edit
- [ ] User receives the updated tree data in response

**Delete:**
- [ ] User can delete a family tree
- [ ] Deleting a tree removes all associated data (persons, relationships, photos)
- [ ] Delete is permanent (hard delete, no recovery)
- [ ] User sees confirmation dialog before delete
- [ ] User is redirected to tree list after successful delete

### Non-functional

- [ ] Response time < 200ms for tree operations
- [ ] Delete handles trees with up to 10,000 persons efficiently

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

### `PUT /api/trees/{id}`

**Description:** Update an existing family tree's name and/or description

**Authentication:** None (v0.1) / Required in v0.3

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | Guid | Family tree ID |

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Tree Name",
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "id": "019400a0-7b1a-7abc-8def-0123456789ab",
  "name": "Updated Tree Name",
  "description": "Updated description",
  "createdAt": "2025-12-27T10:30:00Z",
  "updatedAt": "2025-12-29T14:15:00Z"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input (see validation rules) |
| 404 | NOT_FOUND | Tree with specified ID does not exist |

### `DELETE /api/trees/{id}`

**Description:** Permanently delete a family tree and all associated data

**Authentication:** None (v0.1) / Required in v0.3

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | Guid | Family tree ID |

**Response (204 No Content):**

No response body.

**Cascade Behavior:**

Deleting a tree permanently removes:
- All persons in the tree
- All relationships between persons
- All photos associated with persons

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | NOT_FOUND | Tree with specified ID does not exist |

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

### Create / Edit

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty name | Return 400 with validation error |
| Name with only whitespace | Return 400 with validation error |
| Name exceeds 200 chars | Return 400 with validation error |
| Description exceeds 2000 chars | Return 400 with validation error |
| Very long valid request | Process normally if within limits |

### Edit

| Scenario | Expected Behavior |
|----------|-------------------|
| Tree not found | Return 404 |
| No changes submitted | Return 200 with unchanged data |

### Delete

| Scenario | Expected Behavior |
|----------|-------------------|
| Tree not found | Return 404 |
| Tree with no persons | Delete successfully |
| Tree with many persons (10,000+) | Delete successfully (may take longer) |
| User cancels confirmation | No action taken |

## Frontend UI

### Edit Tree

Location: Tree detail page (`/trees/[id]`)

**Components:**
- Edit button (pencil icon) in the page header, next to tree name
- Clicking opens a modal dialog

**Edit Modal:**
- Title: "Edit Tree"
- Form fields:
  - Name (text input, required, pre-filled with current name)
  - Description (textarea, optional, pre-filled with current description)
- Actions:
  - "Save" button (primary) - submits PUT request
  - "Cancel" button (secondary) - closes modal without changes
- On success: Close modal, show success toast, update page with new values
- On error: Show error message in modal, keep modal open

### Delete Tree

Location: Tree detail page (`/trees/[id]`)

**Components:**
- Delete button (trash icon, danger/red style) in the page header
- Clicking opens a confirmation dialog

**Confirmation Dialog:**
- Title: "Delete Tree"
- Message: "Are you sure you want to delete '{tree name}'? This will permanently remove all {person count} persons and their data. This action cannot be undone."
- Actions:
  - "Delete" button (danger/red) - submits DELETE request
  - "Cancel" button (secondary) - closes dialog
- On success: Show success toast, redirect to `/trees` (tree list)
- On error: Show error toast, close dialog

## Security Considerations

> **v0.1:** Endpoints are public. Security will be added in v0.3.

- Input is sanitized to prevent XSS (HTML encoded on output)
- Rate limiting: Consider adding in future versions

**v0.3 additions:**
- Only authenticated users can create/edit/delete trees
- Users can only edit/delete trees they own
- OwnerId set server-side from JWT claims

## Out of Scope

- Tree sharing with other users (future feature)
- Tree templates or import (future feature)
- Tree limits per user (may add in future)
- Soft delete / archiving (hard delete only in v0.1)
- Bulk delete multiple trees

## Open Questions

- [ ] Should we add a `isPublic` flag for sharing trees publicly in the future?
- [ ] Do we need tree-level settings (e.g., date format preference)?

## Related

- Depends on: Aspire Setup (#1), Domain Entities (#3), DbContext (#4)
- Related specs: `view-tree-detail.md`, `list-trees.md`, `view-tree.md`
