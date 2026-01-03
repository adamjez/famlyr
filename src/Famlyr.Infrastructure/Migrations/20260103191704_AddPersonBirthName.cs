using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Famlyr.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonBirthName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BirthName",
                table: "Persons",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BirthName",
                table: "Persons");
        }
    }
}
