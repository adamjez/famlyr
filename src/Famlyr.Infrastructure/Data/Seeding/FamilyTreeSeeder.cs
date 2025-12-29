using Famlyr.Core.Entities;
using Famlyr.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace Famlyr.Infrastructure.Data.Seeding;

public static class FamilyTreeSeeder
{
    private static readonly string[] MaleNames =
    [
        "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
        "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark",
        "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian",
        "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan",
        "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin",
        "Scott", "Brandon", "Benjamin", "Samuel", "Raymond", "Gregory", "Frank"
    ];

    private static readonly string[] FemaleNames =
    [
        "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan",
        "Jessica", "Sarah", "Karen", "Lisa", "Nancy", "Betty", "Margaret", "Sandra",
        "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Dorothy", "Carol",
        "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Sharon", "Laura",
        "Cynthia", "Kathleen", "Amy", "Angela", "Shirley", "Anna", "Brenda", "Pamela",
        "Emma", "Nicole", "Helen", "Samantha", "Katherine", "Christine", "Debra"
    ];

    private static readonly string[] LastNames =
    [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
        "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson",
        "Martin", "Lee", "Thompson", "White", "Harris", "Clark", "Lewis", "Robinson",
        "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Hill"
    ];

    public static async Task SeedAsync(FamlyrDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.FamilyTrees.AnyAsync(cancellationToken))
        {
            return;
        }

        var tree = GenerateFamilyTree();
        dbContext.FamilyTrees.Add(tree);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static FamilyTree GenerateFamilyTree()
    {
        var random = new Random(42); // Fixed seed for reproducible results
        var persons = new List<Person>();
        var relationships = new List<Relationship>();
        var marriedPersons = new HashSet<Guid>();

        var tree = new FamilyTree
        {
            Name = "Sample Family Tree",
            Description = "A large sample family tree with approximately 500 persons spanning multiple generations",
            OwnerId = Guid.CreateVersion7()
        };

        // Start with a single founding couple to ensure connected tree
        var founder = CreatePerson(random, Gender.Male, "Smith", 1880, tree.Id);
        founder.DeathYear = 1955;
        founder.DeathMonth = random.Next(1, 13);
        founder.DeathDay = random.Next(1, 28);
        var founderWife = CreatePerson(random, Gender.Female, GetLastName(random), 1882, tree.Id);
        founderWife.DeathYear = 1960;
        founderWife.DeathMonth = random.Next(1, 13);
        founderWife.DeathDay = random.Next(1, 28);

        persons.Add(founder);
        persons.Add(founderWife);
        marriedPersons.Add(founder.Id);
        marriedPersons.Add(founderWife.Id);
        relationships.Add(CreateSpouseRelationship(founder, founderWife));

        // Track unmarried children by generation for potential intermarriage
        var unmarriedByGeneration = new Dictionary<int, List<Person>>();

        // Generation tracking: list of couples per generation
        var generationCouples = new List<List<(Person husband, Person wife)>>
        {
            new() { (founder, founderWife) }
        };

        // Generate subsequent generations
        var targetPersons = 500;
        var currentYear = 1905;
        var generationGap = 25;
        var generation = 2;

        while (persons.Count < targetPersons && generation <= 8)
        {
            var previousCouples = generationCouples[^1];
            var newCouples = new List<(Person husband, Person wife)>();
            unmarriedByGeneration[generation] = [];

            foreach (var (father, mother) in previousCouples)
            {
                if (persons.Count >= targetPersons)
                    break;

                // Each couple has 3-5 children for faster growth
                var numChildren = random.Next(3, 6);
                var lastName = father.LastName ?? mother.LastName ?? GetLastName(random);

                for (var c = 0; c < numChildren && persons.Count < targetPersons; c++)
                {
                    var childGender = random.Next(2) == 0 ? Gender.Male : Gender.Female;
                    var birthYear = currentYear + random.Next(-3, 4);
                    var child = CreatePerson(random, childGender, lastName, birthYear, tree.Id);

                    // Death for older generations
                    if (generation <= 3 && random.NextDouble() > 0.3)
                    {
                        var deathYear = birthYear + 60 + random.Next(0, 30);
                        if (deathYear <= 2024)
                        {
                            child.DeathYear = deathYear;
                            child.DeathMonth = random.Next(1, 13);
                            child.DeathDay = random.Next(1, 28);
                        }
                    }
                    else if (generation == 4 && random.NextDouble() > 0.7)
                    {
                        var deathYear = birthYear + 70 + random.Next(0, 20);
                        if (deathYear <= 2024)
                        {
                            child.DeathYear = deathYear;
                            child.DeathMonth = random.Next(1, 13);
                            child.DeathDay = random.Next(1, 28);
                        }
                    }

                    persons.Add(child);
                    relationships.Add(CreateParentRelationship(child, father));
                    relationships.Add(CreateParentRelationship(child, mother));

                    // Try to marry with existing unmarried person from same generation first
                    if (generation < 7 && persons.Count < targetPersons - 10 && !marriedPersons.Contains(child.Id))
                    {
                        var potentialSpouse = unmarriedByGeneration[generation]
                            .FirstOrDefault(p =>
                                !marriedPersons.Contains(p.Id) &&
                                p.Gender != childGender &&
                                p.LastName != child.LastName); // Avoid same family marriage

                        Person spouse;
                        if (potentialSpouse != null)
                        {
                            // Marry existing person (intermarriage)
                            spouse = potentialSpouse;
                        }
                        else
                        {
                            // Create new spouse from outside the tree
                            var spouseGender = childGender == Gender.Male ? Gender.Female : Gender.Male;
                            var spouseBirthYear = birthYear + random.Next(-3, 4);
                            spouse = CreatePerson(random, spouseGender, GetLastName(random), spouseBirthYear, tree.Id);

                            if (generation <= 3 && random.NextDouble() > 0.4)
                            {
                                var deathYear = spouseBirthYear + 60 + random.Next(0, 30);
                                if (deathYear <= 2024)
                                {
                                    spouse.DeathYear = deathYear;
                                    spouse.DeathMonth = random.Next(1, 13);
                                    spouse.DeathDay = random.Next(1, 28);
                                }
                            }
                            persons.Add(spouse);
                        }

                        marriedPersons.Add(child.Id);
                        marriedPersons.Add(spouse.Id);

                        var husband = childGender == Gender.Male ? child : spouse;
                        var wife = childGender == Gender.Female ? child : spouse;
                        relationships.Add(CreateSpouseRelationship(husband, wife));
                        newCouples.Add((husband, wife));
                    }
                    else
                    {
                        // Add to unmarried pool for potential future marriage
                        unmarriedByGeneration[generation].Add(child);
                    }
                }
            }

            if (newCouples.Count > 0)
            {
                generationCouples.Add(newCouples);
            }

            currentYear += generationGap;
            generation++;
        }

        // Assign all persons to the tree
        foreach (var person in persons)
        {
            tree.Persons.Add(person);
        }

        return tree;
    }

    private static Person CreatePerson(Random random, Gender gender, string lastName, int birthYear, Guid familyTreeId)
    {
        var firstName = gender == Gender.Male
            ? MaleNames[random.Next(MaleNames.Length)]
            : FemaleNames[random.Next(FemaleNames.Length)];

        return new Person
        {
            FirstName = firstName,
            LastName = lastName,
            Gender = gender,
            BirthYear = birthYear,
            BirthMonth = random.Next(1, 13),
            BirthDay = random.Next(1, 28),
            FamilyTreeId = familyTreeId
        };
    }

    private static string GetLastName(Random random)
    {
        return LastNames[random.Next(LastNames.Length)];
    }

    private static Relationship CreateSpouseRelationship(Person husband, Person wife)
    {
        var relationship = new Relationship
        {
            Type = RelationshipType.Spouse,
            SubjectId = husband.Id,
            Subject = husband,
            RelativeId = wife.Id,
            Relative = wife
        };

        husband.RelationshipsAsSubject.Add(relationship);

        return relationship;
    }

    private static Relationship CreateParentRelationship(Person child, Person parent)
    {
        var relationship = new Relationship
        {
            Type = RelationshipType.Parent,
            SubjectId = child.Id,
            Subject = child,
            RelativeId = parent.Id,
            Relative = parent
        };

        child.RelationshipsAsSubject.Add(relationship);

        return relationship;
    }
}
