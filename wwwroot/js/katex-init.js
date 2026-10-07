// Asendab tekstis olevad ⟦valem⟧ märgid LaTeX-iga ja renderdab seejärel kõik $...$ valemid.
function asendaValemid(juur) {
    const kaja = document.createTreeWalker(juur, NodeFilter.SHOW_TEXT, {
        acceptNode: n => /SCRIPT|STYLE|TEXTAREA/.test(n.parentElement.tagName)
            ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const sõlmed = [];
    while (kaja.nextNode()) if (kaja.currentNode.nodeValue.includes('\u27E6')) sõlmed.push(kaja.currentNode);
    sõlmed.forEach(n => {
        n.nodeValue = n.nodeValue.replace(/\u27E6([^\u27E7]*)\u27E7/g,
            (_, v) => window.valemLatexiks ? window.valemLatexiks(v) : v);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const sisu = document.querySelector('.sisu');
    if (!sisu) return;
    asendaValemid(sisu);
    if (!window.renderMathInElement) return;
    renderMathInElement(sisu, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
        ],
        throwOnError: false
    });
});
