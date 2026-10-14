// Õpilase moodi lahenduskäik: teeb sama, mida õpilane vihikus teeks (teguriteks jagamine, korrutise reegel,
// märgitabel jne). Töötab valemi tekstiga; kõik arvutused kontrollitakse arvuliselt.
(function (global) {
'use strict';
const VL = global.valemLatex || require('./valem-latex.js');
const { parsi, astLatex } = VL;

// ================= Murrud =================
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
const fr = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
const fadd = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d), fmul = (a, b) => fr(a.n * b.n, a.d * b.d);
const fneg = a => fr(-a.n, a.d), finv = a => fr(a.d, a.n);
const fz = a => a.n === 0, fone = a => a.n === 1 && a.d === 1, fval = a => a.n / a.d;
const F0 = fr(0), F1 = fr(1);
function fparse(s) {
    const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
    if (!m) throw new Error('arv');
    return fr(parseInt(m[1] + (m[2] || ''), 10), Math.pow(10, (m[2] || '').length));
}
const frTex = a => { const s = a.n < 0 ? '-' : '', n = Math.abs(a.n); return a.d === 1 ? s + n : s + '\\frac{' + n + '}{' + a.d + '}'; };

// ================= Polünoomid (massiiv, indeks = aste) =================
const ptrim = p => { p = p.slice(); while (p.length && fz(p[p.length - 1])) p.pop(); return p; };
const pconst = c => fz(c) ? [] : [c];
const padd = (a, b) => { const n = Math.max(a.length, b.length), r = []; for (let i = 0; i < n; i++) r.push(fadd(a[i] || F0, b[i] || F0)); return ptrim(r); };
const pscale = (a, c) => ptrim(a.map(x => fmul(x, c)));
const pmul = (a, b) => {
    if (!a.length || !b.length) return [];
    const r = Array.from({ length: a.length + b.length - 1 }, () => F0);
    a.forEach((x, i) => b.forEach((y, j) => { r[i + j] = fadd(r[i + j], fmul(x, y)); }));
    return ptrim(r);
};
const ppow = (p, n) => { let r = [F1]; for (let i = 0; i < n; i++) r = pmul(r, p); return r; };
function pdivmod(a, b) {
    let r = a.slice();
    const q = Array.from({ length: Math.max(a.length - b.length + 1, 0) }, () => F0);
    const lb = b[b.length - 1];
    while (r.length >= b.length && r.length) {
        const c = fmul(r[r.length - 1], finv(lb)), k = r.length - b.length;
        q[k] = c;
        for (let i = 0; i < b.length; i++) r[i + k] = fadd(r[i + k], fneg(fmul(c, b[i])));
        r = ptrim(r);
    }
    return { q: ptrim(q), r };
}
function pgcd(a, b) {
    while (b.length) { const r = pdivmod(a, b).r; a = b; b = r; }
    return a.length ? pscale(a, finv(a[a.length - 1])) : [];
}
const plcm = (a, b) => pdivmod(pmul(a, b), pgcd(a, b)).q;
const peval = (p, x) => p.reduceRight((s, c) => s * x + fval(c), 0);

const intConst = n => {
    if (n.k === 'num' && /^\d+$/.test(n.v)) return parseInt(n.v, 10);
    if (n.k === 'neg') { const v = intConst(n.a); return v === null ? null : -v; }
    return null;
};
function toPoly(n) {
    switch (n.k) {
        case 'num': return pconst(fparse(n.v));
        case 'sym': return n.v === 'x' ? [F0, F1] : null;
        case 'neg': { const a = toPoly(n.a); return a && pscale(a, fr(-1)); }
        case 'add': { let r = []; for (const t of n.a) { const a = toPoly(t); if (!a) return null; r = padd(r, a); } return r; }
        case 'mul': { let r = [F1]; for (const t of n.a) { const a = toPoly(t); if (!a) return null; r = pmul(r, a); } return r; }
        case 'div': { const a = toPoly(n.n), b = toPoly(n.d); return (a && b && b.length === 1) ? pscale(a, finv(b[0])) : null; }
        case 'pow': { const b = toPoly(n.b), e = intConst(n.e); return (b && e !== null && e >= 0 && e <= 40) ? ppow(b, e) : null; }
    }
    return null;
}
function polyTex(p) {
    if (!p.length) return '0';
    let s = '';
    for (let i = p.length - 1; i >= 0; i--) {
        const c = p[i]; if (fz(c)) continue;
        const neg = c.n < 0, ac = fr(Math.abs(c.n), c.d);
        const mono = i === 0 ? '' : i === 1 ? 'x' : 'x^{' + i + '}';
        const body = i === 0 ? frTex(ac) : fone(ac) ? mono : frTex(ac) + mono;
        s += s === '' ? (neg ? '-' : '') + body : (neg ? ' - ' : ' + ') + body;
    }
    return s;
}
const nTerms = p => p.filter(c => !fz(c)).length;

// ================= Teguriteks jagamine (ratsionaaljuured + ruutvõrrand) =================
function primitiveInt(p) {
    let l = 1; p.forEach(x => { l = l / gcd(l, x.d) * x.d; });
    const ints = p.map(x => x.n * (l / x.d));
    let g = 0; ints.forEach(v => { g = gcd(g, v); }); g = g || 1;
    const sign = ints[ints.length - 1] < 0 ? -1 : 1;
    return { c: fr(sign * g, l), q: ints.map(v => fr(sign * v / g)) };
}
function findRatRoot(q) {
    const divs = n => { const r = []; for (let i = 1; i * i <= n && i <= 1e6; i++) if (n % i === 0) { r.push(i); if (i * i !== n) r.push(n / i); } return r; };
    const ps = divs(Math.abs(q[0].n)), qs = divs(Math.abs(q[q.length - 1].n)), n = q.length - 1;
    for (const pp of ps) for (const qq of qs) {
        if (gcd(pp, qq) !== 1) continue;
        for (const s of [1, -1]) {
            let sum = 0n;
            for (let i = 0; i <= n; i++) sum += BigInt(q[i].n) * BigInt(s * pp) ** BigInt(i) * BigInt(qq) ** BigInt(n - i);
            if (sum === 0n) return fr(s * pp, qq);
        }
    }
    return null;
}
function faktoriseeri(p) {
    const { c, q: q0 } = primitiveInt(p);
    let q = q0, kx = 0;
    while (q.length > 1 && fz(q[0])) { q = q.slice(1); kx++; }
    const lin = [];
    while (q.length > 1) {
        const r = findRatRoot(q); if (!r) break;
        const div = [fr(-r.n), fr(r.d)];
        q = pdivmod(q, div).q;
        const ex = lin.find(l => l.root.n === r.n && l.root.d === r.d);
        if (ex) ex.m++; else lin.push({ root: r, m: 1, poly: div });
    }
    return { c, kx, lin, rest: q.length > 1 ? q : null };
}
// teguriteks jagatud polünoom LaTeX-is; parenIfSum: pane summa sulgudesse, kui sellele korrutatakse veel midagi
function factoredTex(p, parenIfSum) {
    if (!p.length) return '0';
    const fk = faktoriseeri(p);
    const parts = [];
    if (fk.kx) parts.push(fk.kx === 1 ? 'x' : 'x^{' + fk.kx + '}');
    fk.lin.forEach(l => { const t = '(' + polyTex(l.poly) + ')'; parts.push(l.m > 1 ? t + '^{' + l.m + '}' : t); });
    if (fk.rest) parts.push('(' + polyTex(fk.rest) + ')');
    if (!parts.length) return frTex(fk.c);
    if (parts.length === 1 && fone(fk.c)) {
        const single = fk.kx || fk.lin.some(l => l.m > 1);
        if (single) return parts[0];
        return parenIfSum ? '(' + polyTex(p) + ')' : polyTex(p);
    }
    const cT = fone(fk.c) ? '' : (fk.c.n === -1 && fk.c.d === 1) ? '-' : frTex(fk.c);
    return cT + parts.join(' ');
}
function sqrtSimplify(D) { let s = 1, m = D; for (let i = 2; i * i <= m; i++) while (m % (i * i) === 0) { m /= i * i; s *= i; } return { s, m }; }
function quadRoots(q) { // q = [c, b, a] täisarvud, a > 0, ratsionaaljuuri pole
    const a = q[2].n, b = q[1].n, c = q[0].n, D = b * b - 4 * a * c;
    if (D <= 0) return { D, roots: [] };
    const { s, m } = sqrtSimplify(D), den = 2 * a, g = gcd(gcd(Math.abs(b), s), den);
    const bb = b / g, ss = s / g, dd = den / g, rad = (ss === 1 ? '' : ss) + '\\sqrt{' + m + '}';
    const mk = sg => {
        const num = bb === 0 ? (sg < 0 ? '-' : '') + rad : (-bb) + (sg < 0 ? ' - ' : ' + ') + rad;
        return dd === 1 ? num : '\\frac{' + num + '}{' + dd + '}';
    };
    const pm = bb === 0 ? '\\pm ' + (dd === 1 ? rad : '\\frac{' + rad + '}{' + dd + '}') : '\\frac{' + (-bb) + ' \\pm ' + rad + '}{' + dd + '}';
    return { D, pm, roots: [{ tex: mk(-1), val: (-b - Math.sqrt(D)) / den }, { tex: mk(1), val: (-b + Math.sqrt(D)) / den }] };
}
function numRoots(fn, a, b, h) {
    const out = []; h = h || (b - a) / 4000;
    let px = a, py = fn(a);
    for (let x = a + h; x <= b + 1e-12; x += h) {
        const y = fn(x);
        if (Number.isFinite(py) && Number.isFinite(y)) {
            let r = null;
            if (py === 0) r = px; else if (py * y < 0) {
                let lo = px, hi = x, flo = py;
                for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, fm = fn(m); if (!Number.isFinite(fm)) break; if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } }
                r = (lo + hi) / 2; if (!(Math.abs(fn(r)) < 1e-6)) r = null;   // asümptoot, mitte nullkoht
                else if (Math.abs(r) < 1e-9) r = 0;
            }
            if (r !== null && !out.some(t => Math.abs(t - r) < 1e-6)) out.push(r);
        }
        px = x; py = y;
    }
    return out;
}

// ================= AST abifunktsioonid =================
const N = v => ({ k: 'num', v: String(Math.abs(v)) });
const num = v => v < 0 ? { k: 'neg', a: N(v) } : N(v);
const X = { k: 'sym', v: 'x' };
const isZero = n => n.k === 'num' && parseFloat(n.v) === 0, isOne = n => n.k === 'num' && parseFloat(n.v) === 1;
const hasX = n => {
    switch (n.k) {
        case 'sym': return n.v === 'x';
        case 'neg': return hasX(n.a);
        case 'add': case 'mul': case 'call': return n.a.some(hasX);
        case 'div': return hasX(n.n) || hasX(n.d);
        case 'pow': return hasX(n.b) || hasX(n.e);
    }
    return false;
};
const mkAdd = a => { a = a.filter(t => !isZero(t)); return a.length === 0 ? N(0) : a.length === 1 ? a[0] : { k: 'add', a }; };
const mkMul = a => { if (a.some(isZero)) return N(0); a = a.filter(t => !isOne(t)); return a.length === 0 ? N(1) : a.length === 1 ? a[0] : { k: 'mul', a }; };
const mkNeg = a => isZero(a) ? N(0) : { k: 'neg', a };
const mkPow = (b, e) => { const i = intConst(e); return i === 1 ? b : i === 0 ? N(1) : { k: 'pow', b, e }; };
const call = (f, a) => ({ k: 'call', f, a: [a] });
const SUPPORTED = new Set(['sin', 'cos', 'tan', 'exp', 'ln', 'sqrt']);

function constToFr(n) {   // arvuline konstant (ilma x-ita) murruna või null
    if (n.k === 'num') return fparse(n.v);
    if (n.k === 'neg') { const a = constToFr(n.a); return a && fneg(a); }
    if (n.k === 'div') { const a = constToFr(n.n), b = constToFr(n.d); return a && b && !fz(b) ? fmul(a, finv(b)) : null; }
    if (n.k === 'add') { let r = F0; for (const t of n.a) { const a = constToFr(t); if (!a) return null; r = fadd(r, a); } return r; }
    if (n.k === 'mul') { let r = F1; for (const t of n.a) { const a = constToFr(t); if (!a) return null; r = fmul(r, a); } return r; }
    return null;
}
const frNode = c => { const m = c.d === 1 ? N(c.n) : { k: 'div', n: N(c.n), d: N(c.d) }; return c.n < 0 ? { k: 'neg', a: m } : m; };

// eelkäsitlus: e^g -> exp(g); toetamata funktsioonid viskavad vea (siis kasutatakse serveri seletust)
function norm(n) {
    switch (n.k) {
        case 'pow': { const b = norm(n.b), e = norm(n.e); return (b.k === 'sym' && b.v === 'e') ? call('exp', e) : { k: 'pow', b, e }; }
        case 'neg': return { k: 'neg', a: norm(n.a) };
        case 'add': case 'mul': return { k: n.k, a: n.a.map(norm) };
        case 'div': return { k: 'div', n: norm(n.n), d: norm(n.d) };
        case 'call': if (!SUPPORTED.has(n.f.toLowerCase())) throw new Error('toetamata funktsioon ' + n.f); return { k: 'call', f: n.f.toLowerCase(), a: n.a.map(norm) };
        case 'sym': if (n.v !== 'x' && n.v !== 'e' && n.v.toLowerCase() !== 'pi') throw new Error('tundmatu ' + n.v); return n.v.toLowerCase() === 'pi' ? { k: 'sym', v: 'pi' } : n;
    }
    return n;
}

// ================= Arvuline väärtustamine =================
function evalAst(n, x) {
    switch (n.k) {
        case 'num': return parseFloat(n.v);
        case 'raw': return n.val;
        case 'sym': return n.v === 'x' ? x : n.v === 'e' ? Math.E : n.v === 'pi' ? Math.PI : NaN;
        case 'neg': return -evalAst(n.a, x);
        case 'add': return n.a.reduce((s, t) => s + evalAst(t, x), 0);
        case 'mul': return n.a.reduce((s, t) => s * evalAst(t, x), 1);
        case 'div': return evalAst(n.n, x) / evalAst(n.d, x);
        case 'pow': return Math.pow(evalAst(n.b, x), evalAst(n.e, x));
        case 'call': {
            const a = evalAst(n.a[0], x);
            switch (n.f) {
                case 'sin': return Math.sin(a); case 'cos': return Math.cos(a); case 'tan': return Math.tan(a);
                case 'exp': return Math.exp(a); case 'ln': return a > 0 ? Math.log(a) : NaN; case 'sqrt': return a >= 0 ? Math.sqrt(a) : NaN;
            }
        }
    }
    return NaN;
}

// ================= Tuletis (AST -> AST) =================
function d(n) {
    switch (n.k) {
        case 'num': case 'raw': return N(0);
        case 'sym': return N(n.v === 'x' ? 1 : 0);
        case 'neg': return mkNeg(d(n.a));
        case 'add': return mkAdd(n.a.map(d));
        case 'mul': return mkAdd(n.a.map((_, i) => mkMul(n.a.map((t, j) => i === j ? d(t) : t))));
        case 'div': {
            if (!hasX(n.d)) return { k: 'div', n: d(n.n), d: n.d };
            return { k: 'div', n: mkAdd([mkMul([d(n.n), n.d]), mkNeg(mkMul([n.n, d(n.d)]))]), d: mkPow(n.d, N(2)) };
        }
        case 'pow': {
            if (!hasX(n.e)) {
                const fe = constToFr(n.e);
                const e1 = fe ? frNode(fadd(fe, fr(-1))) : mkAdd([n.e, num(-1)]);
                return mkMul([n.e, mkPow(n.b, e1), d(n.b)]);
            }
            if (!hasX(n.b)) return mkMul([n, call('ln', n.b), d(n.e)]);
            return mkMul([n, mkAdd([mkMul([d(n.e), call('ln', n.b)]), { k: 'div', n: mkMul([n.e, d(n.b)]), d: n.b }])]);
        }
        case 'call': {
            const a = n.a[0], da = d(a);
            switch (n.f) {
                case 'sin': return mkMul([call('cos', a), da]);
                case 'cos': return mkNeg(mkMul([call('sin', a), da]));
                case 'tan': return { k: 'div', n: da, d: mkPow(call('cos', a), N(2)) };
                case 'exp': return mkMul([n, da]);
                case 'ln': return { k: 'div', n: da, d: a };
                case 'sqrt': return { k: 'div', n: da, d: mkMul([N(2), n]) };
            }
        }
    }
    throw new Error('tuletis');
}

// ================= Normaalkuju: (Σ polünoom · aatomid) / polünoom =================
let ATOM = {};
const callTex = (f, arg) => {
    const a = astLatex(arg);
    if (f === 'exp') return 'e^{' + a + '}';
    if (f === 'sqrt') return '\\sqrt{' + a + '}';
    return '\\' + f + '\\left(' + a + '\\right)';
};
function atomKey(kind, node, tex) {
    const key = kind + ':' + tex;
    if (!ATOM[key]) ATOM[key] = { kind, node, tex };
    return key;
}
const atomNF = key => ({ den: [F1], terms: [{ a: { [key]: 1 }, p: [F1] }] });
const sig = a => Object.keys(a).filter(k => a[k] !== 0).sort().map(k => k + '^' + a[k]).join('|');
function nfMerge(den, terms) {
    const m = new Map();
    for (const t of terms) {
        const a = {}; Object.keys(t.a).forEach(k => { if (t.a[k] !== 0) a[k] = t.a[k]; });
        const s = sig(a), e = m.get(s);
        if (e) e.p = padd(e.p, t.p); else m.set(s, { a, p: t.p });
    }
    let ts = [...m.values()].filter(t => t.p.length);
    if (!ts.length) return { den: [F1], terms: [] };
    let g = den; ts.forEach(t => { g = pgcd(g, t.p); });
    if (g.length > 1) { den = pdivmod(den, g).q; ts = ts.map(t => ({ a: t.a, p: pdivmod(t.p, g).q })); }
    const inv = finv(den[den.length - 1]);
    return { den: pscale(den, inv), terms: ts.map(t => ({ a: t.a, p: pscale(t.p, inv) })) };
}
const nfScale = (A, c) => ({ den: A.den, terms: A.terms.map(t => ({ a: t.a, p: pscale(t.p, c) })) });
function nfAdd(A, B) {
    const D = plcm(A.den, B.den), mA = pdivmod(D, A.den).q, mB = pdivmod(D, B.den).q;
    return nfMerge(D, [...A.terms.map(t => ({ a: t.a, p: pmul(t.p, mA) })), ...B.terms.map(t => ({ a: t.a, p: pmul(t.p, mB) }))]);
}
function nfMul(A, B) {
    const ts = [];
    A.terms.forEach(s => B.terms.forEach(t => {
        const a = { ...s.a }; Object.keys(t.a).forEach(k => { a[k] = (a[k] || 0) + t.a[k]; });
        ts.push({ a, p: pmul(s.p, t.p) });
    }));
    return nfMerge(pmul(A.den, B.den), ts);
}
function nfPow(A, e) { if (e > 12) throw new Error('aste'); let r = { den: [F1], terms: [{ a: {}, p: [F1] }] }; for (let i = 0; i < e; i++) r = nfMul(r, A); return r; }
function nfDiv(A, B, Bnode) {
    if (!B.terms.length) throw new Error('nulliga jagamine');
    if (B.terms.length === 1) {
        const t = B.terms[0], inv = {}; Object.keys(t.a).forEach(k => { inv[k] = -t.a[k]; });
        return nfMul(A, nfMerge(t.p, [{ a: inv, p: B.den }]));
    }
    return nfMul(A, atomNF(atomKey('grp', Bnode, '\\left(' + astLatex(Bnode) + '\\right)')));
}
function fromAst(n) {
    const tp = toPoly(n);
    if (tp) return { den: [F1], terms: tp.length ? [{ a: {}, p: tp }] : [] };
    switch (n.k) {
        case 'neg': return nfScale(fromAst(n.a), fr(-1));
        case 'add': return n.a.map(fromAst).reduce(nfAdd);
        case 'mul': return n.a.map(fromAst).reduce(nfMul);
        case 'div': return nfDiv(fromAst(n.n), fromAst(n.d), n.d);
        case 'pow': {
            const e = intConst(n.e);
            if (e !== null) return e >= 0 ? nfPow(fromAst(n.b), e) : nfDiv({ den: [F1], terms: [{ a: {}, p: [F1] }] }, nfPow(fromAst(n.b), -e), mkPow(n.b, N(-e)));
            return atomNF(atomKey('pow', n, astLatex(n)));
        }
        case 'call': return atomNF(atomKey('call', n, callTex(n.f, n.a[0])));
        case 'sym': return atomNF(atomKey('const', n, n.v === 'pi' ? '\\pi' : 'e'));
    }
    throw new Error('normaalkuju');
}
// atom astendajaga (LaTeX)
function atomPowTex(key, e) {
    const A = ATOM[key];
    if (e === 1) return A.kind === 'pow' ? '\\left(' + A.tex + '\\right)' : A.tex;
    if (A.kind === 'call' && A.node.f === 'exp') {
        const arg = A.node.a[0];
        return (arg.k === 'sym' || arg.k === 'num') ? 'e^{' + e + astLatex(arg) + '}' : '\\left(' + A.tex + '\\right)^{' + e + '}';
    }
    if (A.kind === 'call' && ['sin', 'cos', 'tan'].includes(A.node.f)) return '\\' + A.node.f + '^{' + e + '}\\left(' + astLatex(A.node.a[0]) + '\\right)';
    return '\\left(' + A.tex + '\\right)^{' + e + '}';
}
function nfTex(nf) {
    if (!nf.terms.length) return '0';
    const common = {};
    Object.keys(nf.terms[0].a).forEach(k => {
        const es = nf.terms.map(t => t.a[k] || 0);
        if (es.every(e => e !== 0 && Math.sign(e) === Math.sign(es[0]))) common[k] = es[0] > 0 ? Math.min(...es) : Math.max(...es);
    });
    const terms = nf.terms.map(t => { const a = { ...t.a }; Object.keys(common).forEach(k => { a[k] -= common[k]; if (a[k] === 0) delete a[k]; }); return { a, p: t.p }; });
    const num = [], den = [];
    const pushAtoms = (a, numArr, denArr) => Object.keys(a).sort().forEach(k => (a[k] > 0 ? numArr : denArr).push(atomPowTex(k, Math.abs(a[k]))));
    const termTex = (t, factored) => {
        const nA = [], dA = []; pushAtoms(t.a, nA, dA);
        const unit = t.p.length === 1 && Math.abs(t.p[0].n) === 1 && t.p[0].d === 1 && nA.length > 0;
        const pt = unit ? (t.p[0].n < 0 ? '-' : '') : (factored ? factoredTex(t.p, nA.length > 0) : (nTerms(t.p) > 1 && nA.length ? '(' + polyTex(t.p) + ')' : polyTex(t.p)));
        let up = pt + nA.join(' '); if (up === '') up = '1';
        return dA.length ? '\\frac{' + up + '}{' + dA.join(' ') + '}' : up;
    };
    const cn = [], cd = []; pushAtoms(common, cn, cd);
    if (terms.length === 1) {
        const t = terms[0], nA = [], dA = []; pushAtoms({ ...t.a, ...Object.fromEntries(Object.keys(common).map(k => [k, (t.a[k] || 0) + common[k]])) }, nA, dA);
        const noAtoms = nA.length > 0;
        let pCoef = t.p;
        if (t.p.length === 1 && t.p[0].d !== 1) { den.push(String(t.p[0].d)); pCoef = [fr(t.p[0].n)]; }
        const unit1 = pCoef.length === 1 && Math.abs(pCoef[0].n) === 1 && pCoef[0].d === 1;
        const pt = unit1 ? (pCoef[0].n < 0 ? '-' : '') : factoredTex(pCoef, noAtoms);
        num.push(pt + (pt && noAtoms && /\d$/.test(pt) ? ' ' : '') + nA.join(' ')); den.push(...dA);
        if (num[0] === '' || num[0] === '-') num[0] += '1';
    } else {
        let s = '';
        terms.forEach((t, i) => { const x = termTex(t, false); s += i === 0 ? x : (x.startsWith('-') ? ' - ' + x.slice(1) : ' + ' + x); });
        const wrap = cn.length > 0 || cd.length > 0;
        num.push(wrap ? '\\left(' + s + '\\right)' : s); num.push(...cn); den.push(...cd);
    }
    if (!(nf.den.length === 1 && fone(nf.den[0]))) den.push(factoredTex(nf.den, den.length > 0));
    let nTex = num.join(' ');
    if (den.length && /^-/.test(nTex)) return '-\\frac{' + (nTex.slice(1) || '1') + '}{' + den.join(' ') + '}';
    return den.length ? '\\frac{' + nTex + '}{' + den.join(' ') + '}' : nTex;
}
// normaalkuju tagasi AST-iks (et lihtsustatud f'(x)-ist uuesti tuletada)
function polyAst(p) {
    return mkAdd(p.map((c, i) => {
        if (fz(c)) return N(0);
        const mono = i === 0 ? null : i === 1 ? X : { k: 'pow', b: X, e: N(i) };
        return i === 0 ? frNode(c) : fone(c) ? mono : mkMul([frNode(c), mono]);
    }));
}
function nfToAst(nf) {
    const sum = mkAdd(nf.terms.map(t => {
        const up = [polyAst(t.p)], dn = [];
        Object.keys(t.a).sort().forEach(k => { const node = ATOM[k].node, e = t.a[k]; (e > 0 ? up : dn).push(mkPow(node, N(Math.abs(e)))); });
        const u = mkMul(up);
        return dn.length ? { k: 'div', n: u, d: mkMul(dn) } : u;
    }));
    return (nf.den.length === 1 && fone(nf.den[0])) ? sum : { k: 'div', n: sum, d: polyAst(nf.den) };
}
const simp = ast => fromAst(ast);          // normaalkuju
const simpTex = ast => nfTex(fromAst(ast)); // lihtsustatud LaTeX

// ================= Abifunktsioonid lahenduskäigu jaoks =================
const esc = s => s.replace(/ < /g, ' \\lt ');   // '<' ei tohi HTML-i sisse sattuda
const P = s => '<p>' + esc(s) + '</p>';
const M = s => '<div class="lv-valem">$$' + esc(s) + '$$</div>';
const I = s => '$' + s + '$';
const numTex = v => {
    if (!Number.isFinite(v)) return '\\text{puudub}';
    if (Math.abs(v) < 1e-9) return '0';
    if (Math.abs(v) >= 1e6 || (v !== 0 && Math.abs(v) < 1e-4)) {
        const m = /^(-?[\d.]+)e([+-]\d+)$/.exec(v.toExponential(2));
        return m[1] + '\\cdot 10^{' + parseInt(m[2], 10) + '}';
    }
    return String(Math.round(v * 10000) / 10000);
};
function nice(v) {
    if (!Number.isFinite(v)) return { tex: '\\text{puudub}', exact: false };
    if (Math.abs(v - Math.round(v)) < 1e-9) return { tex: String(Math.round(v) + 0), exact: true };
    for (let q = 2; q <= 12; q++) if (Math.abs(v * q - Math.round(v * q)) < 1e-9) return { tex: frTex(fr(Math.round(v * q), q)), exact: true };
    return { tex: numTex(v), exact: false };
}
const wrap = t => (/ [+-] /.test(t) || t.startsWith('-')) ? '\\left(' + t + '\\right)' : t;
const subst = (n, r) => {
    switch (n.k) {
        case 'sym': return n.v === 'x' ? r : n;
        case 'neg': return { k: 'neg', a: subst(n.a, r) };
        case 'add': case 'mul': return { k: n.k, a: n.a.map(t => subst(t, r)) };
        case 'div': return { k: 'div', n: subst(n.n, r), d: subst(n.d, r) };
        case 'pow': return { k: 'pow', b: subst(n.b, r), e: subst(n.e, r) };
        case 'call': return { k: 'call', f: n.f, a: n.a.map(t => subst(t, r)) };
    }
    return n;
};
const rawNode = root => ({ k: 'raw', tex: root.rat ? (root.rat.n < 0 ? '\\left(' + frTex(root.rat) + '\\right)' : frTex(root.rat)) : '\\left(' + root.tex + '\\right)', val: root.val });
const isPurePoly = nf => nf.den.length === 1 && fone(nf.den[0]) && (nf.terms.length === 0 || (nf.terms.length === 1 && !Object.keys(nf.terms[0].a).length));
const resultTex = nf => isPurePoly(nf) ? polyTex(nf.terms.length ? nf.terms[0].p : []) : nfTex(nf);
const rootTex = r => r.approx ? numTex(r.val) : r.tex + (r.rat || Math.abs(r.val - Math.round(r.val)) < 1e-12 ? '' : ' \\approx ' + numTex(r.val));

// ================= Polünoomi p(x) = 0 lahendamine õpilase moodi =================
function lahendaPoly(p, skipLead) {
    const lines = [], roots = [];
    if (!p.length) return { lines: [P('Avaldis on kõikjal 0.')], roots, always: true };
    if (p.length === 1) { lines.push(P('Konstant ei ole null, seega lahendeid pole.')); return { lines, roots }; }
    const fk = faktoriseeri(p), nF = (fk.kx ? 1 : 0) + fk.lin.length + (fk.rest ? 1 : 0);
    if (nF > 1 || !fone(fk.c)) {
        const how = [];
        if (fk.kx && nF > 1) how.push('võtame ühisteguriks $x' + (fk.kx > 1 ? '^{' + fk.kx + '}' : '') + '$ sulgude ette');
        if (p.length >= 4 && fk.lin.some(l => l.root.n !== 0)) how.push('ratsionaaljuure otsime vaba liikme ja kõrgeima astme kordaja jagajate abil (kandidaadid $\\pm\\frac{\\text{vaba liikme jagaja}}{\\text{esimese kordaja jagaja}}$); kui $x = r$ on juur, siis $(x - r)$ on tegur ja ülejäänu saame jagamisega');
        else if (p.length === 3 && fk.lin.length) how.push('ruutkolmliikme jagame teguriteks (ruutude vahe valemi $a^{2} - b^{2} = (a-b)(a+b)$ või ruutvõrrandi lahendite abil)');
        lines.push(P('Jagame polünoomi teguriteks' + (how.length ? ': ' + how.join('; ') : '') + '.'));
        lines.push(M(polyTex(p) + ' = ' + factoredTex(p, false)));
        if (!skipLead) lines.push(P('Korrutis on null siis, kui vähemalt üks tegur on null:'));
    }
    if (fk.kx) { lines.push(M(fk.kx > 1 ? 'x^{' + fk.kx + '} = 0 \\;\\Rightarrow\\; x = 0' : 'x = 0')); roots.push({ tex: '0', val: 0, rat: F0, m: fk.kx }); }
    fk.lin.forEach(l => {
        lines.push(M(polyTex(l.poly) + (l.m > 1 ? '' : '') + ' = 0 \\;\\Rightarrow\\; x = ' + frTex(l.root)));
        roots.push({ tex: frTex(l.root), val: fval(l.root), rat: l.root, m: l.m });
    });
    if (fk.rest) {
        const q = fk.rest;
        if (q.length === 3) {
            const a = q[2].n, b = q[1].n, c = q[0].n, qr = quadRoots(q);
            if (b === 0) {
                const k = fr(-c, a);
                lines.push(M(polyTex(q) + ' = 0 \\;\\Rightarrow\\; x^{2} = ' + frTex(k)));
                if (k.n < 0) lines.push(P('Ruut ei saa olla negatiivne, seega reaalarvulisi lahendeid pole.'));
                else {
                    const a1 = '\\pm\\sqrt{' + frTex(k) + '}';
                    lines.push(M(a1.replace(/\s/g, '') === qr.pm.replace(/\s/g, '') ? 'x = ' + a1 : 'x = ' + a1 + ' = ' + qr.pm));
                }
            } else {
                lines.push(P('Ruutvõrrand $' + polyTex(q) + ' = 0$. Arvutame diskriminandi:'));
                lines.push(M('D = b^{2} - 4ac = ' + (b < 0 ? '(' + b + ')' : b) + '^{2} - 4\\cdot' + a + '\\cdot' + (c < 0 ? '(' + c + ')' : c) + ' = ' + qr.D));
                if (qr.D < 0) lines.push(P('$D < 0$, seega reaalarvulisi lahendeid pole.'));
                else lines.push(M('x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a} = ' + qr.pm));
            }
            if (qr.D > 0) {
                lines.push(M('x_1 = ' + qr.roots[0].tex + ' \\approx ' + numTex(qr.roots[0].val) + ',\\qquad x_2 = ' + qr.roots[1].tex + ' \\approx ' + numTex(qr.roots[1].val)));
                qr.roots.forEach(r => roots.push({ tex: r.tex, val: r.val, rat: null, m: 1 }));
            }
        } else {
            const R = 1 + Math.max(...q.slice(0, -1).map(c => Math.abs(fval(c) / fval(q[q.length - 1]))));
            const rs = numRoots(x => peval(q, x), -R, R, R / 4000);
            lines.push(P('Tegur $' + polyTex(q) + '$ ei jagu ratsionaaljuurte abil enam teguriteks, seega lahendame selle ligikaudselt (graafiku või Newtoni meetodiga): ' + (rs.length ? I('x \\approx ' + rs.map(numTex).join(';\\ ')) : 'reaalarvulisi lahendeid pole') + '.'));
            rs.forEach(r => roots.push({ tex: numTex(r), val: r, rat: null, m: 1, approx: true }));
        }
    }
    roots.sort((a, b) => a.val - b.val);
    return { lines, roots };
}

// ================= Võrrandi NF = 0 lahendamine (nullkohad, kriitilised punktid, käänupunktid) =================
// chk(x): jääk, mis peab juures olema ≈ 0; inDom(x): kas punkt kuulub f määramispiirkonda
function lahendaNF(nf, chk, inDom, naide) {
    const lines = [];
    let roots = [], fallback = false;
    if (!nf.terms.length) return { lines: [P('Avaldis on kõikjal 0.')], roots: [], always: true };
    if (nf.terms.length === 1) {
        const t = nf.terms[0];
        const atoms = Object.keys(t.a);
        if (!isPurePoly(nf)) lines.push(M(nfTex(nf) + ' = 0'));
        if (nf.den.length > 1 || atoms.some(k => t.a[k] < 0)) lines.push(P('Murd on null siis, kui lugeja on null (nimetaja peab jääma nullist erinevaks).'));
        if (atoms.length || nF2(t.p, nf)) lines.push(P('Korrutis on null siis, kui mõni tegur on null. Vaatame tegureid ükshaaval.'));
        if (t.p.length > 1 || (t.p.length === 1 && !fone(t.p[0]) && !atoms.length)) {
            const sub = lahendaPoly(t.p, atoms.length > 0);
            if (atoms.length) lines.push(P('Polünoomi tegur $' + factoredTex(t.p, false) + '$:'));
            lines.push(...sub.lines); roots.push(...sub.roots);
        }
        for (const k of atoms) {
            const A = ATOM[k];
            if (A.kind === 'call' && A.node.f === 'exp') {
                lines.push(P('Tegur $' + A.tex + '$ on alati positiivne (eksponentfunktsioon ei saa olla 0), seega see tegur nullkohti ei anna.'));
            } else if (A.kind === 'call' && (A.node.f === 'ln' || A.node.f === 'sqrt')) {
                const g = toPoly(A.node.a[0]);
                if (t.a[k] < 0) continue;
                if (!g) { fallback = true; continue; }
                const target = A.node.f === 'ln' ? padd(g, [fr(-1)]) : g;
                lines.push(P(A.node.f === 'ln' ? 'Tegur $' + A.tex + ' = 0$ siis, kui logaritmi argument on 1: $' + polyTex(g) + ' = 1$.' : 'Tegur $' + A.tex + ' = 0$ siis, kui juure all on 0: $' + polyTex(g) + ' = 0$.'));
                const sub = lahendaPoly(target); lines.push(...sub.lines); roots.push(...sub.roots);
            } else if (A.kind === 'const') {
                lines.push(P('Konstant $' + A.tex + '$ ei ole null.'));
            } else if (t.a[k] > 0) fallback = true;
        }
    } else if (nf.terms.length === 2) {
        const c0 = nf.terms.find(t => !Object.keys(t.a).length), c1 = nf.terms.find(t => Object.keys(t.a).length === 1);
        const k1 = c1 && Object.keys(c1.a)[0], A = k1 && ATOM[k1];
        const gp = A && A.kind === 'call' && A.node.f === 'ln' && c1.a[k1] === 1 && toPoly(A.node.a[0]);
        if (c0 && gp && c0.p.length === 1 && c1.p.length === 1 && gp.length === 2) {
            const kk = fmul(fneg(c0.p[0]), finv(c1.p[0])), ex = fone(kk) ? 'e' : 'e^{' + frTex(kk) + '}', gT = astLatex(A.node.a[0]);
            lines.push(M(nfTex(nf) + ' = 0'));
            lines.push(P('Lugeja on null: $' + polyTex(c0.p) + (c1.p[0].n < 0 ? ' - ' + (fone(fneg(c1.p[0])) ? '' : frTex(fneg(c1.p[0]))) : ' + ' + (fone(c1.p[0]) ? '' : frTex(c1.p[0]))) + '\\ln\\left(' + gT + '\\right) = 0$. Avaldame logaritmi:'));
            lines.push(M('\\ln\\left(' + gT + '\\right) = ' + frTex(kk)));
            lines.push(P('Logaritmist vabanemiseks teeme mõlemale poolele $e$-astme (ln ja $e^{x}$ on pöördfunktsioonid):'));
            const xv = (Math.exp(fval(kk)) - fval(gp[0])) / fval(gp[1]);
            if (gp[0].n === 0 && fone(gp[1])) lines.push(M('x = ' + ex)); else lines.push(M(gT + ' = ' + ex + (gp[0].n !== 0 || !fone(gp[1]) ? ' \\;\\Rightarrow\\; x = \\frac{' + ex + (gp[0].n === 0 ? '' : (gp[0].n < 0 ? ' + ' + (-gp[0].n) : ' - ' + gp[0].n)) + '}{' + frTex(gp[1]) + '}' : ' \\;\\Rightarrow\\; x = ' + ex)));
            roots.push({ tex: gp[0].n === 0 && fone(gp[1]) ? ex : '\\frac{' + ex + (gp[0].n === 0 ? '' : (gp[0].n < 0 ? ' + ' + (-gp[0].n) : ' - ' + gp[0].n)) + '}{' + frTex(gp[1]) + '}', val: xv, rat: null, m: 1 });
        } else fallback = true;
    } else fallback = true;
    if (fallback) {
        const rs = numRoots(chk, -10, 10);
        lines.push(P('Seda võrrandit ei saa lihtsate algebraliste võtetega lahendada (summas on erinevad funktsioonid või trigonomeetria). Õpikus lahendatakse selline võrrand graafiliselt või ligikaudselt; lõigul $[-10;\\,10]$ saame: ' + (rs.length ? I('x \\approx ' + rs.map(numTex).join(';\\ ')) : 'lahendeid pole') + '. (Trigonomeetriliste võrrandite lahendid kordduvad perioodiliselt.)'));
        roots = rs.map(r => ({ tex: numTex(r), val: r, rat: null, m: 1, approx: true }));
    }
    // lähtepunktid, mis ei kuulu määramispiirkonda või ei anna tegelikult nulli, jäetakse välja
    const keep = [], dropped = [];
    roots.forEach(r => (inDom(r.val) && Math.abs(chk(r.val)) < 1e-6 * Math.max(1, Math.abs(r.val)) + 1e-6 ? keep : dropped).push(r));
    dropped.forEach(r => lines.push(P('Kontroll: $x = ' + rootTex(r) + '$ ei kuulu määramispiirkonda, seega seda lahendit ei arvesta.')));
    const seen = []; const out = keep.filter(r => { if (seen.some(v => Math.abs(v - r.val) < 1e-9)) return false; seen.push(r.val); return true; });
    return { lines, roots: out.sort((a, b) => a.val - b.val), dropped };
}
const nF2 = (p, nf) => !(nf.den.length === 1) ;

// ================= Määramispiirkond =================
function collectConds(n, out) {
    switch (n.k) {
        case 'neg': collectConds(n.a, out); break;
        case 'add': case 'mul': n.a.forEach(t => collectConds(t, out)); break;
        case 'div': collectConds(n.n, out); collectConds(n.d, out); if (hasX(n.d)) out.push({ t: 'ne', g: n.d }); break;
        case 'pow': {
            collectConds(n.b, out); collectConds(n.e, out);
            const ie = intConst(n.e);
            if (ie !== null) { if (ie < 0 && hasX(n.b)) out.push({ t: 'ne', g: n.b }); }
            else if (hasX(n.b)) { const fe = constToFr(n.e); out.push({ t: fe && fe.n > 0 ? 'ge' : 'gt', g: n.b, root: true }); }
            break;
        }
        case 'call':
            collectConds(n.a[0], out);
            if (n.f === 'ln') out.push({ t: 'gt', g: n.a[0], log: true });
            if (n.f === 'sqrt') out.push({ t: 'ge', g: n.a[0], root: true });
            if (n.f === 'tan') out.push({ t: 'tan', g: n.a[0] });
    }
}
function analuusiDomeen(f) {
    const raw = []; collectConds(f, raw);
    const seen = new Set(), conds = raw.filter(c => { const k = c.t + astLatex(c.g); if (seen.has(k)) return false; seen.add(k); return true; });
    const lines = [];
    if (!conds.length) {
        lines.push(P('Piiranguid tekitavad nimetaja (peab olema $\\neq 0$), paarisjuur (juuritav $\\geq 0$) ja logaritm (argument $> 0$). Selles valemis neid pole: polünoomid, eksponentfunktsioon ja siinus/koosinus on määratud kõikjal.'));
        lines.push(P('Seega määramispiirkond on kõik reaalarvud: $x \\in \\mathbb{R}$.'));
        return { lines, ok: true, vastus: 'x \\in \\mathbb{R}', breaks: [], inDomain: () => true };
    }
    if (conds.some(c => c.t === 'tan' || !toPoly(c.g))) {
        lines.push(P('Valemis on piiranguid, mida ei saa lihtsalt polünoomina lahendada (näiteks $\\tan$ pole määratud seal, kus $\\cos = 0$). Täpne määramispiirkond selgub graafiku ja arvutuse põhjal.'));
        return { lines, ok: false, breaks: [], inDomain: null };
    }
    const all = [];
    conds.forEach(c => {
        const g = toPoly(c.g), gt = astLatex(c.g);
        const sub = lahendaPoly(g);
        if (c.t === 'ne') lines.push(P('<b>Nimetaja ei tohi olla 0:</b> $' + gt + ' \\neq 0$. Leiame, millal nimetaja on 0:'));
        else if (c.t === 'gt' && c.log) lines.push(P('<b>Logaritmi argument peab olema positiivne:</b> $' + gt + ' > 0$. Leiame esmalt nullkohad:'));
        else if (c.t === 'ge') lines.push(P('<b>Juure all peab olema mittenegatiivne arv:</b> $' + gt + ' \\geq 0$. Leiame esmalt nullkohad:'));
        else lines.push(P('<b>Astendaja tõttu peab alus olema positiivne:</b> $' + gt + ' > 0$. Leiame esmalt nullkohad:'));
        lines.push(...sub.lines);
        if (c.t === 'ne') {
            lines.push(P(sub.roots.length ? 'Seega $x \\neq ' + sub.roots.map(rootTex).join(';\\ ') + '$.' : 'Nimetaja ei ole kunagi 0, piirangut ei teki.'));
        } else {
            const pts = sub.roots.map(r => r.val);
            const tests = []; const sorted = [...new Set(pts)].sort((a, b) => a - b);
            for (let i = 0; i <= sorted.length; i++) tests.push(sorted.length === 0 ? 0 : i === 0 ? sorted[0] - 1 : i === sorted.length ? sorted[sorted.length - 1] + 1 : (sorted[i - 1] + sorted[i]) / 2);
            const info = tests.map((t, i) => '$' + (i === 0 ? '(-\\infty;\\,' : '(' + numTex(sorted[i - 1]) + ';\\,') + (i === sorted.length ? '\\infty)' : numTex(sorted[i]) + ')') + '$: $x = ' + numTex(t) + ' \\Rightarrow ' + numTex(peval(g, t)) + (peval(g, t) > 0 ? ' > 0$ ✓' : ' < 0$ ✗'));
            lines.push(P('Märk igas vahemikus (testpunktiga):<br>' + info.join('<br>')));
        }
        sub.roots.forEach(r => all.push(r));
        c.roots = sub.roots; c.gp = g;
    });
    const br = []; all.sort((a, b) => a.val - b.val).forEach(r => { if (!br.some(b => Math.abs(b.val - r.val) < 1e-9)) br.push(r); });
    const ok = (c, x) => { const v = peval(c.gp, x), e = 1e-9 * Math.max(1, Math.abs(x)); return c.t === 'ne' ? Math.abs(v) > e : c.t === 'ge' ? v >= -e : v > e; };
    const inDomain = x => conds.every(c => ok(c, x));
    const items = [];
    for (let i = 0; i <= br.length; i++) {
        const t = br.length === 0 ? 0 : i === 0 ? br[0].val - 1 : i === br.length ? br[i - 1].val + 1 : (br[i - 1].val + br[i].val) / 2;
        items.push({ iv: true, inc: inDomain(t) });
        if (i < br.length) items.push({ iv: false, inc: inDomain(br[i].val), r: br[i] });
    }
    // liida järjestikused sisalduvad elemendid vahemikeks
    const runs = []; let cur = null;
    items.forEach((it, idx) => { if (it.inc) { if (!cur) cur = { s: idx, e: idx }; else cur.e = idx; } else if (cur) { runs.push(cur); cur = null; } });
    if (cur) runs.push(cur);
    const part = runs.map(r => {
        const a = items[r.s], b = items[r.e];
        if (r.s === r.e && !a.iv) return '\\{' + a.r.tex + '\\}';
        const L = a.iv ? (r.s === 0 ? '(-\\infty' : '(' + items[r.s - 1].r.tex) : '[' + a.r.tex;
        const R = b.iv ? (r.e === items.length - 1 ? '\\infty)' : items[r.e + 1].r.tex + ')') : b.r.tex + ']';
        return L + ';\\,' + R;
    });
    const onlyPoints = items.filter(i => i.iv).every(i => i.inc) && items.some(i => !i.iv && !i.inc);
    const excl = items.filter(i => !i.iv && !i.inc).map(i => i.r.tex);
    const vastus = !part.length ? '\\varnothing' : onlyPoints ? 'x \\neq ' + excl.join(';\\ ') : 'x \\in ' + part.join(' \\cup ');
    lines.push(P('Kõik piirangud kokku võttes:'));
    lines.push(M(vastus));
    if (onlyPoints) lines.push(M('D(f) = ' + part.join(' \\cup ')));
    return { lines, ok: true, vastus, breaks: br, inDomain };
}

// ================= Tuletise selgitus =================
function reegel(t) {
    if (!hasX(t)) return 'konstandi tuletis on 0';
    if (t.k === 'mul' && t.a.filter(hasX).length > 1) return 'korrutise reegel';
    if (t.k === 'div' && hasX(t.d)) return 'jagatise reegel';
    if (t.k === 'call' && !(t.a[0].k === 'sym')) return 'liitfunktsiooni reegel';
    if (t.k === 'pow' && hasX(t.e)) return 'liitfunktsiooni reegel';
    return 'tabeli valem';
}
function selgitaTuletis(ast, fT, rT) {   // fT = "f(x)", rT = "f'(x)"
    const lines = [], dAst = d(ast), nf = fromAst(dAst), res = resultTex(nf), top = ast;
    const poly = toPoly(ast);
    const dTex = t => resultTex(fromAst(d(t)));
    if (poly) {
        lines.push(P('Tegemist on polünoomiga, seega tuletame liikmeti. Kasutame reegleid $(x^{n})\' = n\\cdot x^{n-1}$, $(c\\cdot g)\' = c\\cdot g\'$, $(g+h)\' = g\'+h\'$ ning konstandi tuletis on 0.'));
        const terms = top.k === 'add' ? top.a : [top];
        terms.forEach(t => lines.push(M('(' + astLatex(t) + ')\' = ' + dTex(t))));
        if (terms.length > 1) lines.push(P('Liidame tuletised kokku ja koondame:'));
        lines.push(M(rT + ' = ' + res));
    } else if (top.k === 'add') {
        lines.push(P('Summa tuletis on liidetavate tuletiste summa. Tuletame iga liikme eraldi:'));
        top.a.forEach(t => lines.push(M('(' + astLatex(t) + ')\' = ' + dTex(t)) + P('<small>(' + reegel(t) + ')</small>')));
        lines.push(P('Liidame ja koondame sarnased liikmed:')); lines.push(M(rT + ' = ' + res));
    } else if (top.k === 'mul' && top.a.filter(hasX).length === 1 && top.a.some(t => !hasX(t))) {
        const g = mkMul(top.a.filter(hasX)), c = mkMul(top.a.filter(t => !hasX(t)));
        lines.push(P('Konstandiga korrutatud funktsiooni tuletamisel jääb konstant ette: $(c\\cdot g)\' = c\\cdot g\'$, kus $c = ' + astLatex(c) + '$ ja $g = ' + astLatex(g) + '$.'));
        lines.push(M('g\' = ' + dTex(g))); lines.push(M(rT + ' = ' + res));
    } else if (top.k === 'mul' && top.a.filter(hasX).length > 1) {
        const f = top.a.filter(hasX), cs = top.a.filter(t => !hasX(t));
        const u = f[0], v = mkMul([...cs, ...f.slice(1)]);
        const ut = astLatex(u), vt = astLatex(v), du = dTex(u), dv = dTex(v);
        lines.push(P('Funktsioon on kahe teguri korrutis $f = u\\cdot v$, seega kasutame <b>korrutise reeglit</b>: $(u\\cdot v)\' = u\'\\cdot v + u\\cdot v\'$.'));
        lines.push(M('u = ' + ut + ',\\qquad v = ' + vt));
        lines.push(M('u\' = ' + du + ',\\qquad v\' = ' + dv));
        lines.push(P('Paneme valemisse:'));
        lines.push(M(rT + ' = ' + wrap(du) + '\\cdot ' + wrap(vt) + ' + ' + wrap(ut) + '\\cdot ' + wrap(dv)));
        lines.push(P('Avame sulud, koondame sarnased liikmed ja võtame vajadusel ühise teguri sulgude ette:')); lines.push(M(rT + ' = ' + res));
    } else if (top.k === 'div' && hasX(top.d)) {
        const u = top.n, v = top.d, ut = astLatex(u), vt = astLatex(v), du = dTex(u), dv = dTex(v);
        lines.push(P('Funktsioon on murd $f = \\dfrac{u}{v}$, seega kasutame <b>jagatise reeglit</b>: $\\left(\\dfrac{u}{v}\\right)\' = \\dfrac{u\'\\cdot v - u\\cdot v\'}{v^{2}}$.'));
        lines.push(M('u = ' + ut + ',\\qquad v = ' + vt));
        lines.push(M('u\' = ' + du + ',\\qquad v\' = ' + dv));
        lines.push(P('Paneme valemisse:'));
        lines.push(M(rT + ' = \\frac{' + wrap(du) + '\\cdot ' + wrap(vt) + ' - ' + wrap(ut) + '\\cdot ' + wrap(dv) + '}{\\left(' + vt + '\\right)^{2}}'));
        lines.push(P('Avame lugejas sulud, koondame sarnased liikmed ja taandame, kui võimalik:')); lines.push(M(rT + ' = ' + res));
    } else if ((top.k === 'call' && top.a[0].k !== 'sym') || (top.k === 'pow' && !hasX(top.e) && top.b.k !== 'sym') || (top.k === 'neg')) {
        if (top.k === 'neg') { lines.push(P('Miinusmärk jääb tuletamisel ette: $(-g)\' = -g\'$.')); lines.push(M(rT + ' = ' + res)); }
        else {
            const g = top.k === 'call' ? top.a[0] : top.b;
            lines.push(P('See on liitfunktsioon: väline funktsioon rakendub sisemisele funktsioonile $g = ' + astLatex(g) + '$. Kasutame <b>liitfunktsiooni reeglit</b> ("välimise tuletis korda sisemise tuletis").'));
            lines.push(M('g = ' + astLatex(g) + ',\\qquad g\' = ' + dTex(g)));
            const outer = top.k === 'pow' ? '(g^{n})\' = n\\cdot g^{n-1}\\cdot g\'' : ({ exp: '(e^{g})\' = e^{g}\\cdot g\'', ln: '(\\ln g)\' = \\frac{g\'}{g}', sqrt: '(\\sqrt{g})\' = \\frac{g\'}{2\\sqrt{g}}', sin: '(\\sin g)\' = \\cos g\\cdot g\'', cos: '(\\cos g)\' = -\\sin g\\cdot g\'', tan: '(\\tan g)\' = \\frac{g\'}{\\cos^{2} g}' })[top.f];
            lines.push(M(outer));
            lines.push(P('Paneme sisse ja lihtsustame:')); lines.push(M(rT + ' = ' + res));
        }
    } else {
        const tab = { exp: '(e^{x})\' = e^{x}', ln: '(\\ln x)\' = \\frac{1}{x}', sin: '(\\sin x)\' = \\cos x', cos: '(\\cos x)\' = -\\sin x', tan: '(\\tan x)\' = \\frac{1}{\\cos^{2} x}', sqrt: '(\\sqrt{x})\' = \\frac{1}{2\\sqrt{x}}' };
        lines.push(P('Kasutame tabeli valemit:')); lines.push(M(top.k === 'call' && tab[top.f] ? tab[top.f] : rT + ' = ' + res));
        if (top.k === 'call') lines.push(M(rT + ' = ' + res));
    }
    return { lines, nf, res, ast: nfToAst(nf) };
}

// ================= Märgitabel: kasvamine, ekstreemumid, kumerus =================
function signTable(points, g) {   // points: [{val, tex}] sorted
    const rows = [];
    for (let i = 0; i <= points.length; i++) {
        const t = points.length === 0 ? 0 : i === 0 ? points[0].val - Math.max(1, Math.abs(points[0].val) * 0.5) : i === points.length ? points[i - 1].val + Math.max(1, Math.abs(points[i - 1].val) * 0.5) : (points[i - 1].val + points[i].val) / 2;
        const v = g(t);
        rows.push({ a: i === 0 ? '-\\infty' : points[i - 1].tex, b: i === points.length ? '\\infty' : points[i].tex, t, v, def: Number.isFinite(v) });
    }
    return rows;
}
const mergePoints = (...lists) => { const out = []; lists.flat().sort((a, b) => a.val - b.val).forEach(r => { if (!out.some(o => Math.abs(o.val - r.val) < 1e-9)) out.push(r); }); return out; };

// ================= Kogu lahenduskäik =================
function parseServer(s) {
    if (!s || /^\s*(\(|puuduvad)/.test(s)) return [];
    return (s.replace(/x\d*\s*=/g, '').match(/-?\d+(?:\.\d+)?/g) || []).map(parseFloat).sort((a, b) => a - b);
}
function sama(rootVals, serverVals) {
    const mine = rootVals.filter(v => Math.abs(v) <= 10 + 1e-9).sort((a, b) => a - b);
    return mine.length === serverVals.length && mine.every((v, i) => Math.abs(v - serverVals[i]) < 2e-3);
}
const rootList = rs => rs.length ? rs.map(r => (r.approx ? 'x \\approx ' : 'x = ') + rootTex(r)).join(';\\ ') : '';

function koosta(valem, server) {
    ATOM = {};
    server = server || {};
    const f = norm(parsi(valem));
    const F = x => evalAst(f, x), fTex = astLatex(f), out = {};
    const safe = (nimi, fn) => { try { fn(); } catch (err) { out[nimi] = null; if (global.console) console.warn('lahendaja:', nimi, err); } };
    let dom = { breaks: [], ok: false }, z, td, td2, crit, D1, D2, d1ok = false;
    const inDom = x => Number.isFinite(F(x));

    safe('maar', () => {
        dom = analuusiDomeen(f);
        out.maar = { html: dom.lines.join(''), vastus: dom.ok ? I(dom.vastus) : null };
    });
    safe('null', () => {
        z = lahendaNF(fromAst(f), F, inDom);
        const ok = sama(z.roots.map(r => r.val), parseServer(server.null));
        if (server.null !== undefined && !ok) { out.null = null; return; }
        out.null = {
            html: P('Nullkohad on kohad, kus graafik lõikab x-telge, st $f(x) = 0$:') + M(fTex + ' = 0') + z.lines.join('') +
                P('<b>Vastus:</b> ' + (z.roots.length ? I(rootList(z.roots)) : 'nullkohti ei ole')),
            vastus: z.roots.length ? I(rootList(z.roots)) : 'nullkohti ei ole'
        };
    });
    safe('tuletis', () => {
        td = selgitaTuletis(f, 'f(x)', "f'(x)");
        D1 = x => evalAst(td.ast, x);
        out.tuletis = { html: td.lines.join(''), vastus: '$$' + td.res + '$$' };
    });
    safe('krit', () => {
        if (!td) throw new Error('tuletis puudub');
        crit = lahendaNF(td.nf, D1, inDom);
        if (server.krit !== undefined && !sama(crit.roots.map(r => r.val), parseServer(server.krit))) { crit = null; out.krit = null; return; }
        const ans = crit.roots.length ? I(rootList(crit.roots.map((r, i) => r)).replace(/x = /g, 'x = ')) : 'kriitilisi punkte ei ole';
        out.krit = {
            html: P('Kriitilised punktid on kohad, kus puutuja on horisontaalne: $f\'(x) = 0$. Lahendame:') + (isPurePoly(td.nf) ? M(td.res + ' = 0') : '') + crit.lines.join('') + P('<b>Vastus:</b> ' + ans),
            vastus: ans
        };
    });
    safe('tuletis2', () => {
        if (!td) throw new Error('tuletis puudub');
        td2 = selgitaTuletis(td.ast, "f'(x)", "f''(x)");
        D2 = x => evalAst(td2.ast, x);
        out.tuletis2 = { html: P('Teine tuletis on tuletise tuletis. Tuletame lihtsustatud $f\'(x) = ' + td.res + '$ veel kord.') + td2.lines.join(''), vastus: '$$' + td2.res + '$$' };
    });
    safe('kasv', () => {
        if (!crit) throw new Error('krit puudub');
        const pts = mergePoints(crit.roots, dom.breaks || []);
        const rows = signTable(pts, D1);
        out._kasv = { pts, rows };
        const txt = [], short = [];
        rows.forEach(r => {
            const iv = '(' + r.a + ';\\,' + r.b + ')';
            if (!Number.isFinite(F(r.t))) { txt.push(I(iv) + ': ei kuulu määramispiirkonda'); return; }
            const up = r.v > 0;
            txt.push(I(iv) + ': testpunkt $x = ' + numTex(r.t) + '$, $f\'(' + numTex(r.t) + ') \\approx ' + numTex(r.v) + (up ? ' > 0$ ⇒ funktsioon <b>kasvab</b> ↑' : ' < 0$ ⇒ funktsioon <b>kahaneb</b> ↓'));
            short.push(I(iv) + ': ' + (up ? 'kasvab ↑' : 'kahaneb ↓'));
        });
        out.kasv = {
            html: P('Funktsioon kasvab seal, kus $f\'(x) > 0$, ja kahaneb seal, kus $f\'(x) < 0$. Kriitilised punktid' + (dom.breaks && dom.breaks.length ? ' (ja määramispiirkonna piirid)' : '') + ' jagavad arvtelje vahemikeks; igast vahemikust võtame ühe testpunkti ja vaatame $f\'$ märki:') + P(txt.join('<br>')),
            vastus: short.join('<br>')
        };
    });
    safe('ekstr', () => {
        if (!out._kasv) throw new Error('kasv puudub');
        const { pts, rows } = out._kasv, res = [], lines = [];
        crit.roots.forEach(c => {
            if (!inDom(c.val)) return;
            const i = pts.findIndex(p => Math.abs(p.val - c.val) < 1e-9);
            const L = rows[i], R = rows[i + 1];
            const cT = '$x = ' + rootTex(c) + '$';
            if (!L || !R || !L.def || !R.def || !Number.isFinite(F(L.t)) || !Number.isFinite(F(R.t))) { lines.push(P(cT + ': naabervahemik ei kuulu määramispiirkonda, ekstreemumit ei hinnata.')); return; }
            const type = L.v > 0 && R.v < 0 ? 'max' : L.v < 0 && R.v > 0 ? 'min' : null;
            if (!type) { lines.push(P(cT + ': tuletise märk ei muutu (' + (L.v > 0 ? '+, +' : '−, −') + '), seega <b>ekstreemumit pole</b> (funktsioon jätkab samas suunas).')); return; }
            const y = F(c.val), yn = nice(y), sub = astLatex(subst(f, rawNode(c)));
            lines.push(P(cT + ': $f\'$ märk muutub ' + (type === 'max' ? '$+ \\to -$ ⇒ <b>maksimum</b>' : '$- \\to +$ ⇒ <b>miinimum</b>') + '. Arvutame funktsiooni väärtuse:'));
            lines.push(M('f(' + c.tex + ') = ' + sub + (yn.exact && c.rat ? ' = ' + yn.tex : ' \\approx ' + numTex(y))));
            if (D2) { const v2 = D2(c.val); if (Number.isFinite(v2)) lines.push(P('Kontroll teise tuletisega: $f\'\'(' + numTex(c.val) + ') \\approx ' + numTex(v2) + (v2 < 0 ? ' < 0$ ⇒ maksimum ✓' : ' > 0$ ⇒ miinimum ✓'))); }
            res.push({ type, c, y, yn });
        });
        const short = res.map(r => (r.type === 'max' ? 'max: ' : 'min: ') + I('\\left(' + r.c.tex + ';\\ ' + (r.yn.exact && r.c.rat ? r.yn.tex : numTex(r.y)) + '\\right)'));
        out.ekstr = {
            html: P('Ekstreemum on kriitiline punkt, kus $f\'$ <b>muudab märki</b>: $+ \\to -$ annab maksimumi, $- \\to +$ miinimumi (vt märgitabel eelmisest sammust).') + lines.join('') +
                P('<b>Vastus:</b> ' + (short.length ? short.join('; ') : 'ekstreemume ei ole')),
            vastus: short.length ? short.join('<br>') : 'ekstreemume ei ole'
        };
    });
    safe('kaan', () => {
        if (!td2) throw new Error('tuletis2 puudub');
        const inf = lahendaNF(td2.nf, D2, inDom);
        const pts = mergePoints(inf.roots, dom.breaks || []), rows = signTable(pts, D2);
        const cc = [], short = [], pl = [];
        rows.forEach(r => {
            const iv = '(' + r.a + ';\\,' + r.b + ')';
            if (!Number.isFinite(F(r.t))) return;
            const up = r.v > 0;
            cc.push(I(iv) + ': testpunkt $x = ' + numTex(r.t) + '$, $f\'\'(' + numTex(r.t) + ') \\approx ' + numTex(r.v) + (up ? ' > 0$ ⇒ alt kumer ∪' : ' < 0$ ⇒ ülalt kumer ∩'));
            short.push(I(iv) + ': ' + (up ? 'alt kumer ∪' : 'ülalt kumer ∩'));
        });
        inf.roots.forEach(c => {
            const i = pts.findIndex(p => Math.abs(p.val - c.val) < 1e-9), L = rows[i], R = rows[i + 1];
            if (L && R && L.def && R.def && L.v * R.v < 0 && inDom(c.val)) { const y = F(c.val), yn = nice(y); pl.push({ c, y, yn }); }
        });
        const pTxt = pl.map(p => I('\\left(' + p.c.tex + ';\\ ' + (p.yn.exact && p.c.rat ? p.yn.tex : numTex(p.y)) + '\\right)'));
        out.kaan = {
            html: P('Käänupunktis muutub graafiku kumerus. Lahendame $f\'\'(x) = 0$:') + (isPurePoly(td2.nf) ? M(td2.res + ' = 0') : '') + inf.lines.join('') +
                P('Märk igas vahemikus (testpunktiga): $f\'\' > 0$ tähendab alt kumerat ∪, $f\'\' < 0$ ülalt kumerat ∩.') + P(cc.join('<br>')) +
                P('Käänupunkt on see $f\'\' = 0$ lahend, kus $f\'\'$ muudab märki. ' + (pl.length ? 'Y-koordinaat leitakse $f(x)$-ist: ' + pl.map(p => I('f(' + p.c.tex + ') ' + (p.yn.exact && p.c.rat ? '= ' + p.yn.tex : '\\approx ' + numTex(p.y)))).join(', ') + '.' : 'Selles valemis märk ei muutu, seega käänupunkte pole.')) +
                P('<b>Vastus:</b> ' + (pTxt.length ? 'käänupunktid ' + pTxt.join('; ') : 'käänupunkte ei ole')),
            vastus: (pTxt.length ? 'Käänupunktid: ' + pTxt.join('; ') : 'Käänupunktid: puuduvad') + (short.length ? '<br>' + short.join('<br>') : '')
        };
    });
    delete out._kasv;
    return out;
}

// ================= Lehe täitmine (Details) =================
function taidaLahendused(juur) {
    const el = (juur || document).querySelector('[data-lahendaja]');
    if (!el || typeof document === 'undefined') return;
    let L;
    try { L = koosta(el.dataset.valem, { null: el.dataset.null, krit: el.dataset.krit }); }
    catch (err) { if (global.console) console.warn('lahendaja:', err); return; }
    document.querySelectorAll('.lahendus-kast[data-samm]').forEach(b => { const r = L[b.dataset.samm]; if (r && r.html) b.innerHTML = r.html; });
    document.querySelectorAll('.analuus-valued[data-rida]').forEach(b => { const r = L[b.dataset.rida]; if (r && r.vastus) b.innerHTML = r.vastus; });
}

global.lahendaja = { koosta, taidaLahendused };
if (typeof module !== 'undefined') module.exports = global.lahendaja;
})(typeof window !== 'undefined' ? window : globalThis);
