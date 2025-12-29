namespace Famlyr.Infrastructure.Services.Import;

public static class DateParser
{
    public static (DateOnly? Date, string? Error) Parse(string? dateString)
    {
        if (string.IsNullOrWhiteSpace(dateString))
            return (null, null);

        var trimmed = dateString.Trim();

        // YYYY format
        if (trimmed.Length == 4 && int.TryParse(trimmed, out var year))
        {
            if (year < 1 || year > 9999)
                return (null, $"Year {year} is out of valid range (1-9999)");
            return (new DateOnly(year, 1, 1), null);
        }

        // YYYY-MM format
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
                return (new DateOnly(year, month, 1), null);
            }
        }

        // YYYY-MM-DD format
        if (DateOnly.TryParse(trimmed, out var fullDate))
            return (fullDate, null);

        return (null, $"Invalid date format: '{dateString}'. Use YYYY, YYYY-MM, or YYYY-MM-DD");
    }
}
