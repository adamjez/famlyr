using Famlyr.Api.Models;
using Famlyr.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Famlyr.Api.Controllers;

[ApiController]
[Route("api/trees")]
public class FamilyTreeController(FamlyrDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<FamilyTreeListResponse>> GetFamilyTrees()
    {
        var trees = await context.FamilyTrees
            .Select(ft => new FamilyTreeSummaryModel
            {
                Id = ft.Id,
                Name = ft.Name,
                Description = ft.Description,
                PersonCount = ft.Persons.Count
            })
            .ToListAsync();

        return Ok(new FamilyTreeListResponse { Trees = trees });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FamilyTreeModel>> GetFamilyTree(Guid id)
    {
        var result = await context.FamilyTrees
            .Where(ft => ft.Id == id)
            .Select(ft => new FamilyTreeModel
            {
                Id = ft.Id,
                Name = ft.Name,
                Description = ft.Description,
                OwnerId = ft.OwnerId,
                CreatedAt = ft.CreatedAt,
                UpdatedAt = ft.UpdatedAt,
                Persons = ft.Persons.Select(p => new PersonModel
                {
                    Id = p.Id,
                    FirstName = p.FirstName,
                    LastName = p.LastName,
                    Gender = p.Gender,
                    BirthDate = p.BirthDate,
                    DeathDate = p.DeathDate
                }).ToList(),
                Relationships = ft.Persons
                    .SelectMany(p => p.RelationshipsAsSubject)
                    .Select(r => new RelationshipModel
                    {
                        Id = r.Id,
                        Type = r.Type,
                        SubjectId = r.SubjectId,
                        RelativeId = r.RelativeId
                    }).ToList()
            })
            .FirstOrDefaultAsync();

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpGet("{id:guid}/details")]
    public async Task<ActionResult<FamilyTreeDetailModel>> GetFamilyTreeDetails(Guid id)
    {
        var result = await context.FamilyTrees
            .Where(ft => ft.Id == id)
            .Select(ft => new
            {
                ft.Id,
                ft.Name,
                ft.Description,
                ft.CreatedAt,
                ft.UpdatedAt,
                Persons = ft.Persons
                    .OrderByDescending(p => p.BirthDate)
                    .Select(p => new PersonModel
                    {
                        Id = p.Id,
                        FirstName = p.FirstName,
                        LastName = p.LastName,
                        Gender = p.Gender,
                        BirthDate = p.BirthDate,
                        DeathDate = p.DeathDate
                    }).ToList(),
                Relationships = ft.Persons
                    .SelectMany(p => p.RelationshipsAsSubject)
                    .Select(r => new RelationshipModel
                    {
                        Id = r.Id,
                        Type = r.Type,
                        SubjectId = r.SubjectId,
                        RelativeId = r.RelativeId
                    }).ToList()
            })
            .FirstOrDefaultAsync();

        if (result is null)
        {
            return NotFound();
        }

        var allYears = result.Persons
            .SelectMany(p => new[] { p.BirthDate, p.DeathDate })
            .Where(d => d != null)
            .Select(d => d!.Value.Year)
            .ToList();

        var yearRange = allYears.Count > 0
            ? new YearRangeModel { Start = allYears.Min(), End = allYears.Max() }
            : null;

        return Ok(new FamilyTreeDetailModel
        {
            Id = result.Id,
            Name = result.Name,
            Description = result.Description,
            CreatedAt = result.CreatedAt,
            UpdatedAt = result.UpdatedAt,
            PersonCount = result.Persons.Count,
            YearRange = yearRange,
            Persons = result.Persons,
            Relationships = result.Relationships
        });
    }
}
