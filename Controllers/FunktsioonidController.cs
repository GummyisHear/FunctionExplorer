using FunctionExplorer.Data;
using FunctionExplorer.Models;
using FunctionExplorer.Utils;
using MathNet.Symbolics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FunctionExplorer.Controllers;

public class FunktsioonidController : Controller
{
    private readonly AndmeKontekst _kontekst;
    public FunktsioonidController(AndmeKontekst kontekst) => _kontekst = kontekst;

    // READ: list
    public async Task<IActionResult> Index() =>
        View(await _kontekst.FunktsiooniUurimised.OrderByDescending(f => f.LuodudAeg).ToListAsync());

    // READ: details
    public async Task<IActionResult> Details(int? id)
    {
        if (id == null) return NotFound();
        var olem = await _kontekst.FunktsiooniUurimised.FirstOrDefaultAsync(f => f.Id == id);
        return olem == null ? NotFound() : View(olem);
    }

    // CREATE
    public IActionResult Create() => View(new FunktsiooniVorm());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(FunktsiooniVorm vorm)
    {
        if (!ModelState.IsValid) return View(vorm);
        FunktsiooniUurimine olem;
        try { olem = MathUtils.Analuusi(vorm.Valem); }
        catch (Exception)
        {
            ModelState.AddModelError(nameof(vorm.Valem), "Valemit ei õnnestunud tõlgendada. Näide: x^3 - 3*x");
            return View(vorm);
        }
        await _kontekst.FunktsiooniUurimised.AddAsync(olem);
        await _kontekst.SaveChangesAsync();
        return RedirectToAction(nameof(Details), new { id = olem.Id });
    }

    // UPDATE
    public async Task<IActionResult> Edit(int? id)
    {
        if (id == null) return NotFound();
        var olem = await _kontekst.FunktsiooniUurimised.FindAsync(id);
        return olem == null ? NotFound() : View(new FunktsiooniVorm { Id = olem.Id, Valem = olem.Valem });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(FunktsiooniVorm vorm)
    {
        if (!ModelState.IsValid) return View(vorm);
        var olem = await _kontekst.FunktsiooniUurimised.FindAsync(vorm.Id);
        if (olem == null) return NotFound();
        FunktsiooniUurimine uus;
        try { uus = MathUtils.Analuusi(vorm.Valem); }
        catch (Exception)
        {
            ModelState.AddModelError(nameof(vorm.Valem), "Valemit ei õnnestunud tõlgendada.");
            return View(vorm);
        }
        olem.Valem = uus.Valem; olem.Maaramispiirkond = uus.Maaramispiirkond;
        olem.Nullkohad = uus.Nullkohad; olem.Tuletis = uus.Tuletis;
        olem.KriitilisedPunktid = uus.KriitilisedPunktid; olem.Ekstreemumid = uus.Ekstreemumid;
        await _kontekst.SaveChangesAsync();
        return RedirectToAction(nameof(Details), new { id = olem.Id });
    }

    // DELETE
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var olem = await _kontekst.FunktsiooniUurimised.FindAsync(id);
        if (olem != null)
        {
            _kontekst.FunktsiooniUurimised.Remove(olem);
            await _kontekst.SaveChangesAsync();
        }
        return RedirectToAction(nameof(Index));
    }

    // BONUS: backend computes y-values from any formula text
    [HttpGet]
    public IActionResult Punktid(string valem, double alates = -5, double kuni = 5, double samm = 0.1)
    {
        if (string.IsNullOrWhiteSpace(valem) || valem.Length > 200 || samm <= 0 ||
            kuni <= alates || (kuni - alates) / samm > 5000)
            return BadRequest("Vigane sisend");

        SymbolicExpression f;
        try { f = SymbolicExpression.Parse(valem); }
        catch { return BadRequest("Vigane valem"); }
        var d = MathUtils.Tuletis(f);

        int n = (int)Math.Round((kuni - alates) / samm);
        var xs = new List<double>(); var ys = new List<double?>(); var dys = new List<double?>();
        for (int i = 0; i <= n; i++)
        {
            double x = Math.Round(alates + i * samm, 6);
            xs.Add(x);
            ys.Add(MathUtils.Arvuta(f, x));
            dys.Add(MathUtils.Arvuta(d, x));
        }
        return Json(new { x = xs, y = ys, dy = dys, tuletis = d.ToString() });
    }
}