using FunctionExplorer.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FunctionExplorer.ViewComponents;

public record KylgribaKirje(int Id, string Valem);

public class FunktsioonideKylgribaViewComponent : ViewComponent
{
    private readonly AndmeKontekst _kontekst;
    public FunktsioonideKylgribaViewComponent(AndmeKontekst kontekst) => _kontekst = kontekst;

    public async Task<IViewComponentResult> InvokeAsync()
    {
        var nimekiri = await _kontekst.FunktsiooniUurimised.AsNoTracking()
            .OrderByDescending(f => f.LuodudAeg)
            .Select(f => new KylgribaKirje(f.Id, f.Valem))
            .ToListAsync();
        return View(nimekiri);
    }
}
