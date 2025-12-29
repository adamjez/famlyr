using Famlyr.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Famlyr.Infrastructure.Data;

public class FamlyrDbContext : DbContext
{
    public FamlyrDbContext(DbContextOptions<FamlyrDbContext> options)
        : base(options)
    {
    }

    public DbSet<FamilyTree> FamilyTrees => Set<FamilyTree>();
    public DbSet<Person> Persons => Set<Person>();
    public DbSet<Relationship> Relationships => Set<Relationship>();
    public DbSet<PersonPhoto> PersonPhotos => Set<PersonPhoto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FamlyrDbContext).Assembly);
    }
}
