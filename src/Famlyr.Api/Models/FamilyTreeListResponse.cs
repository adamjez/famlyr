namespace Famlyr.Api.Models;

public class FamilyTreeListResponse
{
    public required IReadOnlyList<FamilyTreeSummaryModel> Trees { get; init; }
    public bool HasMore { get; init; }
}
