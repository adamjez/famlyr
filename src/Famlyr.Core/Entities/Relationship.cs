using Famlyr.Core.Enums;

namespace Famlyr.Core.Entities;

public class Relationship
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public RelationshipType Type { get; set; }

    public required Guid SubjectId { get; set; }
    public Person? Subject { get; set; }

    public required Guid RelativeId { get; set; }
    public Person? Relative { get; set; }
}
