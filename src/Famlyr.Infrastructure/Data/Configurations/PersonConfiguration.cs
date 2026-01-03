using Famlyr.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Famlyr.Infrastructure.Data.Configurations;

public class PersonConfiguration : IEntityTypeConfiguration<Person>
{
    public void Configure(EntityTypeBuilder<Person> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.FirstName)
            .HasMaxLength(100);

        builder.Property(p => p.LastName)
            .HasMaxLength(100);

        builder.Property(p => p.BirthName)
            .HasMaxLength(100);

        builder.Property(p => p.Gender)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(p => p.Notes)
            .HasMaxLength(10000);

        builder.Property(p => p.FamilyTreeId)
            .IsRequired();

        builder.HasIndex(p => p.FamilyTreeId)
            .HasDatabaseName("IX_Persons_FamilyTreeId");

        builder.HasMany(p => p.RelationshipsAsSubject)
            .WithOne(r => r.Subject)
            .HasForeignKey(r => r.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.RelationshipsAsRelative)
            .WithOne(r => r.Relative)
            .HasForeignKey(r => r.RelativeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Photos)
            .WithOne(pp => pp.Person)
            .HasForeignKey(pp => pp.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
