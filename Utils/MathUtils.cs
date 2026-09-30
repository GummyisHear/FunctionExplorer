using FunctionExplorer.Models;
using MathNet.Symbolics;
using System.Globalization;

namespace FunctionExplorer.Utils;

public static class MathUtils
{
    static readonly SymbolicExpression X = SymbolicExpression.Variable("x");

    public static double? Arvuta(SymbolicExpression e, double x)
    {
        try
        {
            var fp = e.Evaluate(new Dictionary<string, FloatingPoint> { { "x", x } });
            var c = fp.ComplexValue;
            if (Math.Abs(c.Imaginary) > 1e-12) return null;      // complex -> undefined
            var v = c.Real;
            return double.IsFinite(v) && Math.Abs(v) < 1e12 ? v : null;
        }
        catch { return null; }
    }

    public static SymbolicExpression Tuletis(SymbolicExpression f) => f.Differentiate(X);

    static string Ar(double v) => (Math.Round(v, 4) + 0.0).ToString(CultureInfo.InvariantCulture);

    static double? Poolita(Func<double, double?> f, double a, double b)
    {
        var fa = f(a); if (fa == null) return null;
        double fA = fa.Value;
        for (int i = 0; i < 60; i++)
        {
            double m = (a + b) / 2;
            var fm = f(m); if (fm == null) return null;
            if (fA * fm.Value <= 0) b = m; else { a = m; fA = fm.Value; }
        }
        double r = (a + b) / 2;
        var fr = f(r);
        return fr != null && Math.Abs(fr.Value) < 1e-6 ? r : null;   // rejects asymptotes
    }

    static List<double> Nullkohad(Func<double, double?> f, double a = -10, double b = 10, double h = 0.01)
    {
        var tulem = new List<double>();
        int n = (int)Math.Round((b - a) / h);
        double? eelY = null; double eelX = a;
        for (int i = 0; i <= n; i++)
        {
            double x = a + i * h;
            var y = f(x);
            if (y != null)
            {
                double? z = null;
                if (Math.Abs(y.Value) < 1e-9) z = x;
                else if (eelY != null && eelY.Value * y.Value < 0) z = Poolita(f, eelX, x);
                if (z != null && !tulem.Any(t => Math.Abs(t - z.Value) < 1e-3)) tulem.Add(z.Value);
            }
            eelY = y; eelX = x;
        }
        return tulem;
    }

    static string Maaramispiirkond(SymbolicExpression f)
    {
        var vahemikud = new List<(double a, double b)>();
        double? algus = null; double viimane = 0;
        for (int i = 0; i <= 2000; i++)
        {
            double x = -50 + i * 0.05;
            if (Arvuta(f, x) == null) { algus ??= x; viimane = x; }
            else if (algus != null) { vahemikud.Add((algus.Value, viimane)); algus = null; }
        }
        if (algus != null) vahemikud.Add((algus.Value, viimane));
        if (vahemikud.Count == 0) return "X: (-∞; ∞)";
        return "X: määramata (skaneeritud [-50; 50]) vahemikes: " +
               string.Join(", ", vahemikud.Select(v => $"[{Ar(v.a)}; {Ar(v.b)}]"));
    }

    public static FunktsiooniUurimine Analuusi(string valem)
    {
        var f = SymbolicExpression.Parse(valem);
        var d = Tuletis(f);
        Func<double, double?> F = x => Arvuta(f, x);
        Func<double, double?> D = x => Arvuta(d, x);

        if (Enumerable.Range(0, 200).All(i => F(-10 + i * 0.1) == null))
            throw new InvalidOperationException("Valem ei ole arvutatav muutuja x suhtes.");

        var nullid = Nullkohad(F);
        var krit = Nullkohad(D);

        var ekstr = new List<string>();
        foreach (var c in krit)
        {
            var l = D(c - 0.01); var r = D(c + 0.01); var y = F(c);
            if (l == null || r == null || y == null) continue;
            if (l > 0 && r < 0) ekstr.Add($"max: x = {Ar(c)}, y = {Ar(y.Value)}");
            else if (l < 0 && r > 0) ekstr.Add($"min: x = {Ar(c)}, y = {Ar(y.Value)}");
        }

        return new FunktsiooniUurimine
        {
            Valem = valem.Trim(),
            Maaramispiirkond = Maaramispiirkond(f),
            Tuletis = d.ToString(),
            Nullkohad = nullid.Count == 0 ? "(vahemikus [-10; 10] puuduvad)" : "x = " + string.Join("; ", nullid.Select(Ar)),
            KriitilisedPunktid = krit.Count == 0 ? "puuduvad" : string.Join("; ", krit.Select((c, i) => $"x{i + 1} = {Ar(c)}")),
            Ekstreemumid = ekstr.Count == 0 ? "puuduvad" : string.Join("; ", ekstr),
            LuodudAeg = DateTime.UtcNow
        };
    }
}