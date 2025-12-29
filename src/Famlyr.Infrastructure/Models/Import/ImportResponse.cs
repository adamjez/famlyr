namespace Famlyr.Infrastructure.Models.Import;

public record ImportResponse
{
    public required bool Success { get; init; }
    public bool DryRun { get; init; }
    public Guid? TreeId { get; init; }
    public ImportSummary? Summary { get; init; }
    public Dictionary<string, Guid>? PersonIdMap { get; init; }
    public List<ImportError>? Errors { get; init; }
}

public record ImportSummary
{
    public int PersonsCreated { get; init; }
    public int RelationshipsCreated { get; init; }
    public List<ImportWarning> Warnings { get; init; } = [];
}

public record ImportError
{
    public required string Type { get; init; }
    public string? TempId { get; init; }
    public int? Index { get; init; }
    public string? Field { get; init; }
    public required string Message { get; init; }
}

public record ImportWarning
{
    public string? TempId { get; init; }
    public required string Message { get; init; }
}
