using Famlyr.Api.Models;
using Famlyr.Core.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Famlyr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FamilyTreeController : ControllerBase
{
    [HttpGet("{id:guid}")]
    public ActionResult<FamilyTreeModel> GetFamilyTree(Guid id)
    {
        var sampleTree = GenerateSampleFamilyTree();
        return Ok(sampleTree);
    }

    private static FamilyTreeModel GenerateSampleFamilyTree()
    {
        var treeId = Guid.CreateVersion7();
        var ownerId = Guid.CreateVersion7();

        // Generation 1 (Grandparents)
        var grandpaJohn = CreatePerson("John", "Smith", Gender.Male, new DateOnly(1940, 3, 15), new DateOnly(2015, 8, 22));
        var grandmaMary = CreatePerson("Mary", "Smith", Gender.Female, new DateOnly(1942, 7, 8), new DateOnly(2018, 1, 5));
        var grandpaRobert = CreatePerson("Robert", "Johnson", Gender.Male, new DateOnly(1938, 11, 20), new DateOnly(2010, 4, 30));
        var grandmaElizabeth = CreatePerson("Elizabeth", "Johnson", Gender.Female, new DateOnly(1941, 5, 12), null);

        // Generation 2 (Parents)
        var fatherMichael = CreatePerson("Michael", "Smith", Gender.Male, new DateOnly(1965, 9, 3), null);
        var motherSarah = CreatePerson("Sarah", "Smith", Gender.Female, new DateOnly(1968, 12, 17), null);
        var uncleDavid = CreatePerson("David", "Smith", Gender.Male, new DateOnly(1970, 2, 28), null);
        var auntLinda = CreatePerson("Linda", "Smith", Gender.Female, new DateOnly(1972, 6, 14), null);

        // Generation 3 (Children)
        var childEmma = CreatePerson("Emma", "Smith", Gender.Female, new DateOnly(1995, 4, 22), null);
        var childJames = CreatePerson("James", "Smith", Gender.Male, new DateOnly(1998, 8, 10), null);
        var cousinOlivia = CreatePerson("Olivia", "Smith", Gender.Female, new DateOnly(2000, 1, 5), null);

        // Historical figure with unknown name
        var unknownAncestor = CreatePerson(null, "Smith", Gender.Unknown, null, null);

        var persons = new List<PersonModel>
        {
            grandpaJohn, grandmaMary, grandpaRobert, grandmaElizabeth,
            fatherMichael, motherSarah, uncleDavid, auntLinda,
            childEmma, childJames, cousinOlivia, unknownAncestor
        };

        var relationships = new List<RelationshipModel>
        {
            // Grandparents marriages
            CreateRelationship(RelationshipType.Spouse, grandpaJohn.Id, grandmaMary.Id),
            CreateRelationship(RelationshipType.Spouse, grandpaRobert.Id, grandmaElizabeth.Id),

            // Parents of Michael and David (John & Mary's children)
            CreateRelationship(RelationshipType.Parent, fatherMichael.Id, grandpaJohn.Id),
            CreateRelationship(RelationshipType.Parent, fatherMichael.Id, grandmaMary.Id),
            CreateRelationship(RelationshipType.Parent, uncleDavid.Id, grandpaJohn.Id),
            CreateRelationship(RelationshipType.Parent, uncleDavid.Id, grandmaMary.Id),

            // Parents of Sarah (Robert & Elizabeth's child)
            CreateRelationship(RelationshipType.Parent, motherSarah.Id, grandpaRobert.Id),
            CreateRelationship(RelationshipType.Parent, motherSarah.Id, grandmaElizabeth.Id),

            // Michael & Sarah marriage
            CreateRelationship(RelationshipType.Spouse, fatherMichael.Id, motherSarah.Id),

            // David & Linda marriage
            CreateRelationship(RelationshipType.Spouse, uncleDavid.Id, auntLinda.Id),

            // Emma and James's parents (Michael & Sarah's children)
            CreateRelationship(RelationshipType.Parent, childEmma.Id, fatherMichael.Id),
            CreateRelationship(RelationshipType.Parent, childEmma.Id, motherSarah.Id),
            CreateRelationship(RelationshipType.Parent, childJames.Id, fatherMichael.Id),
            CreateRelationship(RelationshipType.Parent, childJames.Id, motherSarah.Id),

            // Olivia's parents (David & Linda's child)
            CreateRelationship(RelationshipType.Parent, cousinOlivia.Id, uncleDavid.Id),
            CreateRelationship(RelationshipType.Parent, cousinOlivia.Id, auntLinda.Id),

            // Unknown ancestor as John's parent
            CreateRelationship(RelationshipType.Parent, grandpaJohn.Id, unknownAncestor.Id),
        };

        return new FamilyTreeModel
        {
            Id = treeId,
            Name = "Smith Family Tree",
            Description = "A sample family tree spanning four generations",
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Persons = persons,
            Relationships = relationships
        };
    }

    private static PersonModel CreatePerson(string? firstName, string? lastName, Gender gender, DateOnly? birthDate, DateOnly? deathDate)
    {
        return new PersonModel
        {
            Id = Guid.CreateVersion7(),
            FirstName = firstName,
            LastName = lastName,
            Gender = gender,
            BirthDate = birthDate,
            DeathDate = deathDate
        };
    }

    private static RelationshipModel CreateRelationship(RelationshipType type, Guid subjectId, Guid relativeId)
    {
        return new RelationshipModel
        {
            Id = Guid.CreateVersion7(),
            Type = type,
            SubjectId = subjectId,
            RelativeId = relativeId
        };
    }
}
