namespace Famlyr.Api.Models;

public class CreatePersonRequest
{
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? BirthName { get; init; }
    public string? Gender { get; init; }
    public string? BirthDate { get; init; }
    public string? DeathDate { get; init; }
    public string? Notes { get; init; }
    public IFormFileCollection? Photos { get; init; }
}

public class UpdatePersonRequest
{
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? BirthName { get; init; }
    public string? Gender { get; init; }
    public string? BirthDate { get; init; }
    public string? DeathDate { get; init; }
    public string? Notes { get; init; }
    public IFormFileCollection? Photos { get; init; }
}

public class ReorderPhotosRequest
{
    public required List<Guid> PhotoIds { get; init; }
}

public class AddRelationshipRequest
{
    public required Guid RelatedPersonId { get; init; }
    public required string Type { get; init; }
}
