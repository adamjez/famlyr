using Famlyr.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Famlyr.Infrastructure.Data.Configurations;

public class PersonPhotoConfiguration : IEntityTypeConfiguration<PersonPhoto>
{
    public void Configure(EntityTypeBuilder<PersonPhoto> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.ImageData)
            .IsRequired();

        builder.Property(p => p.IsPrimary)
            .HasDefaultValue(false);

        builder.Property(p => p.CreatedAt)
            .IsRequired();

        builder.Property(p => p.Order)
            .IsRequired();

        builder.HasIndex(p => p.PersonId)
            .HasDatabaseName("IX_PersonPhotos_PersonId");

        builder.HasIndex(p => new { p.PersonId, p.IsPrimary })
            .HasDatabaseName("IX_PersonPhotos_PersonId_IsPrimary");
    }
}
