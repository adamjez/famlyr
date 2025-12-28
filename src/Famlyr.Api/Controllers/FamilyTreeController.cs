using Famlyr.Api.Models;
using Famlyr.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Famlyr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FamilyTreeController(FamlyrDbContext context) : ControllerBase
{
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
}
