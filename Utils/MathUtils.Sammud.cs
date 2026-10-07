using FunctionExplorer.Models;
using MathNet.Symbolics;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace FunctionExplorer.Utils;

// NB: MathUtils.cs peab olema deklareeritud kui "public static partial class MathUtils"
public static partial class MathUtils
{
    static string Z(double? v) => v == null ? "–" : Ar(v.Value);

    // Märgib valemi (⟦...⟧), brauser teisendab selle ilusaks LaTeX-iks (wwwroot/js/valem-latex.js)
    static string Lt(SymbolicExpression e) => "⟦" + e.ToString() + "⟧";

    // ---------- Valemite lihtsustamine ----------
    static readonly ConcurrentDictionary<string, SymbolicExpression> _lihtsustused = new();

    /// Lihtsustab ratsionaalavaldise (ühine nimetaja, taandamine, nimetaja teguriteks).
    /// Tulemus võetakse kasutusele ainult siis, kui see on arvuliselt sama ja lühem; muidu tagastatakse algne.
    public static SymbolicExpression Lihtsusta(SymbolicExpression e)
    {
        if (_lihtsustused.Count > 500) _lihtsustused.Clear();
        return _lihtsustused.GetOrAdd(e.ToString(), _ => LihtsustaTegelikult(e));
    }

    // StackOverflowException'it ei saa .NET-is püüda, see kukutab kogu rakenduse.
    // Math.NET-i RationalSimplify/FactorSquareFree sobivad ainult polünoomidele ja nende murdudele,
    // seega kontrollime ENNE kutsumist, et avaldis on x-i ratsionaalfunktsioon:
    // ainult täisarvud, muutuja x, tehted + - * / ning täisarvulised astmed.
    // Funktsioonid (exp, sin, ln, sqrt, ...), konstandid (e, pi), murdastmed ja x^x lükatakse tagasi.
    static bool OnRatsionaalne(string s)
    {
        if (s.Length > 400) return false;
        // eemalda lubatud täisarvulised astendajad: ^2, ^-3, ^(2), ^(-3)
        var ilmaAstmeteta = Regex.Replace(s, @"\^\s*(\(\s*-?\d+\s*\)|-?\d+)(?![\d.])", "");
        if (ilmaAstmeteta.Contains('^')) return false;           // jäi mõni muu astendaja (x^x, x^(1/2), x^2.5)
        return Regex.IsMatch(ilmaAstmeteta, @"^[0-9x+\-*/()\s]*$"); // ei mingeid muid tähti ega komakohti
    }

    static SymbolicExpression LihtsustaTegelikult(SymbolicExpression e)
    {
        if (!OnRatsionaalne(e.ToString())) return e;
        try
        {
            // kaitse: väga keerulise avaldise korral ei jää leht kauaks ootama
            var ulesanne = Task.Run(() =>
            {
                var s = e.RationalSimplify(X);
                try
                {
                    var lugeja = s.Numerator().FactorSquareFree(X);
                    var nimetaja = s.Denominator().FactorSquareFree(X);
                    return lugeja / nimetaja;
                }
                catch { return s; }   // teguriteks jagamine ebaõnnestus: jäta lihtsalt taandatud kuju
            });
            if (!ulesanne.Wait(TimeSpan.FromSeconds(2))) return e;

            var tulem = ulesanne.Result;
            bool luhem = tulem.ToString().Length < e.ToString().Length;
            return luhem && Vordsed(e, tulem) ? tulem : e;
        }
        catch { return e; }
    }

    // Kontrollib, et kaks avaldist annavad (ühiselt määratud punktides) samad väärtused
    static bool Vordsed(SymbolicExpression a, SymbolicExpression b)
    {
        int vorreldud = 0;
        for (int i = 0; i < 60; i++)
        {
            double x = -9.73 + i * 0.3217;   // "ebakorrapärased" punktid, väldivad täisarvulisi erijuhte
            var va = Arvuta(a, x); var vb = Arvuta(b, x);
            if (va == null || vb == null) continue;
            double lubatud = 1e-6 * Math.Max(1, Math.Max(Math.Abs(va.Value), Math.Abs(vb.Value)));
            if (Math.Abs(va.Value - vb.Value) > lubatud) return false;
            vorreldud++;
        }
        return vorreldud >= 5;
    }

    // Jagab arvtelje punktidega vahemikeks ja kontrollib g märki igas vahemikus (testpunktis)
    static List<(string Luhike, string Pikk)> Vahemikud(List<double> piirid, Func<double, double?> g,
                                  string nimi, string pos, string neg)
    {
        var p = piirid.OrderBy(x => x).ToList();
        var tulem = new List<(string Luhike, string Pikk)>();
        for (int i = 0; i <= p.Count; i++)
        {
            string a = i == 0 ? "-∞" : Ar(p[i - 1]);
            string b = i == p.Count ? "∞" : Ar(p[i]);
            double t = p.Count == 0 ? 0 : i == 0 ? p[0] - 1 : i == p.Count ? p[^1] + 1 : (p[i - 1] + p[i]) / 2;
            var v = g(t);
            string m = v == null ? "ei saa määrata (funktsioon pole siin määratud)"
                     : v > 0 ? pos : v < 0 ? neg : "märk 0";
            tulem.Add(($"({a}; {b}): {m}", $"({a}; {b}): testpunkt x = {Ar(t)}, {nimi}({Ar(t)}) = {Z(v)} → {m}"));
        }
        return tulem;
    }

    // "Kontroll punktis x = 1,5: algne = lihtsustatud"
    static string Kontroll(string nimi, SymbolicExpression algne, SymbolicExpression lihtne)
    {
        foreach (var x in new[] { 1.5, 0.5, 2.5, -1.5, 3.5 })
        {
            var a = Arvuta(algne, x); var b = Arvuta(lihtne, x);
            if (a != null && b != null)
                return $"Kontroll punktis x = {Ar(x)}: algne {nimi}({Ar(x)}) = {Ar(a.Value)}, lihtsustatud {nimi}({Ar(x)}) = {Ar(b.Value)}";
        }
        return "Kontroll: lihtsustatud kuju annab samad väärtused mitmes punktis.";
    }

    public static LisaAnalyys Lisa(string valem)
    {
        var f = SymbolicExpression.Parse(valem);
        var d = Tuletis(f);
        var d2 = Tuletis(d);                 // arvutusteks (muutmata)
        var dS = Lihtsusta(d);               // kuvamiseks
        var d2Algne = Tuletis(dS);           // teine tuletis lihtsustatud f'(x)-ist
        var d2S = Lihtsusta(d2Algne);
        bool dLih = dS.ToString() != d.ToString();
        bool d2Lih = d2S.ToString() != d2Algne.ToString();
        Func<double, double?> F = x => Arvuta(f, x);
        Func<double, double?> D = x => Arvuta(d, x);
        Func<double, double?> D2 = x => Arvuta(d2, x);

        var nullid = Nullkohad(F);
        var krit = Nullkohad(D);
        var kaan = Nullkohad(D2).Where(c =>
        {
            var l = D2(c - 0.01); var r = D2(c + 0.01);
            return l != null && r != null && l.Value * r.Value < 0;
        }).ToList();

        var kasvamine = Vahemikud(krit, D, "f'", "kasvab ↑", "kahaneb ↓");
        var kumerus = Vahemikud(kaan, D2, "f''", "alt kumer (∪)", "ülalt kumer (∩)");
        var sammud = new List<LahendusSamm>();
        string kaanTekst = kaan.Count == 0 ? "puuduvad"
            : string.Join("; ", kaan.Select(c => $"x = {Ar(c)}, y = {Z(F(c))}"));

        // 1. Määramispiirkond
        sammud.Add(new LahendusSamm
        {
            Pealkiri = "Määramispiirkond",
            Selgitus = "Funktsioon ei ole määratud seal, kus nimetaja on 0, ruutjuure all on negatiivne arv või logaritmi sees on arv ≤ 0. Programm kontrollib lõigul [-50; 50] sammuga 0,05, kas f(x) on igas punktis arvutatav.",
            Tulemus = Maaramispiirkond(f)
        });

        // 2. Nullkohad
        var s2 = new LahendusSamm
        {
            Pealkiri = "Nullkohad",
            Selgitus = @"Lahendame võrrandi $f(x) = 0$. Programm käib lõigu [-10; 10] sammuga 0,01 läbi. Kui f märk muutub kahe naaberpunkti vahel, asub seal nullkoht ning see täpsustatakse poolitusmeetodiga (lõiku poolitatakse 60 korda). Lõpuks kontrollime, et f(x) ≈ 0; nii lükatakse tagasi ka püstasümptoodid.",
            Tulemus = nullid.Count == 0 ? "lõigus [-10; 10] puuduvad" : "x = " + string.Join("; ", nullid.Select(Ar))
        };
        for (int i = 0; i < nullid.Count; i++)
            s2.Read.Add($"x{i + 1} = {Ar(nullid[i])}: kontroll f({Ar(nullid[i])}) ≈ {Z(F(nullid[i]))}");
        sammud.Add(s2);

        // 3. Esimene tuletis
        var s3 = new LahendusSamm
        {
            Pealkiri = "Esimene tuletis",
            Selgitus = @"Tuletame liikmeti: astme reegel $(x^n)' = n \cdot x^{n-1}$, konstandi tuletis on 0, summa tuletis on tuletiste summa. Keerulisemate avaldiste puhul kasutatakse ka korrutise, jagatise ja liitfunktsiooni reeglit.",
            Read = { $@"$f(x) = {Lt(f)}$", $@"$f'(x) = {Lt(d)}$" },
            Tulemus = "f'(x) = " + dS.ToString()
        };
        if (dLih)
        {
            s3.Read.Add("Lihtsustamine: viime murrud ühise nimetajani, taandame ühised tegurid ja kirjutame nimetaja teguriteks:");
            s3.Read.Add($@"$f'(x) = {Lt(dS)}$");
            s3.Read.Add(Kontroll("f'", d, dS));
        }
        sammud.Add(s3);

        // 4. Kriitilised punktid
        var s4 = new LahendusSamm
        {
            Pealkiri = "Kriitilised punktid",
            Selgitus = @"Kriitilised punktid on need x, kus $f'(x) = 0$. Lahendame selle samamoodi nagu nullkohad, ainult funktsiooniks võtame f'(x).",
            Tulemus = krit.Count == 0 ? "puuduvad" : string.Join("; ", krit.Select((c, i) => $"x{i + 1} = {Ar(c)}"))
        };
        for (int i = 0; i < krit.Count; i++)
            s4.Read.Add($"x{i + 1} = {Ar(krit[i])}: kontroll f'({Ar(krit[i])}) ≈ {Z(D(krit[i]))}");
        sammud.Add(s4);

        // 5. Kasvamine ja kahanemine
        sammud.Add(new LahendusSamm
        {
            Pealkiri = "Kasvamine ja kahanemine",
            Selgitus = "Kriitilised punktid jagavad arvtelje vahemikeks. Igast vahemikust võtame ühe testpunkti ja vaatame f' märki: f' > 0 tähendab, et f kasvab, f' < 0 tähendab, et f kahaneb. (Kehtib seal, kus funktsioon on määratud.)",
            Read = kasvamine.Select(x => x.Pikk).ToList(),
            Tulemus = "märgi muutus näitab, kus on ekstreemum"
        });

        // 6. Ekstreemumid
        var s6 = new LahendusSamm
        {
            Pealkiri = "Ekstreemumid",
            Selgitus = "Kriitilises punktis c vaatame f' märki veidi enne ja pärast punkti (c ± 0,01). Kui f' muutub + → −, on tegu maksimumiga; − → + korral miinimumiga; kui märk ei muutu, ekstreemumit pole. Kontrolliks kasutame teist tuletist: f''(c) < 0 tähendab maksimumi, f''(c) > 0 miinimumi."
        };
        var ekstr = new List<string>();
        foreach (var c in krit)
        {
            var l = D(c - 0.01); var r = D(c + 0.01); var y = F(c); var v2 = D2(c);
            string eel = $"x = {Ar(c)}: f'({Ar(c - 0.01)}) = {Z(l)}, f'({Ar(c + 0.01)}) = {Z(r)}";
            string kontroll = v2 == null ? "" :
                $"; kontroll: f''({Ar(c)}) = {Ar(v2.Value)}" +
                (v2 > 0 ? " > 0, kinnitab miinimumi" : v2 < 0 ? " < 0, kinnitab maksimumi" : " = 0, teine tuletis ei otsusta");

            if (l == null || r == null || y == null)
                s6.Read.Add(eel + " → tuletist ei saa kontrollida, punkt jäetakse vahele");
            else if (l > 0 && r < 0)
            {
                s6.Read.Add(eel + $" → märk + → −, seega maksimum, y = f({Ar(c)}) = {Ar(y.Value)}" + kontroll);
                ekstr.Add($"max: x = {Ar(c)}, y = {Ar(y.Value)}");
            }
            else if (l < 0 && r > 0)
            {
                s6.Read.Add(eel + $" → märk − → +, seega miinimum, y = f({Ar(c)}) = {Ar(y.Value)}" + kontroll);
                ekstr.Add($"min: x = {Ar(c)}, y = {Ar(y.Value)}");
            }
            else
                s6.Read.Add(eel + " → märk ei muutu, ekstreemumit pole");
        }
        s6.Tulemus = ekstr.Count == 0 ? "puuduvad" : string.Join("; ", ekstr);
        sammud.Add(s6);

        // 7. Teine tuletis
        var s7 = new LahendusSamm
        {
            Pealkiri = "Teine tuletis",
            Selgitus = "Teine tuletis on tuletise tuletis: diferentseerime (lihtsustatud) f'(x) veel kord.",
            Read = { $@"$f'(x) = {Lt(dS)}$", $@"$f''(x) = {Lt(d2Algne)}$" },
            Tulemus = "f''(x) = " + d2S.ToString()
        };
        if (d2Lih)
        {
            s7.Read.Add("Lihtsustamine:");
            s7.Read.Add($@"$f''(x) = {Lt(d2S)}$");
            s7.Read.Add(Kontroll("f''", d2Algne, d2S));
        }
        sammud.Add(s7);

        // 8. Käänupunktid ja kumerus
        var s8 = new LahendusSamm
        {
            Pealkiri = "Käänupunktid ja kumerus",
            Selgitus = @"Käänupunkt on koht, kus $f''(x) = 0$ ja f'' muudab märki. Kui f'' > 0, on graafik alt kumer (∪), kui f'' < 0, siis ülalt kumer (∩).",
            Tulemus = kaanTekst
        };
        foreach (var c in kaan)
            s8.Read.Add($"x = {Ar(c)}: f''({Ar(c - 0.01)}) = {Z(D2(c - 0.01))}, f''({Ar(c + 0.01)}) = {Z(D2(c + 0.01))} → märk muutub, käänupunkt");
        s8.Read.AddRange(kumerus.Select(x => x.Pikk));
        sammud.Add(s8);

        return new LisaAnalyys
        {
            Tuletis = dS.ToString(),
            TeineTuletis = d2S.ToString(),
            Kaanupunktid = kaanTekst,
            Kasvamine = kasvamine.Select(x => x.Pikk).ToList(),
            KasvamineLuhike = kasvamine.Select(x => x.Luhike).ToList(),
            Kumerus = kumerus.Select(x => x.Pikk).ToList(),
            KumerusLuhike = kumerus.Select(x => x.Luhike).ToList(),
            Sammud = sammud
        };
    }
}
