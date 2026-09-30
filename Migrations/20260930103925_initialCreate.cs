using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FunctionExplorer.Migrations
{
    /// <inheritdoc />
    public partial class initialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FunktsiooniUurimised",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Valem = table.Column<string>(type: "TEXT", nullable: false),
                    Maaramispiirkond = table.Column<string>(type: "TEXT", nullable: false),
                    Nullkohad = table.Column<string>(type: "TEXT", nullable: false),
                    Tuletis = table.Column<string>(type: "TEXT", nullable: false),
                    KriitilisedPunktid = table.Column<string>(type: "TEXT", nullable: false),
                    Ekstreemumid = table.Column<string>(type: "TEXT", nullable: false),
                    LuodudAeg = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FunktsiooniUurimised", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "FunktsiooniUurimised",
                columns: new[] { "Id", "Ekstreemumid", "KriitilisedPunktid", "LuodudAeg", "Maaramispiirkond", "Nullkohad", "Tuletis", "Valem" },
                values: new object[,]
                {
                    { 1, "max: x = -1, y = 2; min: x = 1, y = -2", "x1 = -1; x2 = 1", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "X: (-∞; ∞)", "x = -1.7321; 0; 1.7321", "3*x^2 - 3", "x^3 - 3*x" },
                    { 2, "min: x = 2, y = -1", "x1 = 2", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "X: (-∞; ∞)", "x = 1; 3", "2*x - 4", "x^2 - 4*x + 3" },
                    { 3, "max: x = -2, y = 16; min: x = 2, y = -16", "x1 = -2; x2 = 2", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "X: (-∞; ∞)", "x = -3.4641; 0; 3.4641", "3*x^2 - 12", "x^3 - 12*x" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FunktsiooniUurimised");
        }
    }
}
