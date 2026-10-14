# 🔍 FunctionExplorer — funktsioonide uurija

**FunctionExplorer** on veebirakendus, mis uurib suvalise ühe muutujaga funktsiooni `f(x)` täielikult läbi. Sisesta valem, näiteks `x^3 - 3*x`, ja programm leiab määramispiirkonna, nullkohad, tuletise, kriitilised punktid, ekstreemumid, kasvamis- ja kahanemisvahemikud, teise tuletise, käänupunktid ja kumeruse. Kõik see kuvatakse **samm-sammulise lahenduskäigu** ja **interaktiivse graafikuga**.

Rakendus põhineb **sümbolarvutusel** (MathNet.Symbolics), nii et tuletised leitakse täpselt, mitte ligikaudselt. Seetõttu ei piirdu see ainult polünoomidega.

![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet)
![ASP.NET Core MVC](https://img.shields.io/badge/ASP.NET_Core-MVC-512BD4)
![MathNet.Symbolics](https://img.shields.io/badge/MathNet.Symbolics-0.25-2E7D32)
![SQLite](https://img.shields.io/badge/SQLite-EF_Core-003B57?logo=sqlite)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?logo=chartdotjs)

---

## ✨ Võimalused

- 🧠 **Sümboolne tuletamine.** Esimene ja teine tuletis leitakse analüütiliselt ning lihtsustatakse.
- 📋 **Täielik uurimisskeem** kaheksas sammus, iga samm koos selgituse ja vahearvutustega:
  1. määramispiirkond,
  2. nullkohad,
  3. esimene tuletis,
  4. kriitilised punktid,
  5. kasvamine ja kahanemine,
  6. ekstreemumid,
  7. teine tuletis,
  8. käänupunktid ja kumerus.
- 📈 **Interaktiivne graafik.** Kuvatakse `f(x)` ja `f'(x)` (1000 punkti). Graafikut saab suumida ja nihutada ning hiire all näeb ristjoont koos täpsete väärtustega.
- ✍️ **Valemid LaTeX-kujul.** Sisestatud valem renderdatakse KaTeX-iga otse sisestamise ajal.
- 📚 **Teooriapeatükk avalehel.** Avaleht sisaldab õppematerjali: mis on tuletis, põhivalemid, tuletamise reeglid, funktsiooni uurimise skeem, ekstreemumite leidmine ja läbitud näide.
- 🗂 **Külgriba otsinguga.** Kõik salvestatud funktsioonid on alati käepärast, ja valemi järgi saab kiirelt filtreerida.
- 💾 **Täielik CRUD.** Funktsioone saab lisada, vaadata, muuta ja kustutada. Andmebaasis on kohe kolm näidisfunktsiooni.
- 🛡 **Turvaline sisend.** Valemit valideeritakse nii vormis kui ka serveris (pikkus kuni 200 märki, lubatud märgid ja graafiku punktide arvu piirang).

## 🧮 Valemi sisestamine

| Tehe | Kirjutamine | Näide |
|---|---|---|
| liitmine / lahutamine | `+` `-` | `x^2 - 4` |
| korrutamine | `*` | `3*x` |
| jagamine | `/` | `1/(x-2)` |
| astendamine | `^` | `x^3` |
| sulud | `( )` | `(x+1)^2` |
| funktsioonid | `sqrt`, `sin`, `cos`, `exp`, `ln` … | `sqrt(x)`, `sin(x)` |

**Näited, mida proovida:**
```
x^3 - 3*x
x^2 - 4*x + 3
1/(x^2 - 1)
sqrt(x + 4)
x*exp(-x)
sin(x)
```

> 💡 Korrutusmärk `*` on kohustuslik: kirjuta `3*x`, mitte `3x`.

## ⚙️ Kuidas arvutus töötab

```
  valem (tekst)
      │
      ▼
SymbolicExpression.Parse()          ← MathNet.Symbolics
      │
      ├─► f'(x) = f.Differentiate(x)  → lihtsustamine
      ├─► f''(x)
      │
      ▼
 Numbriline analüüs
  ├─ määramispiirkond: skaneerimine vahemikus [-50; 50]
  ├─ nullkohad: skaneerimine vahemikus [-10; 10] sammuga 0,01
  │    + märgivahetusel poolitusmeetod (60 iteratsiooni)
  ├─ kriitilised punktid: f'(x) = 0 sama meetodiga
  ├─ ekstreemumid: f' märgi muutus (+ → − max, − → + min)
  └─ käänupunktid: f'' märgi muutus
```

**Head nipid koodis:**
- poolitusmeetod kontrollib, et `|f(x)| < 10⁻⁶`, nii et **asümptoote ei loeta ekslikult nullkohtadeks**;
- kompleksarvulised ja lõpmatud väärtused tähistatakse kui „määramata", nii et `sqrt(x)` ja `1/x` töötavad korrektselt;
- tuletis on täpne (sümboolne), numbrilised meetodid on ainult juurte otsimiseks.

> ℹ️ **Piirangud:** nullkohti ja kriitilisi punkte otsitakse vahemikus **[-10; 10]**, määramispiirkonda vahemikus **[-50; 50]**. Tulemused ümardatakse 4 komakohani. Puutepunktis olevad juured, kus funktsioon märki ei vaheta (nt `x^2` puhul `x = 0`), leitakse ainult siis, kui ruudustiku punkt satub täpselt juurele.

## 🛠 Tehnoloogiad

| Kiht | Tehnoloogia |
|---|---|
| Backend | ASP.NET Core MVC (.NET 10), C# |
| Matemaatika | [MathNet.Symbolics](https://symbolics.mathdotnet.com/) 0.25 |
| Andmebaas | SQLite + Entity Framework Core 10 |
| Graafik | Chart.js 4.4 + chartjs-plugin-zoom + Hammer.js |
| Valemite kuvamine | KaTeX 0.16 (auto-render) |
| Kujundus | Bootstrap 5 |

## 🚀 Käivitamine

### Eeldused
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- (valikuline) EF Core tööriist:
  ```bash
  dotnet tool install --global dotnet-ef
  ```

### Sammud

```bash
# 1. Klooni repositoorium
git clone https://github.com/GummyisHear/FunctionExplorer.git
cd FunctionExplorer

# 2. Taasta sõltuvused
dotnet restore

# 3. (Vajadusel) loo andmebaas koos näidisandmetega
dotnet ef database update

# 4. Käivita
dotnet run
```

Ava brauseris **http://localhost:5245** (HTTPS-profiiliga **https://localhost:7020**).

Visual Studios ava `FunctionExplorer.slnx` ja vajuta **F5**.

## 🗺 Marsruudid

| URL | Kirjeldus |
|---|---|
| `/` | avaleht teooriaga (tuletised ja funktsiooni uurimine) |
| `/Funktsioonid` | kõik salvestatud funktsioonid |
| `/Funktsioonid/Create` | uue funktsiooni lisamine |
| `/Funktsioonid/Details/{id}` | täielik analüüs, lahenduskäik ja graafik |
| `/Funktsioonid/Edit/{id}` | valemi muutmine (analüüs arvutatakse uuesti) |
| `POST /Funktsioonid/Delete/{id}` | kustutamine |
| `/Funktsioonid/Punktid` | **JSON API** graafiku punktide jaoks |

### 📡 API: `GET /Funktsioonid/Punktid`

Arvutab serveris funktsiooni ja tuletise väärtused etteantud vahemikus.

| Parameeter | Vaikimisi | Kirjeldus |
|---|---|---|
| `valem` | — | funktsioon (kohustuslik, max 200 märki) |
| `alates` | `-5` | vahemiku algus |
| `kuni` | `5` | vahemiku lõpp |
| `samm` | `0.1` | samm (kokku kuni 5000 punkti) |

```http
GET /Funktsioonid/Punktid?valem=x^2&alates=-2&kuni=2&samm=1
```
```json
{
  "x":  [-2, -1, 0, 1, 2],
  "y":  [4, 1, 0, 1, 4],
  "dy": [-4, -2, 0, 2, 4],
  "tuletis": "2*x"
}
```
Punktides, kus funktsioon pole määratud, on väärtus `null`, ja graafik katkeb seal korrektselt.

## 📁 Projekti struktuur

```
FunctionExplorer/
├── Controllers/
│   ├── FunktsioonidController.cs        # CRUD + Punktid API
│   └── HomeController.cs                # avaleht teooriaga
├── Utils/
│   ├── MathUtils.cs                     # parsimine, tuletis, nullkohad, ekstreemumid
│   └── MathUtils.Sammud.cs              # teine tuletis, kumerus, lahenduse sammud
├── Models/
│   ├── FunktsiooniUurimine.cs           # andmebaasi olem
│   ├── FunktsiooniVorm.cs               # vormi mudel + valideerimine
│   └── LisaAnalyys.cs                   # laiendatud analüüs ja sammud
├── ViewComponents/
│   └── FunktsioonideKylgribaViewComponent.cs   # külgriba
├── Data/
│   └── DataContext.cs                   # EF Core kontekst + näidisandmed
├── Migrations/
├── Views/
├── wwwroot/js/
│   ├── graafik.js                       # Chart.js graafik
│   ├── valem-latex.js                   # valemi teisendamine LaTeX-iks
│   ├── katex-init.js                    # KaTeX renderdamine
│   └── kylgriba.js                      # külgriba otsing
├── funktsioonid.db                      # SQLite andmebaas
└── Program.cs
```

## 💾 Andmemudel

| Väli | Näide |
|---|---|
| `Valem` | `x^3 - 3*x` |
| `Maaramispiirkond` | `X: (-∞; ∞)` |
| `Nullkohad` | `x = -1.7321; 0; 1.7321` |
| `Tuletis` | `3*x^2 - 3` |
| `KriitilisedPunktid` | `x1 = -1; x2 = 1` |
| `Ekstreemumid` | `max: x = -1, y = 2; min: x = 1, y = -2` |
| `LuodudAeg` | loomise aeg (UTC) |

Teine tuletis, kumerus ja lahenduse sammud arvutatakse iga kord detailvaate avamisel uuesti, seega neid andmebaasi ei salvestata.

Andmebaasi asukoht määratakse failis `appsettings.json`:
```json
"ConnectionStrings": { "Vaikimisi": "Data Source=funktsioonid.db" }
```

## 🔮 Edasiarendused

- [ ] kasutaja määratav nullkohtade otsingu vahemik
- [ ] puutepunktis juurte (paarisarvulise kordsusega) usaldusväärne leidmine
- [ ] asümptootide ja paarsuse automaatne määramine
- [ ] analüüsi eksport PDF-i
- [ ] ühiktestid `MathUtils` jaoks

## 👤 Autor

**GummyisHear** — [github.com/GummyisHear](https://github.com/GummyisHear)
