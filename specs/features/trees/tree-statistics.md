# Feature: Tree Statistics

> **Status:** Implemented
> **GitHub Issue:** TBD
> **Author:** Claude
> **Last Updated:** 2025-12-29

## Overview

Display interesting statistical data from a family tree, including name frequency analysis, birth date distributions, gender breakdown, lifespan metrics, and generational analysis. Statistics are shown on a dedicated page accessible from the tree detail view.

## User Stories

- As a family historian, I want to see which first and last names are most common in my family tree so that I can identify naming patterns across generations
- As a user, I want to see birth date distributions by weekday, day of month, and month so that I can discover interesting patterns in my family's history
- As a user, I want to see gender distribution statistics so that I can understand the demographic composition of my family tree
- As a user, I want to see lifespan statistics so that I can understand longevity patterns in my family
- As a user, I want to see how many family members were born in each decade so that I can visualize the generational spread of my tree

## Requirements

### Functional

- [x] Display summary statistics (total persons, data completeness)
- [x] Show top 10 most common first names with occurrence counts
- [x] Show top 10 most common last names with occurrence counts
- [x] Display bar chart of births by weekday (Sunday-Saturday)
- [x] Display bar chart of births by day of month (1-31)
- [x] Display bar chart of births by month (January-December)
- [x] Display gender distribution (Male, Female, Other, Unknown)
- [x] Display lifespan statistics (average, oldest, youngest death age)
- [x] Display birth decade distribution chart
- [x] Navigate to statistics page from tree detail view

### Non-functional

- [x] Performance: Statistics calculation must complete within 500ms for trees with 1000 persons
- [x] Performance: Single database query to fetch all required data
- [x] Accessibility: Charts must have text alternatives for screen readers
- [x] Responsiveness: Statistics page must work on mobile devices

## API Specification

### `GET /api/trees/{id}/statistics`

**Description:** Retrieves computed statistics for a family tree

**Authentication:** Not required (v0.1)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | Guid | Family tree ID |

**Response (200 OK):**
```json
{
  "summary": {
    "totalPersons": 500,
    "personsWithBirthDate": 480,
    "personsWithDeathDate": 350,
    "livingPersons": 150
  },
  "genderStats": {
    "male": 245,
    "female": 240,
    "other": 5,
    "unknown": 10
  },
  "lifespanStats": {
    "averageLifespanYears": 72.5,
    "oldestDeathAge": 98,
    "youngestDeathAge": 2,
    "personsWithLifespan": 350
  },
  "firstNameStats": [
    { "name": "John", "count": 15 },
    { "name": "Mary", "count": 12 },
    { "name": "William", "count": 10 }
  ],
  "lastNameStats": [
    { "name": "Smith", "count": 45 },
    { "name": "Johnson", "count": 38 },
    { "name": "Williams", "count": 25 }
  ],
  "birthWeekdayStats": [
    { "weekday": 0, "label": "Sunday", "count": 65 },
    { "weekday": 1, "label": "Monday", "count": 72 },
    { "weekday": 2, "label": "Tuesday", "count": 68 },
    { "weekday": 3, "label": "Wednesday", "count": 70 },
    { "weekday": 4, "label": "Thursday", "count": 66 },
    { "weekday": 5, "label": "Friday", "count": 71 },
    { "weekday": 6, "label": "Saturday", "count": 68 }
  ],
  "birthDayOfMonthStats": [
    { "day": 1, "count": 18 },
    { "day": 2, "count": 15 }
  ],
  "birthMonthStats": [
    { "month": 1, "label": "January", "count": 42 },
    { "month": 2, "label": "February", "count": 38 },
    { "month": 3, "label": "March", "count": 45 }
  ],
  "birthDecadeStats": [
    { "decade": 1880, "count": 12 },
    { "decade": 1890, "count": 25 },
    { "decade": 1900, "count": 45 },
    { "decade": 1910, "count": 52 }
  ]
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 404 | TREE_NOT_FOUND | Family tree with specified ID does not exist |

## Data Model

No new entities required. Statistics are computed from existing `Person` data:

- `FirstName` - For name frequency analysis
- `LastName` - For name frequency analysis
- `Gender` - For gender distribution
- `BirthDate` - For birth date distributions and decade breakdown
- `DeathDate` - For lifespan calculations

### Response Models

```csharp
public record TreeStatisticsModel
{
    public required SummaryStats Summary { get; init; }
    public required GenderStats GenderStats { get; init; }
    public required LifespanStats LifespanStats { get; init; }
    public required List<NameStatItem> FirstNameStats { get; init; }
    public required List<NameStatItem> LastNameStats { get; init; }
    public required List<WeekdayStatItem> BirthWeekdayStats { get; init; }
    public required List<DayOfMonthStatItem> BirthDayOfMonthStats { get; init; }
    public required List<MonthStatItem> BirthMonthStats { get; init; }
    public required List<DecadeStatItem> BirthDecadeStats { get; init; }
}

public record SummaryStats
{
    public int TotalPersons { get; init; }
    public int PersonsWithBirthDate { get; init; }
    public int PersonsWithDeathDate { get; init; }
    public int LivingPersons { get; init; }
}

public record GenderStats
{
    public int Male { get; init; }
    public int Female { get; init; }
    public int Other { get; init; }
    public int Unknown { get; init; }
}

public record LifespanStats
{
    public double? AverageLifespanYears { get; init; }
    public int? OldestDeathAge { get; init; }
    public int? YoungestDeathAge { get; init; }
    public int PersonsWithLifespan { get; init; }
}

public record NameStatItem(string Name, int Count);
public record WeekdayStatItem(int Weekday, string Label, int Count);
public record DayOfMonthStatItem(int Day, int Count);
public record MonthStatItem(int Month, string Label, int Count);
public record DecadeStatItem(int Decade, int Count);
```

## Frontend Components

### New Files

```
src/routes/trees/[id]/statistics/
├── +page.svelte           # Statistics page component
└── +page.server.ts        # Data loader

src/lib/components/statistics/
├── SummaryCards.svelte    # Summary stat cards (total, coverage)
├── NameStatsSection.svelte # Name frequency tables
├── BarChart.svelte        # Reusable bar chart (SVG-based)
├── GenderChart.svelte     # Gender distribution pie/donut chart
└── LifespanStats.svelte   # Lifespan statistics display
```

### UI Layout

1. **Header**: "Statistics for [Tree Name]" with back navigation
2. **Summary Cards Row**: Total persons, data completeness percentages
3. **Gender & Lifespan Section**: Side-by-side charts
4. **Name Statistics Section**: Two tables (first names, last names)
5. **Birth Date Charts Section**:
   - Weekday distribution bar chart
   - Month distribution bar chart
   - Day of month distribution bar chart
6. **Generation Section**: Decade distribution bar chart

### Navigation

Add "Statistics" link to tree detail page header/navigation area.

## Edge Cases

- **Empty tree**: Display "No data available" message with zero counts
- **No birth dates**: Birth date charts show empty state with message
- **No death dates**: Lifespan section shows "Insufficient data" message
- **All unknown names**: Name tables show "(Unknown)" as a counted item
- **Single person tree**: All statistics still calculated and displayed
- **Null names**: Group null first/last names as "(Unknown)" in statistics

## Security Considerations

- No authentication required in v0.1 (public access)
- Input validation: Tree ID must be valid GUID format
- No sensitive data exposed beyond what's already in tree detail view

## Out of Scope

- Filtering statistics by date range
- Comparing statistics between multiple trees
- Exporting statistics to PDF/CSV
- Relationship-based statistics (e.g., average children per parent)
- Interactive chart drill-down

## Open Questions

- [x] Should name statistics include a "Show all" option beyond top 10? **Decision: No, top 10 only**
- [x] Should we cache statistics for large trees? **Decision: No, fresh computation is fast enough**

## Related

- Depends on: [view-tree-detail.md](view-tree-detail.md) - Navigation from tree detail
- Related: [list-trees.md](list-trees.md) - Tree listing shows person count
