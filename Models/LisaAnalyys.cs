namespace FunctionExplorer.Models;

public class LahendusSamm
{
    public string Pealkiri { get; set; } = string.Empty;
    public string Selgitus { get; set; } = string.Empty;
    public List<string> Read { get; set; } = new();
    public string Tulemus { get; set; } = string.Empty;
}

public class LisaAnalyys
{
    public string Tuletis { get; set; } = string.Empty;
    public string TeineTuletis { get; set; } = string.Empty;
    public string Kaanupunktid { get; set; } = string.Empty;
    public List<string> Kasvamine { get; set; } = new();
    public List<string> Kumerus { get; set; } = new();
    public List<string> KasvamineLuhike { get; set; } = new();
    public List<string> KumerusLuhike { get; set; } = new();
    public List<LahendusSamm> Sammud { get; set; } = new();
}

public class DetailideVaade
{
    public FunktsiooniUurimine Uurimine { get; set; } = null!;
    public LisaAnalyys? Lisa { get; set; }
}
