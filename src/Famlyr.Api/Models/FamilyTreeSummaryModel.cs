namespace Famlyr.Api.Models;

public class FamilyTreeSummaryModel
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required int PersonCount { get; init; }
}
