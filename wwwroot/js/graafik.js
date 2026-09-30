let graafik = null;
let praeguneValem = '';
let paringuNr = 0;
const PUNKTE = 1000;

async function joonista(valem) {
    praeguneValem = valem;
    const a = await too(-15, 15);
    if (!a) return;

    const [yMin, yMax] = sobitaY(a, -5, 5);

    if (graafik) graafik.destroy();
    const louend = document.getElementById('funktsiooniGraafik');
    louend.style.touchAction = 'none';
    louend.style.cursor = 'grab';
    louend.ondblclick = lahtestaVaade;

    graafik = new Chart(louend.getContext('2d'), {
        type: 'line',
        data: {
            datasets: [
                { label: 'f(x) = ' + valem, data: punktid(a, 'y'), borderColor: 'blue', pointRadius: 0, tension: 0, spanGaps: false },
                { label: "f'(x) = " + a.tuletis, data: punktid(a, 'dy'), borderColor: 'red', borderDash: [5, 5], pointRadius: 0, tension: 0, spanGaps: false }
            ]
        },
        options: {
            animation: false,
            scales: {
                x: { type: 'linear', min: -5, max: 5, position: { y: 0 }, title: { display: true, text: 'x' } },
                y: { min: yMin, max: yMax, position: { x: 0 }, title: { display: true, text: 'y' } }
            },
            plugins: {
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
        }
    });
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

    graafik.data.datasets[0].data = punktid(a, 'y');
    graafik.data.datasets[1].data = punktid(a, 'dy');
    graafik.update('none');                            // keeps the current zoom
}

function punktid(a, veerg) {
    return a.x.map((x, i) => ({ x: x, y: a[veerg][i] }));
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
    let min = Math.max(Math.min(...ys), -100);
    let max = Math.min(Math.max(...ys), 100);
    if (max - min < 1e-9) { min -= 1; max += 1; }
    const ruum = (max - min) * 0.1;
    return [min - ruum, max + ruum];
}