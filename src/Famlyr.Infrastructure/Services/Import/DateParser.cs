namespace Famlyr.Infrastructure.Services.Import;

/// <summary>
/// A parsed date that preserves precision: month and/or day are null when the
/// source only specified a year (YYYY) or year-month (YYYY-MM).
/// </summary>
public readonly record struct ParsedDate(int Year, int? Month, int? Day);

public static class DateParser
{
    public static (ParsedDate? Date, string? Error) Parse(string? dateString)
    {
        if (string.IsNullOrWhiteSpace(dateString))
            return (null, null);

        var trimmed = dateString.Trim();

        // YYYY format - year only, month/day unknown
        if (trimmed.Length == 4 && int.TryParse(trimmed, out var year))
        {
            if (year < 1 || year > 9999)
                return (null, $"Year {year} is out of valid range (1-9999)");
            return (new ParsedDate(year, null, null), null);
        }

        // YYYY-MM format - day unknown
        if (trimmed.Length == 7 && trimmed[4] == '-')
        {
            var parts = trimmed.Split('-');
            if (parts.Length == 2 &&
                int.TryParse(parts[0], out year) &&
                int.TryParse(parts[1], out var month))
            {
                if (year < 1 || year > 9999)
                    return (null, $"Year {year} is out of valid range (1-9999)");
                if (month < 1 || month > 12)
                    return (null, $"Month {month} is out of valid range (1-12)");
                return (new ParsedDate(year, month, null), null);
            }
        }

        // YYYY-MM-DD format - full date (validated via DateOnly for day-in-month)
        if (DateOnly.TryParse(trimmed, out var fullDate))
            return (new ParsedDate(fullDate.Year, fullDate.Month, fullDate.Day), null);

        return (null, $"Invalid date format: '{dateString}'. Use YYYY, YYYY-MM, or YYYY-MM-DD");
    }
}
