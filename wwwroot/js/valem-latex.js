// Teisendab Math.NET-i tekstilise valemi (nt "3*x^2 - 3/(x+1)") KaTeX-i jaoks LaTeX-iks.
// Kasutus: valemLatexiks("x^2/(x-1)")  ->  "\frac{x^{2}}{x - 1}"
(function (global) {
    'use strict';

    function tokeniseeri(s) {
        const t = [];
        const re = /\s*(?:(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z_0-9]*)|([-+*\/^(),]))/y;
        let i = 0;
        s = s.trim();
        while (i < s.length) {
            re.lastIndex = i;
            const m = re.exec(s);
            if (!m) throw new Error('Tundmatu märk: ' + s[i]);
            if (m[1] !== undefined) t.push({ t: 'num', v: m[1] });
            else if (m[2] !== undefined) t.push({ t: 'id', v: m[2] });
            else t.push({ t: 'op', v: m[3] });
            i = re.lastIndex;
            while (i < s.length && /\s/.test(s[i])) i++;
        }
        return t;
    }

    // ---- Parser: summa > korrutis/jagatis > unaarne miinus > aste > aatom ----
    function parsi(s) {
        const t = tokeniseeri(s);
        let p = 0;
        const vaata = () => t[p];
        const op = v => t[p] && t[p].t === 'op' && t[p].v === v;
        const votaOp = v => { if (!op(v)) throw new Error('Oodati ' + v); p++; };

        function avaldis() {
            let esimene = liige();
            const liikmed = [esimene];
            while (op('+') || op('-')) {
                const miinus = t[p++].v === '-';
                const l = liige();
                liikmed.push(miinus ? { k: 'neg', a: l } : l);
            }
            return liikmed.length === 1 ? esimene : { k: 'add', a: liikmed };
        }

        function liige() {
            let vasak = unaarne();
            while (op('*') || op('/') || (t[p] && (t[p].t === 'num' || t[p].t === 'id' || op('(')))) {
                const tehe = (op('*') || op('/')) ? t[p++].v : '*';   // lausutud või vihjatud korrutamine (2x, x(x+1))
                const parem = unaarne();
                if (tehe === '*') {
                    const tegurid = vasak.k === 'mul' ? vasak.a.slice() : [vasak];
                    if (parem.k === 'mul') tegurid.push(...parem.a); else tegurid.push(parem);
                    vasak = { k: 'mul', a: tegurid };
                } else {
                    vasak = { k: 'div', n: vasak, d: parem };
                }
            }
            return vasak;
        }

        function unaarne() {
            if (op('-')) { p++; return { k: 'neg', a: unaarne() }; }
            if (op('+')) { p++; return unaarne(); }
            return aste();
        }

        function aste() {
            const alus = aatom();
            if (op('^')) {
                p++;
                // astendaja on parempoolselt assotsiatiivne ja võib olla negatiivne
                const ast = op('-') ? (p++, { k: 'neg', a: aste() }) : aste();
                return { k: 'pow', b: alus, e: ast };
            }
            return alus;
        }

        function aatom() {
            const x = vaata();
            if (!x) throw new Error('Ootamatu lõpp');
            if (x.t === 'num') { p++; return { k: 'num', v: x.v }; }
            if (x.t === 'id') {
                p++;
                if (op('(') && x.v.length > 1) {
                    p++;
                    const args = [avaldis()];
                    while (op(',')) { p++; args.push(avaldis()); }
                    votaOp(')');
                    return { k: 'call', f: x.v, a: args };
                }
                return { k: 'sym', v: x.v };
            }
            if (op('(')) { p++; const e = avaldis(); votaOp(')'); return e; }
            throw new Error('Ootamatu: ' + x.v);
        }

        const tulem = avaldis();
        if (p < t.length) throw new Error('Üle jäänud: ' + t[p].v);
        return tulem;
    }

    // ---- LaTeX-i genereerimine ----
    const sulg = s => '\\left(' + s + '\\right)';
    const onAatom = n => ['num', 'sym', 'call', 'raw'].includes(n.k);

    const FUNKTSIOONID = {
        sin: '\\sin', cos: '\\cos', tan: '\\tan', cot: '\\cot', ln: '\\ln', log: '\\log',
        arcsin: '\\arcsin', arccos: '\\arccos', arctan: '\\arctan',
        sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh'
    };
    const KREEKA = { pi: '\\pi', alpha: '\\alpha', beta: '\\beta' };

    function e(n) {
        switch (n.k) {
            case 'num': return n.v;
            case 'raw': return n.tex;
            case 'sym': return KREEKA[n.v.toLowerCase()] || (n.v.length === 1 ? n.v : '\\mathrm{' + n.v + '}');
            case 'neg': return '-' + (n.a.k === 'add' || n.a.k === 'neg' ? sulg(e(n.a)) : e(n.a));
            case 'add': {
                let s = e(n.a[0]);
                for (let i = 1; i < n.a.length; i++) {
                    const x = n.a[i];
                    s += x.k === 'neg'
                        ? ' - ' + (x.a.k === 'add' || x.a.k === 'neg' ? sulg(e(x.a)) : e(x.a))
                        : ' + ' + e(x);
                }
                return s;
            }
            case 'mul': {
                // märk tuuakse ette: (-a)*b  ->  -(a b)
                let miinus = false;
                const tegurid = n.a.slice();
                if (tegurid[0].k === 'neg') { miinus = true; tegurid[0] = tegurid[0].a; }
                let s = '';
                tegurid.forEach((x, i) => {
                    let osa = (x.k === 'add' || x.k === 'neg') ? sulg(e(x)) : e(x);
                    if (i > 0) s += (x.k === 'num') ? ' \\cdot ' : ' ';
                    s += osa;
                });
                return (miinus ? '-' : '') + s;
            }
            case 'div': {
                let miinus = false, ln = n.n;
                if (ln.k === 'neg') { miinus = true; ln = ln.a; }
                return (miinus ? '-' : '') + '\\frac{' + e(ln) + '}{' + e(n.d) + '}';
            }
            case 'pow': {
                const alus = onAatom(n.b) && !(n.b.k === 'num' && /^-/.test(n.b.v)) ? e(n.b) : sulg(e(n.b));
                return alus + '^{' + e(n.e) + '}';
            }
            case 'call': {
                const f = n.f.toLowerCase();
                const args = n.a.map(e);
                if (f === 'sqrt' && args.length === 1) return '\\sqrt{' + args[0] + '}';
                if (f === 'exp' && args.length === 1) return 'e^{' + args[0] + '}';
                if (f === 'abs' && args.length === 1) return '\\left|' + args[0] + '\\right|';
                const nimi = FUNKTSIOONID[f] || '\\operatorname{' + n.f + '}';
                return nimi + sulg(args.join(', '));
            }
        }
        throw new Error('Tundmatu sõlm');
    }

    function paeVaiPlain(s) {
        return '\\text{' + s.replace(/[\\{}$&#^_%~]/g, c => '\\' + c) + '}';
    }

    function valemLatexiks(tekst) {
        try { return e(parsi(tekst)); }
        catch (err) { return paeVaiPlain(tekst); }
    }

    global.valemLatexiks = valemLatexiks;
    global.valemLatex = { valemLatexiks, parsi, astLatex: e };
    if (typeof module !== 'undefined') module.exports = { valemLatexiks, parsi, astLatex: e };
})(typeof window !== 'undefined' ? window : globalThis);