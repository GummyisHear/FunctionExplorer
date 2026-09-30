using System.ComponentModel.DataAnnotations;

namespace FunctionExplorer.Models;

public class FunktsiooniVorm
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Valem on kohustuslik")]
    [StringLength(200, ErrorMessage = "Valem on liiga pikk (max 200)")]
    [RegularExpression(@"^[0-9a-zA-Z\s\+\-\*/\^\(\)\.,]+$", ErrorMessage = "Valem sisaldab lubamatuid märke")]
    [Display(Name = "Valem f(x)")]
    public string Valem { get; set; } = string.Empty;
}