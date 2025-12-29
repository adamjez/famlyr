using Famlyr.Core.Enums;

namespace Famlyr.Core.Entities;

public class Person
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public Gender Gender { get; set; } = Gender.Unknown;
    public int? BirthYear { get; set; }
    public int? BirthMonth { get; set; }
    public int? BirthDay { get; set; }
    public int? DeathYear { get; set; }
    public int? DeathMonth { get; set; }
    public int? DeathDay { get; set; }
    public string? Notes { get; set; }

    public required Guid FamilyTreeId { get; set; }
    public FamilyTree? FamilyTree { get; set; }

    public ICollection<Relationship> RelationshipsAsSubject { get; set; } = [];
    public ICollection<Relationship> RelationshipsAsRelative { get; set; } = [];
    public ICollection<PersonPhoto> Photos { get; set; } = [];
}
