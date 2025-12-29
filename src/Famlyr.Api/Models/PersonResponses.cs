namespace Famlyr.Api.Models;

public class PersonPhotoModel
{
    public required Guid Id { get; init; }
    public bool IsPrimary { get; init; }
    public DateTime CreatedAt { get; init; }
    public int Order { get; init; }
    public required string ImageUrl { get; init; }
}

public class PersonDetailModel
{
    public required Guid Id { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public required string Gender { get; init; }
    public string? BirthDate { get; init; }
    public string? DeathDate { get; init; }
    public string? Notes { get; init; }
    public required IReadOnlyList<PersonPhotoModel> Photos { get; init; }
}

public class PersonSearchResultModel
{
    public required Guid Id { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public required string Gender { get; init; }
    public string? BirthDate { get; init; }
    public string? DeathDate { get; init; }
}

public class PersonSearchResponse
{
    public required IReadOnlyList<PersonSearchResultModel> Persons { get; init; }
}

public class PhotoReorderResponse
{
    public required IReadOnlyList<PersonPhotoModel> Photos { get; init; }
}

public class RelatedPersonModel
{
    public required Guid Id { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public required string Gender { get; init; }
}

public class PersonRelationshipModel
{
    public required Guid RelationshipId { get; init; }
    public required RelatedPersonModel Person { get; init; }
}

public class PersonRelationshipsResponse
{
    public required IReadOnlyList<PersonRelationshipModel> Parents { get; init; }
    public required IReadOnlyList<PersonRelationshipModel> Children { get; init; }
    public required IReadOnlyList<PersonRelationshipModel> Spouses { get; init; }
}

public class RelationshipCreatedModel
{
    public required Guid Id { get; init; }
    public required string Type { get; init; }
    public required Guid SubjectId { get; init; }
    public required Guid RelativeId { get; init; }
}
