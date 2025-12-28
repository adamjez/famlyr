namespace Famlyr.Api.Models;

public class FamilyTreeDetailModel
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public required int PersonCount { get; init; }
    public YearRangeModel? YearRange { get; init; }
    public required IReadOnlyList<PersonModel> Persons { get; init; }
    public required IReadOnlyList<RelationshipModel> Relationships { get; init; }
}
