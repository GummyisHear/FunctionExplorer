(function () {
    const otsing = document.getElementById('kylgribaOtsing');
    if (!otsing) return;
    const lingid = Array.from(document.querySelectorAll('#kylgribaNimekiri a'));
    const tuhi = document.getElementById('kylgribaTuhi');
    const norm = s => s.toLowerCase().replace(/\s+/g, '');

    otsing.addEventListener('input', () => {
        const q = norm(otsing.value);
        let leitud = 0;
        lingid.forEach(a => {
            const sobib = norm(a.dataset.valem).includes(q);
            a.classList.toggle('d-none', !sobib);
            if (sobib) leitud++;
        });
        tuhi.classList.toggle('d-none', leitud > 0);
    });

    // märgi aktiivne funktsioon
    const praegu = location.pathname.toLowerCase();
    lingid.forEach(a => {
        if (new URL(a.href).pathname.toLowerCase() === praegu) a.classList.add('active');
    });
})();
