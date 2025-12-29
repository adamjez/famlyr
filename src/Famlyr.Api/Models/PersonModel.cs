using Famlyr.Core.Enums;

namespace Famlyr.Api.Models;

public class PersonModel
{
    public required Guid Id { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public Gender Gender { get; init; }
    public string? BirthDate { get; init; }
    public string? DeathDate { get; init; }
    public string? PrimaryPhotoUrl { get; init; }
}
