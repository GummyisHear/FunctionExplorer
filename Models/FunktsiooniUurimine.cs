namespace FunctionExplorer.Models;

public class FunktsiooniUurimine
{
    public int Id { get; set; }
    public string Valem { get; set; } = string.Empty;
    public string Maaramispiirkond { get; set; } = string.Empty;
    public string Nullkohad { get; set; } = string.Empty;
    public string Tuletis { get; set; } = string.Empty;
    public string KriitilisedPunktid { get; set; } = string.Empty;
    public string Ekstreemumid { get; set; } = string.Empty;
    public DateTime LuodudAeg { get; set; } = DateTime.UtcNow;
}