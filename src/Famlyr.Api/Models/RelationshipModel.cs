using Famlyr.Core.Enums;

namespace Famlyr.Api.Models;

public class RelationshipModel
{
    public required Guid Id { get; init; }
    public RelationshipType Type { get; init; }
    public required Guid SubjectId { get; init; }
    public required Guid RelativeId { get; init; }
}
