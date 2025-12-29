using System.Globalization;

namespace Famlyr.Api.Helpers;

public static class DateHelper
{
    public static (int? Year, int? Month, int? Day) ParseDate(string? dateString)
    {
        if (string.IsNullOrEmpty(dateString))
            return (null, null, null);

        // Year-only format: "1950"
        if (dateString.Length == 4 && int.TryParse(dateString, out var year))
            return (year, null, null);

        // Full date format: "1950-03-15"
        if (DateOnly.TryParse(dateString, CultureInfo.InvariantCulture, out var date))
            return (date.Year, date.Month, date.Day);

        throw new FormatException($"Invalid date format: {dateString}. Use YYYY or YYYY-MM-DD.");
    }

    public static string? FormatDate(int? year, int? month, int? day)
    {
        if (year is null)
            return null;

        if (month is null || day is null)
            return year.Value.ToString(CultureInfo.InvariantCulture);

        return new DateOnly(year.Value, month.Value, day.Value).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    public static bool IsValidDeathAfterBirth(int? birthYear, int? deathYear)
    {
        if (birthYear is null || deathYear is null)
            return true;
        return deathYear >= birthYear;
    }
}
