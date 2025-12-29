namespace Famlyr.Api.Models;

public record TreeStatisticsModel
{
    public required SummaryStats Summary { get; init; }
    public required GenderStats GenderStats { get; init; }
    public required LifespanStats LifespanStats { get; init; }
    public required IReadOnlyList<NameStatItem> FirstNameStats { get; init; }
    public required IReadOnlyList<NameStatItem> LastNameStats { get; init; }
    public required IReadOnlyList<WeekdayStatItem> BirthWeekdayStats { get; init; }
    public required IReadOnlyList<DayOfMonthStatItem> BirthDayOfMonthStats { get; init; }
    public required IReadOnlyList<MonthStatItem> BirthMonthStats { get; init; }
    public required IReadOnlyList<DecadeStatItem> BirthDecadeStats { get; init; }
}

public record SummaryStats
{
    public required int TotalPersons { get; init; }
    public required int PersonsWithBirthDate { get; init; }
    public required int PersonsWithDeathDate { get; init; }
    public required int LivingPersons { get; init; }
}

public record GenderStats
{
    public required int Male { get; init; }
    public required int Female { get; init; }
    public required int Other { get; init; }
    public required int Unknown { get; init; }
}

public record LifespanStats
{
    public double? AverageLifespanYears { get; init; }
    public int? OldestDeathAge { get; init; }
    public int? YoungestDeathAge { get; init; }
    public required int PersonsWithLifespan { get; init; }
}

public record NameStatItem(string Name, int Count);

public record WeekdayStatItem(int Weekday, string Label, int Count);

public record DayOfMonthStatItem(int Day, int Count);

public record MonthStatItem(int Month, string Label, int Count);

public record DecadeStatItem(int Decade, int Count);
