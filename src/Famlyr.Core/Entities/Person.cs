using Famlyr.Core.Enums;

namespace Famlyr.Core.Entities;

public class Person
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public Gender Gender { get; set; } = Gender.Unknown;
    public DateOnly? BirthDate { get; set; }
    public DateOnly? DeathDate { get; set; }

    public required Guid FamilyTreeId { get; set; }
    public FamilyTree? FamilyTree { get; set; }

    public ICollection<Relationship> RelationshipsAsSubject { get; set; } = [];
    public ICollection<Relationship> RelationshipsAsRelative { get; set; } = [];
}
