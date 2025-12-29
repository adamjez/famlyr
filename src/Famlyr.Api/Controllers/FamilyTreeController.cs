using Famlyr.Api.Helpers;
using Famlyr.Api.Models;
using Famlyr.Core.Entities;
using Famlyr.Core.Enums;
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
            .Select(ft => new
            {
                ft.Id,
                ft.Name,
                ft.Description,
                ft.OwnerId,
                ft.CreatedAt,
                ft.UpdatedAt,
                Persons = ft.Persons.Select(p => new
                {
                    p.Id,
                    p.FirstName,
                    p.LastName,
                    p.Gender,
                    p.BirthYear,
                    p.BirthMonth,
                    p.BirthDay,
                    p.DeathYear,
                    p.DeathMonth,
                    p.DeathDay
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

        return Ok(new FamilyTreeModel
        {
            Id = result.Id,
            Name = result.Name,
            Description = result.Description,
            OwnerId = result.OwnerId,
            CreatedAt = result.CreatedAt,
            UpdatedAt = result.UpdatedAt,
            Persons = result.Persons.Select(p => new PersonModel
            {
                Id = p.Id,
                FirstName = p.FirstName,
                LastName = p.LastName,
                Gender = p.Gender,
                BirthDate = DateHelper.FormatDate(p.BirthYear, p.BirthMonth, p.BirthDay),
                DeathDate = DateHelper.FormatDate(p.DeathYear, p.DeathMonth, p.DeathDay)
            }).ToList(),
            Relationships = result.Relationships
        });
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
                    .OrderByDescending(p => p.BirthYear)
                    .ThenByDescending(p => p.BirthMonth)
                    .ThenByDescending(p => p.BirthDay)
                    .Select(p => new
                    {
                        p.Id,
                        p.FirstName,
                        p.LastName,
                        p.Gender,
                        p.BirthYear,
                        p.BirthMonth,
                        p.BirthDay,
                        p.DeathYear,
                        p.DeathMonth,
                        p.DeathDay
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

        var persons = result.Persons.Select(p => new PersonModel
        {
            Id = p.Id,
            FirstName = p.FirstName,
            LastName = p.LastName,
            Gender = p.Gender,
            BirthDate = DateHelper.FormatDate(p.BirthYear, p.BirthMonth, p.BirthDay),
            DeathDate = DateHelper.FormatDate(p.DeathYear, p.DeathMonth, p.DeathDay)
        }).ToList();

        var allYears = result.Persons
            .SelectMany(p => new[] { p.BirthYear, p.DeathYear })
            .Where(y => y != null)
            .Select(y => y!.Value)
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
            PersonCount = persons.Count,
            YearRange = yearRange,
            Persons = persons,
            Relationships = result.Relationships
        });
    }

    [HttpGet("{id:guid}/statistics")]
    public async Task<ActionResult<TreeStatisticsModel>> GetTreeStatistics(Guid id)
    {
        var treeData = await context.FamilyTrees
            .Where(ft => ft.Id == id)
            .Select(ft => new
            {
                TreeId = ft.Id,
                Persons = ft.Persons.Select(p => new
                {
                    p.FirstName,
                    p.LastName,
                    p.Gender,
                    p.BirthYear,
                    p.BirthMonth,
                    p.BirthDay,
                    p.DeathYear
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (treeData is null)
        {
            return NotFound();
        }

        var persons = treeData.Persons;
        var total = persons.Count;

        // Summary stats
        var withBirthDate = persons.Count(p => p.BirthYear.HasValue);
        var withDeathDate = persons.Count(p => p.DeathYear.HasValue);
        var living = persons.Count(p => p.BirthYear.HasValue && !p.DeathYear.HasValue);

        // Gender stats
        var genderGroups = persons.GroupBy(p => p.Gender).ToDictionary(g => g.Key, g => g.Count());

        // Lifespan stats
        var lifespans = persons
            .Where(p => p.BirthYear.HasValue && p.DeathYear.HasValue)
            .Select(p => p.DeathYear!.Value - p.BirthYear!.Value)
            .ToList();

        // Name stats - top 10, group nulls as "(Unknown)"
        var firstNameStats = persons
            .GroupBy(p => p.FirstName ?? "(Unknown)")
            .Select(g => new NameStatItem(g.Key, g.Count()))
            .OrderByDescending(n => n.Count)
            .ThenBy(n => n.Name)
            .Take(10)
            .ToList();

        var lastNameStats = persons
            .GroupBy(p => p.LastName ?? "(Unknown)")
            .Select(g => new NameStatItem(g.Key, g.Count()))
            .OrderByDescending(n => n.Count)
            .ThenBy(n => n.Name)
            .Take(10)
            .ToList();

        // Birth date stats - requires complete dates for weekday/day
        var fullBirthDates = persons
            .Where(p => p.BirthYear.HasValue && p.BirthMonth.HasValue && p.BirthDay.HasValue)
            .Select(p => new DateOnly(p.BirthYear!.Value, p.BirthMonth!.Value, p.BirthDay!.Value))
            .ToList();

        string[] weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        var weekdayStats = Enumerable.Range(0, 7)
            .Select(day => new WeekdayStatItem(
                day,
                weekdayLabels[day],
                fullBirthDates.Count(d => (int)d.DayOfWeek == day)))
            .ToList();

        var dayOfMonthStats = Enumerable.Range(1, 31)
            .Select(day => new DayOfMonthStatItem(day, fullBirthDates.Count(d => d.Day == day)))
            .ToList();

        string[] monthLabels = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        var monthDates = persons
            .Where(p => p.BirthYear.HasValue && p.BirthMonth.HasValue)
            .Select(p => p.BirthMonth!.Value)
            .ToList();

        var monthStats = Enumerable.Range(1, 12)
            .Select(month => new MonthStatItem(month, monthLabels[month - 1], monthDates.Count(m => m == month)))
            .ToList();

        // Decade stats
        var decadeStats = persons
            .Where(p => p.BirthYear.HasValue)
            .GroupBy(p => (p.BirthYear!.Value / 10) * 10)
            .Select(g => new DecadeStatItem(g.Key, g.Count()))
            .OrderBy(d => d.Decade)
            .ToList();

        return Ok(new TreeStatisticsModel
        {
            Summary = new SummaryStats
            {
                TotalPersons = total,
                PersonsWithBirthDate = withBirthDate,
                PersonsWithDeathDate = withDeathDate,
                LivingPersons = living
            },
            GenderStats = new GenderStats
            {
                Male = genderGroups.GetValueOrDefault(Gender.Male),
                Female = genderGroups.GetValueOrDefault(Gender.Female),
                Other = genderGroups.GetValueOrDefault(Gender.Other),
                Unknown = genderGroups.GetValueOrDefault(Gender.Unknown)
            },
            LifespanStats = new LifespanStats
            {
                AverageLifespanYears = lifespans.Count > 0 ? Math.Round(lifespans.Average(), 1) : null,
                OldestDeathAge = lifespans.Count > 0 ? lifespans.Max() : null,
                YoungestDeathAge = lifespans.Count > 0 ? lifespans.Min() : null,
                PersonsWithLifespan = lifespans.Count
            },
            FirstNameStats = firstNameStats,
            LastNameStats = lastNameStats,
            BirthWeekdayStats = weekdayStats,
            BirthDayOfMonthStats = dayOfMonthStats,
            BirthMonthStats = monthStats,
            BirthDecadeStats = decadeStats
        });
    }

    [HttpPost]
    public async Task<ActionResult<FamilyTreeDetailModel>> CreateFamilyTree([FromBody] CreateFamilyTreeRequest request)
    {
        var name = request.Name?.Trim();

        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new ErrorResponse { Code = "NAME_REQUIRED", Message = "Name is required" });

        if (name.Length > 200)
            return BadRequest(new ErrorResponse { Code = "NAME_TOO_LONG", Message = "Name must not exceed 200 characters" });

        if (request.Description?.Length > 2000)
            return BadRequest(new ErrorResponse { Code = "DESCRIPTION_TOO_LONG", Message = "Description must not exceed 2000 characters" });

        var tree = new FamilyTree
        {
            Name = name,
            Description = request.Description,
            OwnerId = Guid.Parse("00000000-0000-0000-0000-000000000001")
        };

        context.FamilyTrees.Add(tree);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFamilyTreeDetails), new { id = tree.Id }, new FamilyTreeDetailModel
        {
            Id = tree.Id,
            Name = tree.Name,
            Description = tree.Description,
            CreatedAt = tree.CreatedAt,
            UpdatedAt = tree.UpdatedAt,
            PersonCount = 0,
            YearRange = null,
            Persons = [],
            Relationships = []
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FamilyTreeDetailModel>> UpdateFamilyTree(Guid id, [FromBody] UpdateFamilyTreeRequest request)
    {
        var name = request.Name?.Trim();

        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new ErrorResponse { Code = "NAME_REQUIRED", Message = "Name is required" });

        if (name.Length > 200)
            return BadRequest(new ErrorResponse { Code = "NAME_TOO_LONG", Message = "Name must not exceed 200 characters" });

        if (request.Description?.Length > 2000)
            return BadRequest(new ErrorResponse { Code = "DESCRIPTION_TOO_LONG", Message = "Description must not exceed 2000 characters" });

        var tree = await context.FamilyTrees.FindAsync(id);
        if (tree is null)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        tree.Name = name;
        tree.Description = request.Description;
        tree.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return await GetFamilyTreeDetails(id);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteFamilyTree(Guid id)
    {
        var tree = await context.FamilyTrees.FindAsync(id);
        if (tree is null)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        context.FamilyTrees.Remove(tree);
        await context.SaveChangesAsync();

        return NoContent();
    }
}
