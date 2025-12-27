using Famlyr.Core.Enums;

namespace Famlyr.Api.Models;

public class PersonModel
{
    public required Guid Id { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public Gender Gender { get; init; }
    public DateOnly? BirthDate { get; init; }
    public DateOnly? DeathDate { get; init; }
}
