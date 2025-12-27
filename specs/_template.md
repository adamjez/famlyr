# Feature: [Feature Name]

> **Status:** Draft | In Review | Approved | Implemented
> **GitHub Issue:** #XX
> **Author:** [Name]
> **Last Updated:** YYYY-MM-DD

## Overview

Brief description of what this feature does and why it exists.

## User Stories

- As a [user type], I want to [action] so that [benefit]

## Requirements

### Functional

- [ ] Requirement 1
- [ ] Requirement 2

### Non-functional

- [ ] Performance: ...
- [ ] Security: ...

## API Specification

### `METHOD /api/endpoint`

**Description:** What this endpoint does

**Authentication:** Required / Not required

**Request:**
```json
{
  "field": "value"
}
```

**Response (200 OK):**
```json
{
  "field": "value"
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input |
| 401 | UNAUTHORIZED | Not authenticated |

## Data Model

Describe new entities, fields, or relationships.

## Validation Rules

| Field | Rules |
|-------|-------|
| field | Required, max 100 chars |

## Edge Cases

- What happens when...
- What if user tries to...

## Security Considerations

- Authentication requirements
- Authorization rules
- Input sanitization

## Out of Scope

- What this feature does NOT include (for future iterations)

## Open Questions

- [ ] Question that needs clarification?

## Related

- Depends on: [other feature/spec]
- Blocked by: [issue/spec]
