using FunctionExplorer.Models;
using Microsoft.EntityFrameworkCore;

namespace FunctionExplorer.Data;

public class AndmeKontekst : DbContext
{
    public AndmeKontekst(DbContextOptions<AndmeKontekst> valikud) : base(valikud) { }

    public DbSet<FunktsiooniUurimine> FunktsiooniUurimised => Set<FunktsiooniUurimine>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        var aeg = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        mb.Entity<FunktsiooniUurimine>().HasData(
            new FunktsiooniUurimine
            {
                Id = 1,
                Valem = "x^3 - 3*x",
                Maaramispiirkond = "X: (-∞; ∞)",
                Tuletis = "3*x^2 - 3",
                Nullkohad = "x = -1.7321; 0; 1.7321",
                KriitilisedPunktid = "x1 = -1; x2 = 1",
                Ekstreemumid = "max: x = -1, y = 2; min: x = 1, y = -2",
                LuodudAeg = aeg
            },
            new FunktsiooniUurimine
            {
                Id = 2,
                Valem = "x^2 - 4*x + 3",
                Maaramispiirkond = "X: (-∞; ∞)",
                Tuletis = "2*x - 4",
                Nullkohad = "x = 1; 3",
                KriitilisedPunktid = "x1 = 2",
                Ekstreemumid = "min: x = 2, y = -1",
                LuodudAeg = aeg
            },
            new FunktsiooniUurimine
            {
                Id = 3,
                Valem = "x^3 - 12*x",
                Maaramispiirkond = "X: (-∞; ∞)",
                Tuletis = "3*x^2 - 12",
                Nullkohad = "x = -3.4641; 0; 3.4641",
                KriitilisedPunktid = "x1 = -2; x2 = 2",
                Ekstreemumid = "max: x = -2, y = 16; min: x = 2, y = -16",
                LuodudAeg = aeg
            });
    }
}