using Famlyr.Infrastructure.Models.Import;
using Famlyr.Core.Entities;
using Famlyr.Core.Enums;
using Famlyr.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Famlyr.Infrastructure.Services.Import;

public class ImportService(FamlyrDbContext context) : IImportService
{
    public async Task<ImportResponse> ImportIntoExistingTreeAsync(
        Guid treeId,
        ImportRequest request,
        bool dryRun,
        CancellationToken cancellationToken = default)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId, cancellationToken);
        if (!treeExists)
        {
            return new ImportResponse
            {
                Success = false,
                Errors = [new ImportError { Type = "TREE_NOT_FOUND", Message = "Target tree does not exist" }]
            };
        }

        var validation = ImportValidator.Validate(request, requireTree: false);
        if (!validation.IsValid)
        {
            return new ImportResponse
            {
                Success = false,
                Errors = validation.Errors
            };
        }

        if (dryRun)
        {
            return CreateDryRunResponse(request, validation);
        }

        return await ExecuteImportAsync(treeId, request, validation, cancellationToken);
    }

    public async Task<ImportResponse> ImportWithNewTreeAsync(
        ImportRequest request,
        bool dryRun,
        CancellationToken cancellationToken = default)
    {
        var validation = ImportValidator.Validate(request, requireTree: true);
        if (!validation.IsValid)
        {
            return new ImportResponse
            {
                Success = false,
                Errors = validation.Errors
            };
        }

        if (dryRun)
        {
            return CreateDryRunResponse(request, validation);
        }

        var tree = new FamilyTree
        {
            Name = request.Tree!.Name,
            Description = request.Tree.Description,
            OwnerId = Guid.CreateVersion7()
        };

        return await ExecuteImportWithNewTreeAsync(tree, request, validation, cancellationToken);
    }

    private static ImportResponse CreateDryRunResponse(ImportRequest request, ImportValidationResult validation)
    {
        return new ImportResponse
        {
            Success = true,
            DryRun = true,
            Summary = new ImportSummary
            {
                PersonsCreated = request.Persons.Count,
                RelationshipsCreated = request.Relationships?.Count ?? 0,
                Warnings = validation.Warnings
            }
        };
    }

    private async Task<ImportResponse> ExecuteImportAsync(
        Guid treeId,
        ImportRequest request,
        ImportValidationResult validation,
        CancellationToken cancellationToken)
    {
        var strategy = context.Database.CreateExecutionStrategy();

        var (personIdMap, relationshipCount) = await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

            var result = await ImportDataAsync(treeId, request, validation, cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            return result;
        });

        return new ImportResponse
        {
            Success = true,
            DryRun = false,
            Summary = new ImportSummary
            {
                PersonsCreated = personIdMap.Count,
                RelationshipsCreated = relationshipCount,
                Warnings = validation.Warnings
            },
            PersonIdMap = personIdMap
        };
    }

    private async Task<ImportResponse> ExecuteImportWithNewTreeAsync(
        FamilyTree tree,
        ImportRequest request,
        ImportValidationResult validation,
        CancellationToken cancellationToken)
    {
        var strategy = context.Database.CreateExecutionStrategy();

        var (personIdMap, relationshipCount) = await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

            context.FamilyTrees.Add(tree);
            await context.SaveChangesAsync(cancellationToken);

            var result = await ImportDataAsync(tree.Id, request, validation, cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            return result;
        });

        return new ImportResponse
        {
            Success = true,
            DryRun = false,
            TreeId = tree.Id,
            Summary = new ImportSummary
            {
                PersonsCreated = personIdMap.Count,
                RelationshipsCreated = relationshipCount,
                Warnings = validation.Warnings
            },
            PersonIdMap = personIdMap
        };
    }

    private async Task<(Dictionary<string, Guid> personIdMap, int relationshipCount)> ImportDataAsync(
        Guid treeId,
        ImportRequest request,
        ImportValidationResult validation,
        CancellationToken cancellationToken)
    {
        var personIdMap = new Dictionary<string, Guid>();
        var persons = new List<Person>();

        foreach (var importPerson in request.Persons)
        {
            var person = new Person
            {
                FirstName = string.IsNullOrWhiteSpace(importPerson.FirstName) ? null : importPerson.FirstName.Trim(),
                LastName = string.IsNullOrWhiteSpace(importPerson.LastName) ? null : importPerson.LastName.Trim(),
                Gender = validation.ParsedGenders[importPerson.TempId],
                BirthDate = validation.ParsedBirthDates[importPerson.TempId],
                DeathDate = validation.ParsedDeathDates[importPerson.TempId],
                Notes = string.IsNullOrWhiteSpace(importPerson.Notes) ? null : importPerson.Notes.Trim(),
                FamilyTreeId = treeId
            };

            personIdMap[importPerson.TempId] = person.Id;
            persons.Add(person);
        }

        context.Persons.AddRange(persons);
        await context.SaveChangesAsync(cancellationToken);

        var relationships = new List<Relationship>();
        var processedRelationships = new HashSet<string>();

        if (request.Relationships != null)
        {
            foreach (var importRel in request.Relationships)
            {
                var relType = Enum.Parse<RelationshipType>(importRel.Type, ignoreCase: true);

                Guid subjectId, relativeId;

                if (relType == RelationshipType.Spouse)
                {
                    subjectId = personIdMap[importRel.Person1TempId!];
                    relativeId = personIdMap[importRel.Person2TempId!];
                }
                else
                {
                    subjectId = personIdMap[importRel.ChildTempId!];
                    relativeId = personIdMap[importRel.ParentTempId!];
                }

                var relKey = $"{relType}:{subjectId}:{relativeId}";
                if (!processedRelationships.Add(relKey))
                    continue;

                relationships.Add(new Relationship
                {
                    Type = relType,
                    SubjectId = subjectId,
                    RelativeId = relativeId
                });
            }

            context.Relationships.AddRange(relationships);
            await context.SaveChangesAsync(cancellationToken);
        }

        return (personIdMap, relationships.Count);
    }
}
