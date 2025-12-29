using Famlyr.Infrastructure.Models.Import;
using Famlyr.Core.Enums;

namespace Famlyr.Infrastructure.Services.Import;

public class ImportValidationResult
{
    public bool IsValid => Errors.Count == 0;
    public List<ImportError> Errors { get; } = [];
    public List<ImportWarning> Warnings { get; } = [];
    public Dictionary<string, int> TempIdToIndex { get; } = [];
    public Dictionary<string, DateOnly?> ParsedBirthDates { get; } = [];
    public Dictionary<string, DateOnly?> ParsedDeathDates { get; } = [];
    public Dictionary<string, Gender> ParsedGenders { get; } = [];
}

public class ImportValidator
{
    private const int MaxPersons = 10_000;
    private const int MaxRelationships = 50_000;
    private const int MaxNameLength = 100;
    private const int MaxNotesLength = 10_000;
    private const int MaxTreeNameLength = 100;
    private const int MaxTreeDescriptionLength = 500;

    public static ImportValidationResult Validate(ImportRequest request, bool requireTree)
    {
        var result = new ImportValidationResult();

        if (request.Version != "1.0")
        {
            result.Errors.Add(new ImportError
            {
                Type = "SCHEMA_VERSION_UNSUPPORTED",
                Message = $"Unsupported schema version: '{request.Version}'. Supported: 1.0"
            });
            return result;
        }

        if (requireTree)
        {
            ValidateTree(request.Tree, result);
        }

        ValidatePersons(request.Persons, result);

        if (request.Relationships != null)
        {
            ValidateRelationships(request.Relationships, result);
        }

        CheckIsolatedNodes(request.Persons, request.Relationships, result);

        return result;
    }

    private static void ValidateTree(ImportTreeInfo? tree, ImportValidationResult result)
    {
        if (tree == null)
        {
            result.Errors.Add(new ImportError
            {
                Type = "MISSING_TREE_INFO",
                Message = "tree object required when creating new tree"
            });
            return;
        }

        if (string.IsNullOrWhiteSpace(tree.Name))
        {
            result.Errors.Add(new ImportError
            {
                Type = "TREE_NAME_REQUIRED",
                Field = "tree.name",
                Message = "tree.name is required"
            });
        }
        else if (tree.Name.Length > MaxTreeNameLength)
        {
            result.Errors.Add(new ImportError
            {
                Type = "TREE_NAME_TOO_LONG",
                Field = "tree.name",
                Message = $"tree.name exceeds {MaxTreeNameLength} characters"
            });
        }

        if (tree.Description?.Length > MaxTreeDescriptionLength)
        {
            result.Errors.Add(new ImportError
            {
                Type = "TREE_DESCRIPTION_TOO_LONG",
                Field = "tree.description",
                Message = $"tree.description exceeds {MaxTreeDescriptionLength} characters"
            });
        }
    }

    private static void ValidatePersons(List<ImportPerson> persons, ImportValidationResult result)
    {
        if (persons.Count == 0)
        {
            result.Errors.Add(new ImportError
            {
                Type = "EMPTY_PERSONS",
                Message = "At least one person is required"
            });
            return;
        }

        if (persons.Count > MaxPersons)
        {
            result.Errors.Add(new ImportError
            {
                Type = "IMPORT_TOO_LARGE",
                Message = $"Import exceeds {MaxPersons} persons limit ({persons.Count} provided)"
            });
            return;
        }

        var seenTempIds = new HashSet<string>();

        for (var i = 0; i < persons.Count; i++)
        {
            ValidatePerson(persons[i], i, seenTempIds, result);
        }
    }

    private static void ValidatePerson(ImportPerson person, int index, HashSet<string> seenTempIds, ImportValidationResult result)
    {
        if (string.IsNullOrWhiteSpace(person.TempId))
        {
            result.Errors.Add(new ImportError
            {
                Type = "MISSING_TEMP_ID",
                Index = index,
                Field = "tempId",
                Message = $"Person at index {index} is missing required tempId"
            });
            return;
        }

        if (!seenTempIds.Add(person.TempId))
        {
            result.Errors.Add(new ImportError
            {
                Type = "DUPLICATE_TEMP_ID",
                TempId = person.TempId,
                Index = index,
                Message = $"tempId '{person.TempId}' is used by multiple persons"
            });
        }
        else
        {
            result.TempIdToIndex[person.TempId] = index;
        }

        if (person.FirstName?.Length > MaxNameLength)
        {
            result.Errors.Add(new ImportError
            {
                Type = "FIRST_NAME_TOO_LONG",
                TempId = person.TempId,
                Field = "firstName",
                Message = $"firstName exceeds {MaxNameLength} characters"
            });
        }

        if (person.LastName?.Length > MaxNameLength)
        {
            result.Errors.Add(new ImportError
            {
                Type = "LAST_NAME_TOO_LONG",
                TempId = person.TempId,
                Field = "lastName",
                Message = $"lastName exceeds {MaxNameLength} characters"
            });
        }

        if (person.Notes?.Length > MaxNotesLength)
        {
            result.Errors.Add(new ImportError
            {
                Type = "NOTES_TOO_LONG",
                TempId = person.TempId,
                Field = "notes",
                Message = $"notes exceeds {MaxNotesLength} characters"
            });
        }

        var gender = Gender.Unknown;
        if (!string.IsNullOrWhiteSpace(person.Gender))
        {
            if (!Enum.TryParse<Gender>(person.Gender, ignoreCase: true, out gender))
            {
                result.Errors.Add(new ImportError
                {
                    Type = "INVALID_GENDER",
                    TempId = person.TempId,
                    Field = "gender",
                    Message = $"Invalid gender: '{person.Gender}'. Use Male, Female, Other, or Unknown"
                });
            }
        }
        result.ParsedGenders[person.TempId] = gender;

        var (birthDate, birthError) = DateParser.Parse(person.BirthDate);
        if (birthError != null)
        {
            result.Errors.Add(new ImportError
            {
                Type = "INVALID_DATE_FORMAT",
                TempId = person.TempId,
                Field = "birthDate",
                Message = birthError
            });
        }
        result.ParsedBirthDates[person.TempId] = birthDate;

        var (deathDate, deathError) = DateParser.Parse(person.DeathDate);
        if (deathError != null)
        {
            result.Errors.Add(new ImportError
            {
                Type = "INVALID_DATE_FORMAT",
                TempId = person.TempId,
                Field = "deathDate",
                Message = deathError
            });
        }
        result.ParsedDeathDates[person.TempId] = deathDate;

        if (birthDate.HasValue && deathDate.HasValue && deathDate.Value.Year < birthDate.Value.Year)
        {
            result.Errors.Add(new ImportError
            {
                Type = "DEATH_BEFORE_BIRTH",
                TempId = person.TempId,
                Message = $"Death year ({deathDate.Value.Year}) is before birth year ({birthDate.Value.Year})"
            });
        }
    }

    private static void ValidateRelationships(List<ImportRelationship> relationships, ImportValidationResult result)
    {
        if (relationships.Count > MaxRelationships)
        {
            result.Errors.Add(new ImportError
            {
                Type = "IMPORT_TOO_LARGE",
                Message = $"Import exceeds {MaxRelationships} relationships limit ({relationships.Count} provided)"
            });
            return;
        }

        var parentCounts = new Dictionary<string, int>();
        var seenRelationships = new HashSet<string>();

        for (var i = 0; i < relationships.Count; i++)
        {
            ValidateRelationship(relationships[i], i, parentCounts, seenRelationships, result);
        }
    }

    private static void ValidateRelationship(
        ImportRelationship rel,
        int index,
        Dictionary<string, int> parentCounts,
        HashSet<string> seenRelationships,
        ImportValidationResult result)
    {
        if (!Enum.TryParse<RelationshipType>(rel.Type, ignoreCase: true, out var relType))
        {
            result.Errors.Add(new ImportError
            {
                Type = "INVALID_RELATIONSHIP_TYPE",
                Index = index,
                Message = $"Invalid relationship type: '{rel.Type}'. Use Parent or Spouse"
            });
            return;
        }

        string? subjectTempId;
        string? relativeTempId;

        if (relType == RelationshipType.Spouse)
        {
            subjectTempId = rel.Person1TempId;
            relativeTempId = rel.Person2TempId;

            if (string.IsNullOrWhiteSpace(subjectTempId) || string.IsNullOrWhiteSpace(relativeTempId))
            {
                result.Errors.Add(new ImportError
                {
                    Type = "RELATIONSHIP_ERROR",
                    Index = index,
                    Message = "Spouse relationship requires person1TempId and person2TempId"
                });
                return;
            }
        }
        else
        {
            subjectTempId = rel.ChildTempId;
            relativeTempId = rel.ParentTempId;

            if (string.IsNullOrWhiteSpace(subjectTempId) || string.IsNullOrWhiteSpace(relativeTempId))
            {
                result.Errors.Add(new ImportError
                {
                    Type = "RELATIONSHIP_ERROR",
                    Index = index,
                    Message = "Parent relationship requires parentTempId and childTempId"
                });
                return;
            }

            if (!parentCounts.TryGetValue(subjectTempId, out var count))
            {
                count = 0;
            }
            parentCounts[subjectTempId] = count + 1;

            if (parentCounts[subjectTempId] > 2)
            {
                result.Errors.Add(new ImportError
                {
                    Type = "MAX_PARENTS_EXCEEDED",
                    TempId = subjectTempId,
                    Index = index,
                    Message = $"Person '{subjectTempId}' has more than 2 parents"
                });
            }
        }

        if (subjectTempId == relativeTempId)
        {
            result.Errors.Add(new ImportError
            {
                Type = "SELF_RELATIONSHIP",
                TempId = subjectTempId,
                Index = index,
                Message = "Person cannot be related to themselves"
            });
            return;
        }

        if (!result.TempIdToIndex.ContainsKey(subjectTempId))
        {
            result.Errors.Add(new ImportError
            {
                Type = "ORPHAN_RELATIONSHIP",
                Index = index,
                Message = $"Referenced tempId '{subjectTempId}' does not exist in persons array"
            });
        }

        if (!result.TempIdToIndex.ContainsKey(relativeTempId))
        {
            result.Errors.Add(new ImportError
            {
                Type = "ORPHAN_RELATIONSHIP",
                Index = index,
                Message = $"Referenced tempId '{relativeTempId}' does not exist in persons array"
            });
        }

        var relKey = $"{relType}:{subjectTempId}:{relativeTempId}";
        if (!seenRelationships.Add(relKey))
        {
            result.Warnings.Add(new ImportWarning
            {
                TempId = subjectTempId,
                Message = $"Duplicate relationship ignored: {relType} between '{subjectTempId}' and '{relativeTempId}'"
            });
        }
    }

    private static void CheckIsolatedNodes(
        List<ImportPerson> persons,
        List<ImportRelationship>? relationships,
        ImportValidationResult result)
    {
        if (relationships == null || relationships.Count == 0)
        {
            foreach (var person in persons)
            {
                result.Warnings.Add(new ImportWarning
                {
                    TempId = person.TempId,
                    Message = "Person has no relationships (isolated node)"
                });
            }
            return;
        }

        var connectedTempIds = new HashSet<string>();
        foreach (var rel in relationships)
        {
            if (!string.IsNullOrWhiteSpace(rel.Person1TempId))
                connectedTempIds.Add(rel.Person1TempId);
            if (!string.IsNullOrWhiteSpace(rel.Person2TempId))
                connectedTempIds.Add(rel.Person2TempId);
            if (!string.IsNullOrWhiteSpace(rel.ParentTempId))
                connectedTempIds.Add(rel.ParentTempId);
            if (!string.IsNullOrWhiteSpace(rel.ChildTempId))
                connectedTempIds.Add(rel.ChildTempId);
        }

        foreach (var person in persons)
        {
            if (!connectedTempIds.Contains(person.TempId))
            {
                result.Warnings.Add(new ImportWarning
                {
                    TempId = person.TempId,
                    Message = "Person has no relationships (isolated node)"
                });
            }
        }
    }
}
