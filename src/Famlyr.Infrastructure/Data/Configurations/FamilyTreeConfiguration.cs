using Famlyr.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Famlyr.Infrastructure.Data.Configurations;

public class FamilyTreeConfiguration : IEntityTypeConfiguration<FamilyTree>
{
    public void Configure(EntityTypeBuilder<FamilyTree> builder)
    {
        builder.HasKey(ft => ft.Id);

        builder.Property(ft => ft.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(ft => ft.Description)
            .HasMaxLength(2000);

        builder.Property(ft => ft.OwnerId)
            .IsRequired();

        builder.Property(ft => ft.CreatedAt)
            .IsRequired();

        builder.Property(ft => ft.UpdatedAt)
            .IsRequired();

        builder.HasMany(ft => ft.Persons)
            .WithOne(p => p.FamilyTree)
            .HasForeignKey(p => p.FamilyTreeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
