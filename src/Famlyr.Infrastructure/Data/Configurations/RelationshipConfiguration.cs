using Famlyr.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Famlyr.Infrastructure.Data.Configurations;

public class RelationshipConfiguration : IEntityTypeConfiguration<Relationship>
{
    public void Configure(EntityTypeBuilder<Relationship> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Type)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(r => r.SubjectId)
            .IsRequired();

        builder.Property(r => r.RelativeId)
            .IsRequired();

        builder.HasIndex(r => r.SubjectId)
            .HasDatabaseName("IX_Relationships_SubjectId");

        builder.HasIndex(r => r.RelativeId)
            .HasDatabaseName("IX_Relationships_RelativeId");
    }
}
