namespace Famlyr.Api.Models;

public class CreateFamilyTreeRequest
{
    public required string Name { get; init; }
    public string? Description { get; init; }
}

public class UpdateFamilyTreeRequest
{
    public required string Name { get; init; }
    public string? Description { get; init; }
}
