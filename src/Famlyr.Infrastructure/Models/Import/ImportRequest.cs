namespace Famlyr.Infrastructure.Models.Import;

public record ImportRequest
{
    public required string Version { get; init; }
    public ImportMetadata? Metadata { get; init; }
    public ImportTreeInfo? Tree { get; init; }
    public required List<ImportPerson> Persons { get; init; }
    public List<ImportRelationship>? Relationships { get; init; }
}

public record ImportMetadata
{
    public string? Source { get; init; }
    public DateTime? ExtractedAt { get; init; }
    public string? Notes { get; init; }
}

public record ImportTreeInfo
{
    public required string Name { get; init; }
    public string? Description { get; init; }
}

public record ImportPerson
{
    public required string TempId { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? Gender { get; init; }
    public string? BirthDate { get; init; }
    public string? DeathDate { get; init; }
    public string? Notes { get; init; }
}

public record ImportRelationship
{
    public required string Type { get; init; }
    public string? Person1TempId { get; init; }
    public string? Person2TempId { get; init; }
    public string? ParentTempId { get; init; }
    public string? ChildTempId { get; init; }
}
