using Famlyr.Api.Helpers;
using Famlyr.Api.Models;
using Famlyr.Api.Services;
using Famlyr.Core.Entities;
using Famlyr.Core.Enums;
using Famlyr.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Famlyr.Api.Controllers;

[ApiController]
[Route("api/trees/{treeId:guid}/persons")]
public class PersonController(FamlyrDbContext context, PhotoValidationService photoService) : ControllerBase
{
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<PersonDetailModel>> CreatePerson(
        Guid treeId,
        [FromForm] CreatePersonRequest request)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        if (request.FirstName?.Length > 100)
            return BadRequest(new ErrorResponse { Code = "FIRST_NAME_TOO_LONG", Message = "firstName exceeds 100 characters" });
        if (request.LastName?.Length > 100)
            return BadRequest(new ErrorResponse { Code = "LAST_NAME_TOO_LONG", Message = "lastName exceeds 100 characters" });
        if (request.Notes?.Length > 10000)
            return BadRequest(new ErrorResponse { Code = "NOTES_TOO_LONG", Message = "notes exceeds 10,000 characters" });

        var gender = Gender.Unknown;
        if (!string.IsNullOrEmpty(request.Gender) && !Enum.TryParse(request.Gender, true, out gender))
            return BadRequest(new ErrorResponse { Code = "INVALID_GENDER", Message = "gender is not a valid enum value" });

        int? birthYear, birthMonth, birthDay, deathYear, deathMonth, deathDay;
        try
        {
            (birthYear, birthMonth, birthDay) = DateHelper.ParseDate(request.BirthDate);
            (deathYear, deathMonth, deathDay) = DateHelper.ParseDate(request.DeathDate);
        }
        catch (FormatException)
        {
            return BadRequest(new ErrorResponse { Code = "INVALID_DATE_FORMAT", Message = "birthDate or deathDate is not valid (use YYYY or YYYY-MM-DD)" });
        }

        if (!DateHelper.IsValidDeathAfterBirth(birthYear, deathYear))
            return BadRequest(new ErrorResponse { Code = "DEATH_BEFORE_BIRTH", Message = "deathDate year is before birthDate year" });

        var photoCount = request.Photos?.Count ?? 0;
        if (photoCount > 20)
            return BadRequest(new ErrorResponse { Code = "TOO_MANY_PHOTOS", Message = "More than 20 photos provided" });

        var validatedPhotos = new List<(byte[] Data, string MimeType)>();
        if (request.Photos != null)
        {
            foreach (var photo in request.Photos)
            {
                var result = await photoService.Validate(photo);
                if (!result.IsValid)
                    return BadRequest(new ErrorResponse { Code = result.ErrorCode!, Message = result.ErrorMessage! });
                validatedPhotos.Add((result.ImageData!, result.MimeType!));
            }
        }

        var person = new Person
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Gender = gender,
            BirthYear = birthYear,
            BirthMonth = birthMonth,
            BirthDay = birthDay,
            DeathYear = deathYear,
            DeathMonth = deathMonth,
            DeathDay = deathDay,
            Notes = request.Notes,
            FamilyTreeId = treeId
        };

        for (var i = 0; i < validatedPhotos.Count; i++)
        {
            person.Photos.Add(new PersonPhoto
            {
                PersonId = person.Id,
                ImageData = validatedPhotos[i].Data,
                IsPrimary = i == 0,
                Order = i
            });
        }

        context.Persons.Add(person);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPerson), new { treeId, personId = person.Id }, MapToDetailModel(person));
    }

    [HttpPut("{personId:guid}")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<PersonDetailModel>> UpdatePerson(
        Guid treeId,
        Guid personId,
        [FromForm] UpdatePersonRequest request)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var person = await context.Persons
            .Include(p => p.Photos.OrderBy(ph => ph.Order))
            .FirstOrDefaultAsync(p => p.Id == personId && p.FamilyTreeId == treeId);

        if (person is null)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        if (request.FirstName?.Length > 100)
            return BadRequest(new ErrorResponse { Code = "FIRST_NAME_TOO_LONG", Message = "firstName exceeds 100 characters" });
        if (request.LastName?.Length > 100)
            return BadRequest(new ErrorResponse { Code = "LAST_NAME_TOO_LONG", Message = "lastName exceeds 100 characters" });
        if (request.Notes?.Length > 10000)
            return BadRequest(new ErrorResponse { Code = "NOTES_TOO_LONG", Message = "notes exceeds 10,000 characters" });

        // Update fields if provided (empty string clears, null leaves unchanged)
        if (request.FirstName != null)
            person.FirstName = string.IsNullOrEmpty(request.FirstName) ? null : request.FirstName;
        if (request.LastName != null)
            person.LastName = string.IsNullOrEmpty(request.LastName) ? null : request.LastName;
        if (request.Notes != null)
            person.Notes = string.IsNullOrEmpty(request.Notes) ? null : request.Notes;

        if (!string.IsNullOrEmpty(request.Gender))
        {
            if (!Enum.TryParse<Gender>(request.Gender, true, out var gender))
                return BadRequest(new ErrorResponse { Code = "INVALID_GENDER", Message = "gender is not a valid enum value" });
            person.Gender = gender;
        }

        if (request.BirthDate != null)
        {
            try
            {
                var (year, month, day) = DateHelper.ParseDate(request.BirthDate);
                person.BirthYear = year;
                person.BirthMonth = month;
                person.BirthDay = day;
            }
            catch (FormatException)
            {
                return BadRequest(new ErrorResponse { Code = "INVALID_DATE_FORMAT", Message = "birthDate is not valid (use YYYY or YYYY-MM-DD)" });
            }
        }

        if (request.DeathDate != null)
        {
            try
            {
                var (year, month, day) = DateHelper.ParseDate(request.DeathDate);
                person.DeathYear = year;
                person.DeathMonth = month;
                person.DeathDay = day;
            }
            catch (FormatException)
            {
                return BadRequest(new ErrorResponse { Code = "INVALID_DATE_FORMAT", Message = "deathDate is not valid (use YYYY or YYYY-MM-DD)" });
            }
        }

        if (!DateHelper.IsValidDeathAfterBirth(person.BirthYear, person.DeathYear))
            return BadRequest(new ErrorResponse { Code = "DEATH_BEFORE_BIRTH", Message = "deathDate year is before birthDate year" });

        // Handle new photos
        var newPhotoCount = request.Photos?.Count ?? 0;
        var totalPhotos = person.Photos.Count + newPhotoCount;
        if (totalPhotos > 20)
            return BadRequest(new ErrorResponse { Code = "PHOTO_LIMIT_EXCEEDED", Message = "Adding photos would exceed 20 total" });

        if (request.Photos != null)
        {
            var maxOrder = person.Photos.Count > 0 ? person.Photos.Max(p => p.Order) : -1;
            var hasPrimary = person.Photos.Count > 0 && person.Photos.Any(p => p.IsPrimary);

            foreach (var photo in request.Photos)
            {
                var result = await photoService.Validate(photo);
                if (!result.IsValid)
                    return BadRequest(new ErrorResponse { Code = result.ErrorCode!, Message = result.ErrorMessage! });

                maxOrder++;
                person.Photos.Add(new PersonPhoto
                {
                    PersonId = person.Id,
                    ImageData = result.ImageData!,
                    IsPrimary = !hasPrimary && maxOrder == 0,
                    Order = maxOrder
                });
                hasPrimary = true;
            }
        }

        await context.SaveChangesAsync();
        return Ok(MapToDetailModel(person));
    }

    [HttpDelete("{personId:guid}")]
    public async Task<IActionResult> DeletePerson(Guid treeId, Guid personId)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var person = await context.Persons.FirstOrDefaultAsync(p => p.Id == personId && p.FamilyTreeId == treeId);
        if (person is null)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        context.Persons.Remove(person);
        await context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{personId:guid}")]
    public async Task<ActionResult<PersonDetailModel>> GetPerson(Guid treeId, Guid personId)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var person = await context.Persons
            .Include(p => p.Photos.OrderBy(ph => ph.Order))
            .FirstOrDefaultAsync(p => p.Id == personId && p.FamilyTreeId == treeId);

        if (person is null)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        return Ok(MapToDetailModel(person));
    }

    [HttpDelete("{personId:guid}/photos/{photoId:guid}")]
    public async Task<IActionResult> DeletePhoto(Guid treeId, Guid personId, Guid photoId)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var person = await context.Persons
            .Include(p => p.Photos)
            .FirstOrDefaultAsync(p => p.Id == personId && p.FamilyTreeId == treeId);

        if (person is null)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        var photo = person.Photos.FirstOrDefault(p => p.Id == photoId);
        if (photo is null)
            return NotFound(new ErrorResponse { Code = "PHOTO_NOT_FOUND", Message = "Photo not found" });

        var wasPrimary = photo.IsPrimary;
        person.Photos.Remove(photo);

        // If deleted photo was primary, set next photo (lowest order) as primary
        if (wasPrimary && person.Photos.Count > 0)
        {
            var nextPhoto = person.Photos.OrderBy(p => p.Order).First();
            nextPhoto.IsPrimary = true;
        }

        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{personId:guid}/photos/{photoId:guid}/primary")]
    public async Task<ActionResult<PersonPhotoModel>> SetPrimaryPhoto(Guid treeId, Guid personId, Guid photoId)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var person = await context.Persons
            .Include(p => p.Photos)
            .FirstOrDefaultAsync(p => p.Id == personId && p.FamilyTreeId == treeId);

        if (person is null)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        var photo = person.Photos.FirstOrDefault(p => p.Id == photoId);
        if (photo is null)
            return NotFound(new ErrorResponse { Code = "PHOTO_NOT_FOUND", Message = "Photo not found" });

        // Clear existing primary
        foreach (var p in person.Photos)
            p.IsPrimary = false;

        photo.IsPrimary = true;
        await context.SaveChangesAsync();

        return Ok(MapToPhotoModel(photo));
    }

    [HttpPut("{personId:guid}/photos/reorder")]
    public async Task<ActionResult<PhotoReorderResponse>> ReorderPhotos(
        Guid treeId,
        Guid personId,
        [FromBody] ReorderPhotosRequest request)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var person = await context.Persons
            .Include(p => p.Photos)
            .FirstOrDefaultAsync(p => p.Id == personId && p.FamilyTreeId == treeId);

        if (person is null)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        var photoIds = person.Photos.Select(p => p.Id).ToHashSet();
        var requestIds = request.PhotoIds.ToHashSet();

        if (!photoIds.SetEquals(requestIds))
            return BadRequest(new ErrorResponse { Code = "INVALID_PHOTO_IDS", Message = "Photo IDs don't match person's photos" });

        for (var i = 0; i < request.PhotoIds.Count; i++)
        {
            var photo = person.Photos.First(p => p.Id == request.PhotoIds[i]);
            photo.Order = i;
        }

        await context.SaveChangesAsync();

        var photos = person.Photos.OrderBy(p => p.Order).Select(MapToPhotoModel).ToList();
        return Ok(new PhotoReorderResponse { Photos = photos });
    }

    [HttpGet("search")]
    public async Task<ActionResult<PersonSearchResponse>> SearchPersons(
        Guid treeId,
        [FromQuery] string q,
        [FromQuery] Guid? excludePersonId,
        [FromQuery] int limit = 10)
    {
        if (string.IsNullOrEmpty(q) || q.Length < 2)
            return BadRequest(new ErrorResponse { Code = "QUERY_TOO_SHORT", Message = "Search query must be at least 2 characters" });

        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        limit = Math.Clamp(limit, 1, 50);

        var query = context.Persons
            .Where(p => p.FamilyTreeId == treeId)
            .Where(p => (p.FirstName != null && p.FirstName.Contains(q)) ||
                        (p.LastName != null && p.LastName.Contains(q)));

        if (excludePersonId.HasValue)
            query = query.Where(p => p.Id != excludePersonId.Value);

        var results = await query
            .Take(limit)
            .Select(p => new PersonSearchResultModel
            {
                Id = p.Id,
                FirstName = p.FirstName,
                LastName = p.LastName,
                Gender = p.Gender.ToString(),
                BirthDate = DateHelper.FormatDate(p.BirthYear, p.BirthMonth, p.BirthDay),
                DeathDate = DateHelper.FormatDate(p.DeathYear, p.DeathMonth, p.DeathDay)
            })
            .ToListAsync();

        return Ok(new PersonSearchResponse { Persons = results });
    }

    [HttpPost("{personId:guid}/relationships")]
    public async Task<ActionResult<RelationshipCreatedModel>> AddRelationship(
        Guid treeId,
        Guid personId,
        [FromBody] AddRelationshipRequest request)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var person = await context.Persons
            .Include(p => p.RelationshipsAsSubject)
            .FirstOrDefaultAsync(p => p.Id == personId && p.FamilyTreeId == treeId);

        if (person is null)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        var relatedPerson = await context.Persons
            .FirstOrDefaultAsync(p => p.Id == request.RelatedPersonId && p.FamilyTreeId == treeId);

        if (relatedPerson is null)
            return NotFound(new ErrorResponse { Code = "RELATED_PERSON_NOT_FOUND", Message = "Related person not found" });

        if (personId == request.RelatedPersonId)
            return BadRequest(new ErrorResponse { Code = "SELF_RELATIONSHIP", Message = "Cannot create relationship with self" });

        if (!Enum.TryParse<RelationshipType>(request.Type, true, out var relType) ||
            (request.Type.Equals("Child", StringComparison.OrdinalIgnoreCase) == false &&
             relType != RelationshipType.Parent && relType != RelationshipType.Spouse))
        {
            // Handle Child as a special case
            if (!request.Type.Equals("Child", StringComparison.OrdinalIgnoreCase) &&
                !request.Type.Equals("Parent", StringComparison.OrdinalIgnoreCase) &&
                !request.Type.Equals("Spouse", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new ErrorResponse { Code = "INVALID_RELATIONSHIP_TYPE", Message = "Type must be Parent, Child, or Spouse" });
            }
        }

        Guid subjectId, relativeId;
        var storedType = RelationshipType.Parent;

        if (request.Type.Equals("Child", StringComparison.OrdinalIgnoreCase))
        {
            // personId is parent of relatedPersonId - create inverse relationship
            subjectId = request.RelatedPersonId;
            relativeId = personId;
            storedType = RelationshipType.Parent;
        }
        else if (request.Type.Equals("Parent", StringComparison.OrdinalIgnoreCase))
        {
            subjectId = personId;
            relativeId = request.RelatedPersonId;
            storedType = RelationshipType.Parent;
        }
        else // Spouse
        {
            subjectId = personId;
            relativeId = request.RelatedPersonId;
            storedType = RelationshipType.Spouse;
        }

        // Check for duplicate relationship
        var existingRelationship = await context.Relationships
            .AnyAsync(r => r.Type == storedType && r.SubjectId == subjectId && r.RelativeId == relativeId);

        if (existingRelationship)
            return BadRequest(new ErrorResponse { Code = "RELATIONSHIP_EXISTS", Message = "This relationship already exists" });

        // Check max 2 parents
        if (storedType == RelationshipType.Parent)
        {
            var parentCount = await context.Relationships
                .CountAsync(r => r.Type == RelationshipType.Parent && r.SubjectId == subjectId);

            if (parentCount >= 2)
                return BadRequest(new ErrorResponse { Code = "MAX_PARENTS_EXCEEDED", Message = "Person already has 2 parents" });
        }

        var relationship = new Relationship
        {
            Type = storedType,
            SubjectId = subjectId,
            RelativeId = relativeId
        };

        context.Relationships.Add(relationship);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRelationships), new { treeId, personId }, new RelationshipCreatedModel
        {
            Id = relationship.Id,
            Type = storedType.ToString(),
            SubjectId = subjectId,
            RelativeId = relativeId
        });
    }

    [HttpDelete("{personId:guid}/relationships/{relationshipId:guid}")]
    public async Task<IActionResult> RemoveRelationship(Guid treeId, Guid personId, Guid relationshipId)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var personExists = await context.Persons.AnyAsync(p => p.Id == personId && p.FamilyTreeId == treeId);
        if (!personExists)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        var relationship = await context.Relationships
            .FirstOrDefaultAsync(r => r.Id == relationshipId &&
                                      (r.SubjectId == personId || r.RelativeId == personId));

        if (relationship is null)
            return NotFound(new ErrorResponse { Code = "RELATIONSHIP_NOT_FOUND", Message = "Relationship not found" });

        context.Relationships.Remove(relationship);
        await context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{personId:guid}/relationships")]
    public async Task<ActionResult<PersonRelationshipsResponse>> GetRelationships(Guid treeId, Guid personId)
    {
        var treeExists = await context.FamilyTrees.AnyAsync(t => t.Id == treeId);
        if (!treeExists)
            return NotFound(new ErrorResponse { Code = "TREE_NOT_FOUND", Message = "Family tree not found" });

        var personExists = await context.Persons.AnyAsync(p => p.Id == personId && p.FamilyTreeId == treeId);
        if (!personExists)
            return NotFound(new ErrorResponse { Code = "PERSON_NOT_FOUND", Message = "Person not found" });

        // Parents: relationships where personId is subject and type is Parent
        var parentRelationships = await context.Relationships
            .Where(r => r.SubjectId == personId && r.Type == RelationshipType.Parent)
            .Select(r => new { r.Id, Person = r.Relative })
            .ToListAsync();

        // Children: relationships where personId is relative and type is Parent
        var childRelationships = await context.Relationships
            .Where(r => r.RelativeId == personId && r.Type == RelationshipType.Parent)
            .Select(r => new { r.Id, Person = r.Subject })
            .ToListAsync();

        // Spouses: relationships where personId is subject or relative and type is Spouse
        var spouseRelationships = await context.Relationships
            .Where(r => (r.SubjectId == personId || r.RelativeId == personId) && r.Type == RelationshipType.Spouse)
            .Select(r => new
            {
                r.Id,
                Person = r.SubjectId == personId ? r.Relative : r.Subject
            })
            .ToListAsync();

        return Ok(new PersonRelationshipsResponse
        {
            Parents = parentRelationships.Select(r => new PersonRelationshipModel
            {
                RelationshipId = r.Id,
                Person = new RelatedPersonModel
                {
                    Id = r.Person!.Id,
                    FirstName = r.Person.FirstName,
                    LastName = r.Person.LastName,
                    Gender = r.Person.Gender.ToString()
                }
            }).ToList(),
            Children = childRelationships.Select(r => new PersonRelationshipModel
            {
                RelationshipId = r.Id,
                Person = new RelatedPersonModel
                {
                    Id = r.Person!.Id,
                    FirstName = r.Person.FirstName,
                    LastName = r.Person.LastName,
                    Gender = r.Person.Gender.ToString()
                }
            }).ToList(),
            Spouses = spouseRelationships.Select(r => new PersonRelationshipModel
            {
                RelationshipId = r.Id,
                Person = new RelatedPersonModel
                {
                    Id = r.Person!.Id,
                    FirstName = r.Person.FirstName,
                    LastName = r.Person.LastName,
                    Gender = r.Person.Gender.ToString()
                }
            }).ToList()
        });
    }

    private static PersonDetailModel MapToDetailModel(Person person)
    {
        return new PersonDetailModel
        {
            Id = person.Id,
            FirstName = person.FirstName,
            LastName = person.LastName,
            Gender = person.Gender.ToString(),
            BirthDate = DateHelper.FormatDate(person.BirthYear, person.BirthMonth, person.BirthDay),
            DeathDate = DateHelper.FormatDate(person.DeathYear, person.DeathMonth, person.DeathDay),
            Notes = person.Notes,
            Photos = person.Photos.OrderBy(p => p.Order).Select(MapToPhotoModel).ToList()
        };
    }

    private static PersonPhotoModel MapToPhotoModel(PersonPhoto photo)
    {
        var base64 = Convert.ToBase64String(photo.ImageData);
        var mimeType = DetectMimeType(photo.ImageData);
        return new PersonPhotoModel
        {
            Id = photo.Id,
            IsPrimary = photo.IsPrimary,
            CreatedAt = photo.CreatedAt,
            Order = photo.Order,
            ImageUrl = $"data:{mimeType};base64,{base64}"
        };
    }

    private static string DetectMimeType(byte[] data)
    {
        if (data.Length < 12) return "application/octet-stream";

        if (data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
            return "image/jpeg";

        if (data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47)
            return "image/png";

        if (data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46 &&
            data.Length > 11 && data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50)
            return "image/webp";

        return "application/octet-stream";
    }
}
