let graafik = null;

async function joonista(valem, alates = -5, kuni = 5, samm = 0.1) {
    const url = `/Funktsioonid/Punktid?valem=${encodeURIComponent(valem)}&alates=${alates}&kuni=${kuni}&samm=${samm}`;
    const vastus = await fetch(url);
    if (!vastus.ok) { alert(await vastus.text()); return; }
    const a = await vastus.json();

    const f  = a.x.map((x, i) => ({ x: x, y: a.y[i] }));
    const df = a.x.map((x, i) => ({ x: x, y: a.dy[i] }));

    if (graafik) graafik.destroy();
    graafik = new Chart(document.getElementById('funktsiooniGraafik').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [
                { label: 'f(x) = ' + valem, data: f, borderColor: 'blue', pointRadius: 0, tension: 0.2, spanGaps: false },
                { label: "f'(x) = " + a.tuletis, data: df, borderColor: 'red', borderDash: [5, 5], pointRadius: 0, spanGaps: false }
            ]
        },
        options: {
            scales: {
                x: { type: 'linear', position: { y: 0 }, title: { display: true, text: 'x' } },
                y: { position: { x: 0 }, title: { display: true, text: 'y' } }
            }
        }
    });
}