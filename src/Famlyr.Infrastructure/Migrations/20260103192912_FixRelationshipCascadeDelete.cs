using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Famlyr.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixRelationshipCascadeDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Relationships_Persons_RelativeId",
                table: "Relationships");

            migrationBuilder.AddForeignKey(
                name: "FK_Relationships_Persons_RelativeId",
                table: "Relationships",
                column: "RelativeId",
                principalTable: "Persons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Relationships_Persons_RelativeId",
                table: "Relationships");

            migrationBuilder.AddForeignKey(
                name: "FK_Relationships_Persons_RelativeId",
                table: "Relationships",
                column: "RelativeId",
                principalTable: "Persons",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
