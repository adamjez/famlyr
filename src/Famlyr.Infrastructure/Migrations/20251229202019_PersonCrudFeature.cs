using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Famlyr.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PersonCrudFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Add new columns first
            migrationBuilder.AddColumn<int>(
                name: "BirthDay",
                table: "Persons",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BirthMonth",
                table: "Persons",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BirthYear",
                table: "Persons",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeathDay",
                table: "Persons",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeathMonth",
                table: "Persons",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeathYear",
                table: "Persons",
                type: "integer",
                nullable: true);

            // Step 2: Transform existing DateOnly data to new columns
            migrationBuilder.Sql(@"
                UPDATE ""Persons"" SET
                    ""BirthYear"" = EXTRACT(YEAR FROM ""BirthDate"")::integer,
                    ""BirthMonth"" = EXTRACT(MONTH FROM ""BirthDate"")::integer,
                    ""BirthDay"" = EXTRACT(DAY FROM ""BirthDate"")::integer
                WHERE ""BirthDate"" IS NOT NULL;

                UPDATE ""Persons"" SET
                    ""DeathYear"" = EXTRACT(YEAR FROM ""DeathDate"")::integer,
                    ""DeathMonth"" = EXTRACT(MONTH FROM ""DeathDate"")::integer,
                    ""DeathDay"" = EXTRACT(DAY FROM ""DeathDate"")::integer
                WHERE ""DeathDate"" IS NOT NULL;
            ");

            // Step 3: Drop old columns
            migrationBuilder.DropColumn(
                name: "BirthDate",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "DeathDate",
                table: "Persons");

            migrationBuilder.CreateTable(
                name: "PersonPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImageData = table.Column<byte[]>(type: "bytea", nullable: false),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PersonPhotos_Persons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PersonPhotos_PersonId",
                table: "PersonPhotos",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonPhotos_PersonId_IsPrimary",
                table: "PersonPhotos",
                columns: new[] { "PersonId", "IsPrimary" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PersonPhotos");

            migrationBuilder.DropColumn(
                name: "BirthDay",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "BirthMonth",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "BirthYear",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "DeathDay",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "DeathMonth",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "DeathYear",
                table: "Persons");

            migrationBuilder.AddColumn<DateOnly>(
                name: "BirthDate",
                table: "Persons",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DeathDate",
                table: "Persons",
                type: "date",
                nullable: true);
        }
    }
}
