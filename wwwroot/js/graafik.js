let graafik = null;
let praeguneValem = '';
let paringuNr = 0;
const PUNKTE = 1000;

const fmt = v => (Math.round(v * 10000) / 10000).toString();

// Vertikaalne abijoon hiire all oleva x-i kohal
const ristjoon = {
    id: 'ristjoon',
    afterDatasetsDraw(chart) {
        const aktiivsed = chart.tooltip ? chart.tooltip.getActiveElements() : [];
        if (!aktiivsed.length) return;
        const x = aktiivsed[0].element.x;
        const { top, bottom } = chart.chartArea;
        const c = chart.ctx;
        c.save();
        c.beginPath();
        c.moveTo(x, top);
        c.lineTo(x, bottom);
        c.lineWidth = 1;
        c.strokeStyle = 'rgba(0,0,0,.35)';
        c.setLineDash([3, 3]);
        c.stroke();
        c.restore();
    }
};

async function joonista(valem) {
    praeguneValem = valem;
    const a = await too(-15, 15);
    if (!a) return;

    const [yMin, yMax] = sobitaY(a, -5, 5);

    if (graafik) graafik.destroy();
    const louend = document.getElementById('funktsiooniGraafik');
    louend.style.touchAction = 'none';
    louend.style.cursor = 'crosshair';
    louend.ondblclick = lahtestaVaade;
    // kui canvas on .graafik-konteiner sees, täidab graafik selle; muidu säilitab proportsiooni
    const taidaKonteiner = louend.parentElement.classList.contains('graafik-konteiner');

    graafik = new Chart(louend.getContext('2d'), {
        type: 'line',
        data: {
            datasets: [
                { label: 'f(x) = ' + valem, data: [], segment: { borderColor: peidaPoolus }, borderColor: 'blue', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0, spanGaps: false },
                { label: "f'(x) = " + a.tuletis, data: [], segment: { borderColor: peidaPoolus }, borderColor: 'red', borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0, pointHoverRadius: 4, tension: 0, spanGaps: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: !taidaKonteiner,
            animation: false,
            // tooltip järgib hiirt: lähim x, ka siis kui kursor ei puutu joont
            interaction: { mode: 'index', axis: 'x', intersect: false },
            scales: {
                x: { type: 'linear', min: -5, max: 5, position: { y: 0 }, title: { display: true, text: 'x' } },
                y: { min: yMin, max: yMax, position: { x: 0 }, title: { display: true, text: 'y' } }
            },
            plugins: {
                legend: { labels: { boxWidth: 24, font: { size: 11 } } },
                tooltip: {
                    position: 'nearest',
                    callbacks: {
                        title: items => items.length ? 'x = ' + fmt(items[0].parsed.x) : '',
                        label: ctx => (ctx.datasetIndex === 0 ? 'f' : "f'") +
                            '(' + fmt(ctx.parsed.x) + ') = ' + fmt(ctx.parsed.y)
                    }
                },
                zoom: {
                    limits: {
                        x: { min: -1e7, max: 1e7, minRange: 0.01 },
                        y: { min: -1e7, max: 1e7, minRange: 0.01 }
                    },
                    pan: { enabled: true, mode: 'xy', onPanComplete: uuendaAndmed },
                    zoom: {
                        wheel: { enabled: true, speed: 0.08 },
                        pinch: { enabled: true },
                        mode: 'xy',
                        onZoomComplete: uuendaAndmed
                    }
                }
            }
        },
        plugins: [ristjoon]
    });
    seaAndmed(a);
    graafik.update('none');
}

// Ask the backend for points covering the visible x-range plus one screen on each side
async function too(alates, kuni) {
    const samm = (kuni - alates) / PUNKTE;
    const url = `/Funktsioonid/Punktid?valem=${encodeURIComponent(praeguneValem)}` +
        `&alates=${alates}&kuni=${kuni}&samm=${samm}`;
    const vastus = await fetch(url);
    if (!vastus.ok) { alert(await vastus.text()); return null; }
    return await vastus.json();
}

async function uuendaAndmed() {
    const nr = ++paringuNr;
    const xs = graafik.scales.x;
    const laius = xs.max - xs.min;
    const a = await too(xs.min - laius, xs.max + laius);
    if (!a || nr !== paringuNr || !graafik) return;   // a newer request exists

    seaAndmed(a);
    graafik.update('none');                            // keeps the current zoom
}

// Liiga suured väärtused (> 1e7) jäetakse välja: canvas ei joonista neid usaldusväärselt
function puhasta(ys) {
    return ys.map(v => (v !== null && Math.abs(v) > 1e7) ? null : v);
}

// Püstasümptoodi tunnus: märk vahetub naaberpunktide vahel JA |y| kasvab mõlemal pool
// asümptoodi poole. Tavalise nullkoha juures |y| hoopis väheneb.
function onPoolus(ys, i) {
    const a = ys[i], b = ys[i + 1];
    if (a === null || b === null || a * b >= 0) return false;
    const eel = i > 0 ? ys[i - 1] : null;
    const jargmine = i + 2 < ys.length ? ys[i + 2] : null;
    const kasvabVasakul = eel === null || Math.abs(a) >= Math.abs(eel);
    const kasvabParemal = jargmine === null || Math.abs(b) >= Math.abs(jargmine);
    return kasvabVasakul && kasvabParemal;
}

function leiaPoolused(ys) {
    const hulk = new Set();
    for (let i = 0; i + 1 < ys.length; i++) if (onPoolus(ys, i)) hulk.add(i);
    return hulk;
}

// Lõik punktist i punkti i+1 on nähtamatu, kui seal on püstasümptoot
function peidaPoolus(ctx) {
    const ds = ctx.chart.data.datasets[ctx.datasetIndex];
    return ds._poolused && ds._poolused.has(ctx.p0DataIndex) ? 'transparent' : undefined;
}

function seaAndmed(a) {
    [['y', 0], ['dy', 1]].forEach(([veerg, nr]) => {
        const ys = puhasta(a[veerg]);
        const ds = graafik.data.datasets[nr];
        ds._poolused = leiaPoolused(ys);
        ds.data = a.x.map((x, i) => ({ x: x, y: ys[i] }));
    });
}

function lahtestaVaade() {
    if (praeguneValem) joonista(praeguneValem);
}

// Choose a y-range that fits f(x) on the starting x-range
function sobitaY(a, x1, x2) {
    const ys = [];
    a.x.forEach((x, i) => {
        if (x >= x1 && x <= x2 && a.y[i] !== null) ys.push(a.y[i]);
    });
    if (ys.length === 0) return [-10, 10];
    let min = Math.min(...ys), max = Math.max(...ys);
    // asümptootidega funktsioonidel määravad ulatuse äärmused: kasuta protsentiile
    if (leiaPoolused(puhasta(a.y)).size > 0 && ys.length > 20) {
        ys.sort((p, q) => p - q);
        min = ys[Math.floor(ys.length * 0.05)];
        max = ys[Math.ceil(ys.length * 0.95) - 1];
    }
    min = Math.max(min, -100);
    max = Math.min(max, 100);
    if (max - min < 1e-9) { min -= 1; max += 1; }
    const ruum = (max - min) * 0.1;
    return [min - ruum, max + ruum];
}
