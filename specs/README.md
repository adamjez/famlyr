# Feature Specifications

This folder contains feature specifications for the Famlyr application. Specs are written before implementation to clarify requirements and guide development.

## Workflow

1. **Create spec** - Write feature spec using `_template.md`
2. **Review** - Get feedback, update status to "In Review"
3. **Approve** - Mark as "Approved" when ready to implement
4. **Implement** - Build the feature following the spec
5. **Update** - Keep spec in sync, mark as "Implemented" when done

## Structure

```
specs/
├── _template.md              # Feature spec template
├── README.md                 # This file
└── features/
    ├── auth/                 # Authentication features
    ├── trees/                # Family tree management
    └── persons/              # Person management
```

## Spec Status

| Status | Meaning |
|--------|---------|
| Draft | Work in progress, not ready for review |
| In Review | Ready for feedback |
| Approved | Approved for implementation |
| Implemented | Feature is complete |

## Current Specs

### Trees
- [Create Family Tree](features/trees/create-tree.md) - Draft

### Auth
- (coming soon)

### Persons
- (coming soon)
