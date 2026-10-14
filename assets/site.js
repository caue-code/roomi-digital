// Aparecer ao rolar: qualquer elemento com .reveal ganha .in quando entra na tela.
(() => {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
})();

// Pré-carregar a próxima página ao passar o mouse/focar no link (onde não há Speculation Rules: Safari, Firefox).
(() => {
  if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) return;
  if (navigator.connection && navigator.connection.saveData) return;
  const feitos = new Set();
  const pre = e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.origin !== location.origin || !/\.html$/.test(a.pathname) || a.pathname === location.pathname || feitos.has(a.pathname)) return;
    feitos.add(a.pathname);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.pathname; document.head.appendChild(l);
  };
  document.addEventListener('pointerover', pre, { passive: true });
  document.addEventListener('focusin', pre);
})();

// Abas genéricas: [data-abas] com [role=tablist] > [role=tab][aria-controls]. Setas trocam de aba.
// Sem JS, todos os painéis aparecem (o HTML não nasce com hidden; quem esconde é este script).
(() => {
  document.querySelectorAll('[data-abas]').forEach(grupo => {
    const lista = grupo.querySelector('[role=tablist]');
    if (!lista || lista.closest('[data-abas]') !== grupo) return;
    const abas = [...lista.querySelectorAll('[role=tab]')];
    const vai = (alvo, foco) => {
      abas.forEach(a => {
        const on = a === alvo;
        a.setAttribute('aria-selected', on ? 'true' : 'false');
        a.tabIndex = on ? 0 : -1;
        const p = document.getElementById(a.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (foco) alvo.focus();
      grupo.dispatchEvent(new CustomEvent('abas:troca', { detail: { aba: alvo } }));
    };
    abas.forEach((a, i) => {
      a.addEventListener('click', () => vai(a));
      a.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        vai(abas[(i + d + abas.length) % abas.length], true);
      });
    });
    vai(abas.find(a => a.getAttribute('aria-selected') === 'true') || abas[0]);
  });
})();

/* ===== 00-calc-conta.js */
;(()=>{
/* A conta da calculadora, num lugar só (14/10): a calculadora da home (07-quem-calc.js) e o passo 3 do formulário
   "Vamos conversar mais" (90-conversa.js) usam esta, e a calculadora antiga (52-calc.js, página privada) também. É o bloco <calc> que era cópia literal do 52-calc.js (v4 = v3 = deck),
   sem mudar nada. Prefixo 00- de propósito: o JS de 00- entra em toda página, sem guarda, e roda ANTES das seções
   (ordem alfabética do montar.mjs), então window.RoomiCalc já existe quando o 07- e o 90- rodam.
   Além da conta: lerTexto (o texto digitado vira número), CAMPOS (os 7 que mudam a conta), faixa (limites de P2_CAMPOS,
   canais em inteiros) e EXEMPLO (o hotel exemplo: padrões de P2_CAMPOS com 250 quartos e R$ 1.500 de diária). */
window.RoomiCalc = (function () {
  // <calc> (cópia de 52-calc.js)
  var P2_PREM_PADRAO = {
    cons:  { occ: 5, dm: 6, dir: 10 },
    prov:  { occ: 7, dm: 7, dir: 20 },
    forte: { occ: 8, dm: 8, dir: 25 }
  };
  var P2_PREM_LIM = { occ: 30, dm: 50, dir: 60 };
  var P2_CAMPOS = {
    quartos: { min: 10,  max: 800,  padrao: 120 },
    occ:     { min: 20,  max: 95,   padrao: 60 },
    dm:      { min: 300, max: 5000, padrao: 900 },
    comOta:  { min: 5,   max: 30,   padrao: 17 },
    comOp:   { min: 5,   max: 30,   padrao: 12 },
    direta:  { min: 0,   max: 100,  padrao: 25 },
    otas:    { min: 0,   max: 100,  padrao: 45 },
    oper:    { min: 0,   max: 100,  padrao: 20 },
    outros:  { min: 0,   max: 100,  padrao: 10 },
    mult:    { min: 50,  max: 150,  padrao: 100 }
  };
  var P2_OCC_TETO = 95;

  function p2Calc(h, P) {
    var base = h.quartos * 365 * (h.occ / 100) * h.dm;
    var out = { base: base, cen: {}, max: 0 };
    Object.keys(P).forEach(function (k) {
      var c = P[k];
      var occ1 = Math.min(P2_OCC_TETO, h.occ + c.occ);
      var gOcc = h.quartos * 365 * ((occ1 - h.occ) / 100) * h.dm;
      var gDm = h.quartos * 365 * (occ1 / 100) * h.dm * (c.dm / 100);
      var rec1 = base + gOcc + gDm;
      var fonte = h.otas + h.oper;
      var mig = Math.min(c.dir, fonte);
      var migOta = fonte > 0 ? mig * h.otas / fonte : 0;
      var migOp = fonte > 0 ? mig * h.oper / fonte : 0;
      var gCom = rec1 * ((migOta / 100) * (h.comOta / 100) + (migOp / 100) * (h.comOp / 100));
      var total = gOcc + gDm + gCom;
      out.cen[k] = { occ: gOcc, dm: gDm, com: gCom, total: total, pct: base > 0 ? total / base : 0 };
      out.max = Math.max(out.max, gOcc, gDm, gCom);
    });
    return out;
  }
  function p2Arred(v) { return Math.round(v * 10) / 10; }
  function p2Efetivas(base, mult) {
    var P = {};
    Object.keys(base).forEach(function (c) {
      P[c] = {};
      Object.keys(base[c]).forEach(function (f) { P[c][f] = Math.min(P2_PREM_LIM[f], p2Arred(base[c][f] * mult / 100)); });
    });
    return P;
  }
  function p2Num(v, dec) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function p2Partes(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return { n: p2Num(v / 1e9, 1), u: 'bi' };
    if (a >= 1e6 || Math.round(a / 1e3) >= 1000) return { n: p2Num(v / 1e6, a >= 1e8 ? 0 : 1), u: 'mi' };
    if (a >= 1e3) return { n: p2Num(Math.round(v / 1e3), 0), u: 'mil' };
    return { n: p2Num(Math.round(v), 0), u: '' };
  }
  function p2Brl(v) {
    var p = p2Partes(v);
    return 'R$ ' + p.n + (p.u ? ' ' + p.u : '');
  }
  function p2Campo(k, v) {
    if (k === 'dm') return p2Num(Math.round(v), 0);
    v = p2Arred(v);
    return p2Num(v, v % 1 ? 1 : 0);
  }
  // </calc>

  // o que era do 07-quem-calc.js e o passo 3 também precisa
  var CAMPOS = ['quartos', 'occ', 'dm', 'otas', 'comOta', 'oper', 'comOp'];
  var CANAIS = ['otas', 'oper'];
  function lerTexto(t0) {
    var t = String(t0).replace(/[^\d,.]/g, '');
    if (/,/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    if (!t) return NaN;
    return parseFloat(t);
  }
  // NaN = vazio. Faixas de P2_CAMPOS; canais em inteiros (como o aplicaMix do v4).
  function faixa(k, v) {
    if (isNaN(v)) return NaN;
    if (CANAIS.indexOf(k) >= 0) v = Math.round(v);
    var c = P2_CAMPOS[k];
    return Math.min(c.max, Math.max(c.min, v));
  }
  var EXEMPLO = {};
  CAMPOS.forEach(function (k) { EXEMPLO[k] = P2_CAMPOS[k].padrao; });
  EXEMPLO.quartos = 250;
  EXEMPLO.dm = 1500;

  return {
    P2_PREM_PADRAO: P2_PREM_PADRAO, P2_PREM_LIM: P2_PREM_LIM, P2_CAMPOS: P2_CAMPOS, P2_OCC_TETO: P2_OCC_TETO,
    p2Calc: p2Calc, p2Arred: p2Arred, p2Efetivas: p2Efetivas, p2Num: p2Num, p2Partes: p2Partes, p2Brl: p2Brl, p2Campo: p2Campo,
    CAMPOS: CAMPOS, CANAIS: CANAIS, lerTexto: lerTexto, faixa: faixa, EXEMPLO: EXEMPLO,
    // as premissas padrão (multiplicador 100%), as que a home e o formulário usam
    P: p2Efetivas(P2_PREM_PADRAO, P2_CAMPOS.mult.padrao)
  };
})();

})();
/* ===== 00-cta.js */
;(()=>{
// Linha de contato no pé de cada quadro (pedido do Cauê): o botão de contato fica só no quadro 1 e no menu;
// nos outros quadros, uma linha fina embaixo com o link que abre o formulário. Fica de fora: o quadro 1 (.ab ou .ac), a faixa de
// resultados (é um <a>, não <section>) e o quadro de contato (#contato), que já é o fecho da página.
// Só nas páginas do site novo (o espaço embaixo de cada quadro é reservado pelo 00-cta.css, seção por seção).
// Roda no DOMContentLoaded, depois do 00-ponto1.js, que leva o cronograma para dentro do quadro 3 na home:
// lá o quadro 3 ganha uma linha só.
if (document.body.matches('.pg-home,.pg-quadros,.pg-roomi-360,.pg-verticais,.pg-cubo-materiais,.pg-sobre')) {
  const poe = () => {
    // .ac é o quadro 1 novo da home (01-abertura-cubo): a linha cobria a legenda do palco em telas baixas
    document.querySelectorAll('main > section:not(.ab):not(.ac):not(#contato)').forEach(s => {
      if (s.querySelector(':scope > .cta-pe')) return;
      const p = document.createElement('p');
      p.className = 'cta-pe';
      // o <span> segura o texto e o link juntos (no desktop a linha é flex, e flex come o espaço entre texto e link)
      // 14/10: o link abre o formulário "Vamos conversar mais" (90-conversa); sem contato direto no site
      p.innerHTML = '<span>Vamos acelerar seus resultados? Conte como está o seu hotel. <a href="mailto:marketing@roomi.digital?subject=Vamos%20conversar%20mais" data-conversa>Vamos conversar mais!</a></span>';
      s.classList.add('tem-cta');
      s.appendChild(p);
      // Tab no link: o navegador só rolava o bastante pra mostrar a linha e a página parava entre dois quadros; no
      // desktop, o quadro de uma tela fica inteiro na tela (o pé dele no pé da tela)
      p.addEventListener('focusin', () => {
        if (!matchMedia('(min-width:1024px) and (min-height:640px)').matches || s.offsetHeight > innerHeight + 2) return;
        const r = s.getBoundingClientRect();
        if (Math.abs(r.top) <= 2) return;
        document.dispatchEvent(new Event('nv:segura')); // o menu fica recolhido na viagem (00-nav.js)
        s.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      });
    });
  };
  if (document.readyState === 'complete') poe();
  else document.addEventListener('DOMContentLoaded', poe, { once: true });
}

})();
/* ===== 00-nav.js */
;(()=>{
const nv = document.querySelector('.nv');
if (nv) {
  const body = document.body.classList;
  const links = [...nv.querySelectorAll('.nv-links a')];

  // página atual: marca o link pela classe do body (pg-home, pg-roomi-360 etc.)
  links.forEach(a => { if (a.dataset.pg && body.contains('pg-' + a.dataset.pg)) a.setAttribute('aria-current', 'page'); });

  // fundo creme depois de rolar um pouco; some ao descer e volta ao subir. Vale em toda página com o menu: antes só nas
  // páginas novas (com .pt); na Privacidade o menu fixo cobria o texto onde a página parava depois de um PageUp
  const esconde = true;
  let ultimo = scrollY, ancora = 0;
  // home: no desktop o quadro 1 (.ac) tem menu próprio; o fixo fica recolhido (e fora do Tab) até a página rolar mais
  // que a altura do quadro. Até 900px o quadro 1 não mostra o menu dele (01-abertura-cubo.css) e o fixo fica desde o topo
  const ac = body.contains('pg-home') ? document.querySelector('main > .ac') : null;
  const acTemMenu = matchMedia('(min-width: 901px)');
  const onScroll = () => {
    const y = scrollY;
    if (ac) nv.classList.toggle('is-topo-home', acTemMenu.matches && y < ac.offsetHeight);
    nv.classList.toggle('is-scrolled', y > 12);
    // durante uma viagem de âncora ou de teclado (ancora), fica recolhido até perto do topo: um PageUp que parava em
    // y=100 deixava o menu por cima da migalha
    if (esconde) nv.classList.toggle('is-oculto', (y > 140 && y > ultimo) || (y > 12 && performance.now() < ancora));
    ultimo = y;
  };
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  if (ac) { acTemMenu.addEventListener('change', onScroll); addEventListener('resize', onScroll, { passive: true }); }
  // âncora (#biblioteca, #produtos, link de outra página com #): o quadro pousa no topo da tela, então o menu fica
  // recolhido durante a viagem, mesmo quando ela sobe; volta assim que a pessoa rolar pra cima de novo
  if (esconde) {
    const segura = () => { ancora = performance.now() + 1600; if (scrollY > 140) nv.classList.add('is-oculto'); };
    // alvo dentro de um quadro de uma tela (ex.: a bio de um sócio): no desktop o quadro inteiro pousa no topo, em vez
    // de o alvo pousar lá e o quadro ficar cortado. Aba ([role=tabpanel]) fica com o JS da seção.
    const quadroTela = matchMedia('(min-width:1024px) and (min-height:640px)');
    const doHash = h => { try { return h.length > 1 ? document.getElementById(decodeURIComponent(h.slice(1))) : null; } catch (_) { return null; } };
    const quadroDe = alvo => {
      const q = alvo && alvo.closest('main > section');
      return quadroTela.matches && q && q !== alvo && !alvo.closest('[role=tabpanel]') && q.offsetHeight <= innerHeight + 2 ? q : null;
    };
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || a.hash.length < 2 || a.pathname !== location.pathname || nv.contains(a)) return;
      segura();
      const alvo = doHash(a.hash), q = quadroDe(alvo);
      if (!q || e.defaultPrevented) return;
      e.preventDefault();
      if (location.hash !== a.hash) history.pushState(null, '', a.hash);
      q.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      if (!alvo.hasAttribute('tabindex')) alvo.tabIndex = -1;
      alvo.focus({ preventScroll: true });
    });
    addEventListener('hashchange', segura);
    document.addEventListener('nv:segura', segura); // pedido de outra seção ao levar um quadro pro topo
    // teclado (PageUp, PageDown, espaço, setas): a página anda uma tela por vez e o menu, voltando na subida, cobria o
    // título do quadro onde ela parava; aqui ele fica recolhido (volta com a rolagem pra cima, o Tab ou o Home)
    document.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || nv.classList.contains('is-open')) return;
      if (!/^(PageUp|PageDown|ArrowUp|ArrowDown| )$/.test(e.key)) return;
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable],[role=tab],[role=slider],[role=listbox]') || (e.key === ' ' && e.target.closest && e.target.closest('a,button'))) return;
      segura();
    });
    addEventListener('scrollend', () => { ancora = 0; });
    // chegando de outra página com # : depois da carga (fontes e fotos mudam alturas), o alvo ou o quadro dele assenta
    if (location.hash.length > 1) {
      segura();
      addEventListener('load', () => {
        segura();
        const alvo = doHash(location.hash);
        if (alvo && !alvo.closest('[role=tabpanel]') && !/^#tema-/.test(location.hash)) (quadroDe(alvo) || alvo).scrollIntoView({ block: 'start', behavior: 'instant' });
      }, { once: true });
    }
  }

  const btn = nv.querySelector('.nv-burger'), menu = nv.querySelector('.nv-menu');
  if (btn && menu) {
    const setOpen = open => {
      nv.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      if (open) { const a = menu.querySelector('a'); if (a) a.focus(); }
    };
    btn.addEventListener('click', () => setOpen(!nv.classList.contains('is-open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (!nv.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setOpen(false); btn.focus(); return; }
      // menu aberto: o Tab roda entre o botão e os links do menu (a página por baixo está coberta pelo véu)
      if (e.key === 'Tab') {
        const alvos = [btn, ...menu.querySelectorAll('a[href],button')], i = alvos.indexOf(document.activeElement);
        const vai = e.shiftKey ? (i <= 0 ? alvos.length - 1 : -1) : (i === alvos.length - 1 || i < 0 ? 0 : -1);
        if (vai > -1) { e.preventDefault(); alvos[vai].focus(); }
      }
    });
    document.addEventListener('click', e => { if (nv.classList.contains('is-open') && !nv.contains(e.target)) setOpen(false); });
    matchMedia('(max-width: 1080px)').addEventListener('change', () => setOpen(false));
  }
}

})();
/* ===== 00-nivel.js */
;(()=>{
// A régua "ao cubo" (00-nivel): roda em toda página. Quando cada quadro entra na tela: o título sobe palavra por
// palavra, as peças chegam escalonadas e os números grandes contam do zero. Movimento reduzido ou sem
// IntersectionObserver: nada se esconde. O quadro de abertura (.ac) tem a própria coreografia e fica de fora.
(() => {
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quadros = [...document.querySelectorAll('main > section:not(.ac), main > header')];
  if (!quadros.length) return;

  // palavras do título: cada palavra vira <span class="nv-w"><i>palavra</i></span>; espaço comum separa, &nbsp; não
  const embrulha = h => {
    let i = 0;
    const anda = no => {
      [...no.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const partes = n.textContent.split(/( +)/);
          if (partes.length === 1 && !n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          partes.forEach(p => {
            if (!p) return;
            if (/^ +$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const w = document.createElement('span'); w.className = 'nv-w'; w.style.setProperty('--i', i++);
            const t = document.createElement('i'); t.textContent = p; w.appendChild(t); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('nv-w')) anda(n);
      });
    };
    anda(h);
  };

  // peças que chegam escalonadas, por quadro
  const PECAS = '.kicker,[class$="-lead"],.cl-nums > div,.cm-meia,.pd-grupo,.qk-meia,.fn-vis,.cr-peca,.en-trilho,.pq-quadro,.pq-chave,.pq-dica,.fn-acoes,.pd-lado > *,.seta,.pt-ir,.pt-resumo,.pt-migalha,.ta-fatos,.ta-painel,.tb-tiles,.tf-nav,.tf-corpo,.te-grade,.s1-in > *,.vt-abas,.vt-paineis,.c1-in > *,.c2-in > *';

  // números grandes contam do zero (31 · +5.000 · R$ 700 mi · 24): mantém o que vem antes e depois dos dígitos
  const conta = el => {
    const txt = el.textContent, m = txt.match(/(\d[\d.]*)/);
    if (!m) return;
    const fim = +m[1].replace(/\./g, ''), pre = txt.slice(0, m.index), pos = txt.slice(m.index + m[1].length);
    const fmt = n => n.toLocaleString('pt-BR');
    const t0 = performance.now(), dur = 1300;
    const passo = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = pre + fmt(Math.round(fim * (1 - Math.pow(1 - k, 3)))) + pos; if (k < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  };

  if (calmo || !('IntersectionObserver' in window)) { quadros.forEach(q => q.classList.add('nv-on')); return; }

  quadros.forEach(q => {
    q.querySelectorAll(':scope h2:not(.sr-only), :scope h1').forEach(embrulha);
    let i = 0;
    q.querySelectorAll(PECAS).forEach(el => { if (el.closest('[data-nv]') && el.closest('[data-nv]') !== el) return; el.dataset.nv = ''; el.style.setProperty('--i', i++); });
  });
  const liga = q => {
    if (q.classList.contains('nv-on')) return;
    q.classList.add('nv-on');
    q.querySelectorAll('.cl-nums dd, .ta-fatos dd, .s1-nums dd').forEach(conta);
    io.unobserve(q);
  };
  // o quadro liga quando o topo dele passa de 85% da altura da tela, qualquer que seja a altura do quadro (com um
  // limiar em % do quadro, um quadro de 1.000 a 1.900px no celular ficava em branco com 250px dele já na tela)
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) liga(e.target); }), { threshold: 0, rootMargin: '0px 0px -15% 0px' });
  quadros.forEach(q => io.observe(q));
  // no fim da página, um quadro baixo que nunca chega aos 85% liga assim que aparece
  const noFim = () => { if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) quadros.forEach(q => { if (q.getBoundingClientRect().top < innerHeight) liga(q); }); };
  addEventListener('scrollend', noFim, { passive: true });
  addEventListener('load', noFim, { once: true });
})();

})();
/* ===== 00-ponto1.js */
;(()=>{
// Versão .1 dos quadros (só na página quadros-ponto1): o cronograma (quadro 4) deixa de ser um quadro solto e vira
// o 5º cartão da sanfona do quadro 3. Este arquivo roda antes do 03-entregas.js e do 04-cronograma.js: cria o
// cartão e move a seção #cronograma inteira para dentro dele (ela leva o data-secao, então o JS dela continua rodando).
// O 03-entregas.js e o 04-cronograma.js tratam o cartão "c" quando o body tem .pg-quadros-ponto1.
// Em qualquer outra página, sai na primeira linha.
if (document.body.matches('.pg-home,.pg-quadros,.pg-quadros-ponto1')) {
  const trilho = document.querySelector('.en-trilho'), cr = document.querySelector('#cronograma');
  if (trilho && cr) {
    const f = document.createElement('article');
    f.className = 'en-f p1-cr-f';
    f.dataset.f = 'c';
    f.setAttribute('role', 'tab');
    f.setAttribute('aria-selected', 'false');
    f.setAttribute('aria-label', 'Cronograma do projeto, 24 semanas');
    f.tabIndex = 0;
    f.innerHTML = '<div class="en-aba"><b class="p1-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18M7 13.5h5M10 17h7"/></svg></b><span>Cronograma do projeto</span><small>24 semanas</small><i class="en-prog"></i></div><div class="en-corpo p1-cr-corpo"></div>';
    f.querySelector('.p1-cr-corpo').appendChild(cr);
    trilho.appendChild(f);
    // legenda de "quem": no cartão a coluna Quem vira só o ponto, e o nome vai para a legenda
    const leg = cr.querySelector('.cr-leg');
    if (leg) leg.insertAdjacentHTML('beforeend', '<li class="p1-leg-quem"><i class="p1-q" aria-hidden="true"></i>Roomi</li><li class="p1-leg-quem"><i class="p1-q p1-q2" aria-hidden="true"></i>Roomi + hotel</li>');
  }
}

})();
/* ===== 01-abertura-cubo.js */
;(()=>{if(!document.querySelector('[data-secao="01-abertura-cubo"]'))return;
// Amostra "ao cubo" · quadro de abertura. Mesmo filme do 01-abertura.js (4 cenas, ?cena=1..4 para print), mais:
// a entrada coreografada (classe .pronto depois das fontes carregarem), a profundidade ao mover o mouse (o filme
// inclina, a ilustração e o brilho do palco acompanham). v8: os números da faixa não contam mais (valor final parado).
// v7: o filme ganhou câmera (a cena sai pela esquerda, a próxima chega pela direita, e a câmera aproxima devagar
// enquanto a cena está no ar) e um gesto por cena, sem tempo morto: 1 os itens se confirmam e a entrega acende;
// 2 o cursor pactua cada meta; 3 o cursor liga cada tarefa; 4 as barras sobem e uma faixa lê o gráfico mês a mês
// até setembro (+60%). Loop sem salto: as barrinhas do topo esvaziam deslizando. Mouse em cima ou o botão = pausa;
// fora da tela o relógio para de vez.
// Polimento v7: o filme e a contagem da faixa só começam depois da entrada (antes o palco aparecia com a janela vazia
// e os números contavam na fonte provisória); os gestos andam no relógio do filme, então a pausa (mouse, botão, fora
// da tela, aba escondida) congela o gesto junto; o toque no celular não pausa (só o mouse); fora da tela as animações
// infinitas do quadro param (.fora).
const q = new URLSearchParams(location.search);
const ac = document.querySelector('.ac');
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. entrada: espera as fontes (senão o título sobe numa fonte e troca no meio)
let soltaPronto; const pronto = new Promise(r => { soltaPronto = r; });
const liga = () => { if (ac.classList.contains('pronto')) return; ac.classList.add('pronto'); soltaPronto(); };
if (calmo || q.has('cena')) liga();
else if (document.fonts && document.fonts.ready) document.fonts.ready.then(liga, liga), setTimeout(liga, 1500);
else liga();

// 2. os números da faixa: v8, parados no valor final que está no HTML (a contagem a partir de +0% saiu)

// 3. o filme
const cenas = [...ac.querySelectorAll('.ab-cena')];
const barras = [...ac.querySelectorAll('.ab-barras i')];
const barrasBox = ac.querySelector('.ab-barras'), cabBox = ac.querySelector('.ab-cab');
const cab = { n: ac.querySelector('.ab-fase-n'), t: ac.querySelector('.ab-fase-t'), s: ac.querySelector('.ab-fase-s'), q: ac.querySelector('.ab-quem') };
const live = ac.querySelector('.ac-live');
const DUR = [5200, 5400, 5600, 6600];
const fixa = q.get('cena');
const filme = !fixa && !calmo;
let atual = 0, t0 = 0, rodando = true, fila = [], tSai = 0, el = 0, tCab = 0;
// os gestos andam no relógio do filme (el = ms desde que a cena entrou): param e voltam junto com ele
const T = (ms, f) => fila.push({ em: el + ms, f });
const roda = () => { for (let k = 0; k < fila.length;) { const x = fila[k]; if (x.em <= el) { fila.splice(k, 1); x.f(); } else k++; } };
ac.querySelectorAll('.ab-graf div').forEach((d, i) => d.style.setProperty('--d', (i * 0.07).toFixed(2)));
const tarefas = cenas[2].querySelectorAll('.ab-tarefas li');

// posição de um elemento dentro da cena, sem as transformações (a tela inclina e a câmera aproxima)
const pos = (el, c) => { let x = 0, y = 0, e = el; while (e && e !== c) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
// o cursor entra pelo canto de baixo, vai a cada alvo e clica; `ao` roda no clique
function clica(c, alvos, ini, passo, ao, fx = .5, fy = .5) {
  const cur = c.querySelector('.ab-cursor'); if (!cur) return;
  alvos.forEach((el, i) => T(ini + i * passo, () => {
    const p = pos(el, c);
    cur.style.setProperty('--cx', (p.x + p.w * fx - 11).toFixed(0) + 'px');
    cur.style.setProperty('--cy', (p.y + p.h * fy - 11).toFixed(0) + 'px');
    T(560, () => { cur.classList.add('clic'); ao(el, i); });
    T(760, () => cur.classList.remove('clic'));
  }));
}
// o gesto de cada cena
const GESTO = [
  c => T(2900, () => c.querySelector('.ab-achado').classList.add('brilha')),
  c => { clica(c, [...c.querySelectorAll('.ab-metas div')], 650, 760, el => el.classList.add('ok'), .78, .55); T(3000, () => c.querySelector('.ab-achado').classList.add('brilha')); },
  c => clica(c, [...tarefas].map(li => li.querySelector('i')), 700, 1050, (el, i) => tarefas[i].classList.add(i === 3 ? 'curso' : 'ok')),
  c => {
    const graf = c.querySelector('.ab-graf'), meses = [...graf.children];
    T(1500, () => graf.classList.add('lendo'));
    meses.forEach((m, k) => T(1500 + k * 380, () => { graf.style.setProperty('--o', k); meses.forEach(x => x.classList.toggle('olho', x === m)); if (k === meses.length - 1) m.classList.add('chega'); }));
    T(1500 + meses.length * 380 + 1100, () => graf.classList.remove('lendo'));
  },
];
// a cena que saiu volta ao começo (fora da vista): sem estado velho aparecendo quando ela entrar de novo
function limpa(c) {
  c.classList.remove('on', 'sai');
  c.querySelectorAll('.ok,.curso,.brilha,.olho,.chega,.lendo').forEach(el => el.classList.remove('ok', 'curso', 'brilha', 'olho', 'chega', 'lendo'));
  const cur = c.querySelector('.ab-cursor');
  if (cur) { cur.style.transition = 'none'; cur.style.removeProperty('--cx'); cur.style.removeProperty('--cy'); void cur.offsetWidth; cur.style.transition = ''; }
}
function mostra(i) {
  fila = [];
  const ant = atual;
  atual = i; t0 = performance.now(); el = 0;
  if (filme) {
    clearTimeout(tSai);
    cenas.forEach((c, k) => { if (k !== i && k !== ant) limpa(c); });
    if (ant !== i) { cenas[ant].classList.add('sai'); tSai = setTimeout(() => limpa(cenas[ant]), 900); }
    cenas[i].classList.remove('sai'); cenas[i].style.setProperty('--dur', DUR[i] + 'ms');
    // na volta do 04 pro 01 as barrinhas esvaziam deslizando
    if (i === 0 && ant === cenas.length - 1) { barrasBox.classList.add('volta'); T(800, () => barrasBox.classList.remove('volta')); }
  }
  cenas.forEach((c, k) => { if (k === i) c.classList.add('on'); else if (!filme) c.classList.remove('on'); });
  const c = cenas[i];
  const poeCab = () => {
    cab.n.textContent = String(i + 1).padStart(2, '0');
    cab.t.textContent = c.dataset.t; cab.s.textContent = c.dataset.s; cab.q.textContent = c.dataset.q;
  };
  // o cabeçalho: o velho sai subindo, o novo entra rolando (na 1ª entrada o texto já é o certo, só entra)
  clearTimeout(tCab);
  if (filme && cab.t.textContent !== c.dataset.t) {
    cabBox.classList.remove('troca'); cabBox.classList.add('cab-sai');
    tCab = setTimeout(() => { poeCab(); cabBox.classList.remove('cab-sai'); void cabBox.offsetWidth; cabBox.classList.add('troca'); }, 170);
  } else {
    poeCab(); cabBox.classList.remove('cab-sai');
    if (filme) { cabBox.classList.remove('troca'); void cabBox.offsetWidth; cabBox.classList.add('troca'); }
  }
  barras.forEach((b, k) => b.style.setProperty('--p', k < i ? 1 : 0));
  if (filme) GESTO[i](c);
}
if (!filme) {
  mostra(fixa ? Math.min(3, Math.max(0, +fixa - 1)) : 3);
  barras.forEach((b, k) => b.style.setProperty('--p', k <= atual ? 1 : 0));
  if (atual === 2) tarefas.forEach((li, k) => li.classList.add(k === 3 ? 'curso' : 'ok'));
  if (atual === 1) cenas[1].querySelectorAll('.ab-metas div').forEach(d => d.classList.add('ok'));
  if (live) live.querySelector('span').textContent = 'Roomi 360';
} else {
  ac.classList.add('filme');
  // o relógio: fora da tela ele para de vez (nenhum quadro de animação gasto) e volta do ponto onde estava
  let emTela = true, visivel = true, raf = 0, comecou = false;
  const tique = t => {
    raf = 0;
    if (rodando) {
      el = t - t0;
      const k = el / DUR[atual];
      barras[atual].style.setProperty('--p', Math.min(1, k).toFixed(3));
      if (k >= 1) mostra((atual + 1) % cenas.length); else roda();
    } else t0 = t - el;
    if (visivel && !motivo.botao) raf = requestAnimationFrame(tique);
  };
  const retoma = () => { if (comecou && visivel && !motivo.botao && !raf) { t0 = performance.now() - el; raf = requestAnimationFrame(tique); } };
  // o que pausa (igual nos palcos com filme): o mouse em cima do filme e o botão de pausa; fora da tela, parado
  const tela = ac.querySelector('.ac-tela'), botao = ac.querySelector('.palco-pausa');
  const motivo = { mouse: false, botao: false };
  const marca = () => {
    const p = motivo.mouse || motivo.botao;
    rodando = visivel && !p;
    ac.classList.toggle('parado', p);
    ac.classList.toggle('fora', !visivel);
    if (botao) botao.setAttribute('aria-pressed', motivo.botao ? 'true' : 'false');
    if (live) { live.classList.toggle('pausado', p); live.querySelector('span').textContent = !p ? 'Roomi 360 rodando' : motivo.mouse && !motivo.botao ? 'Pausado · passe o mouse fora pra seguir' : 'Pausado'; }
  };
  const ve = () => { visivel = emTela && !document.hidden; marca(); retoma(); };
  new IntersectionObserver(([e]) => { emTela = e.isIntersecting; ve(); }, { rootMargin: '-2px 0px' }).observe(ac); // -2px: quadro só encostado na borda da tela conta como fora
  document.addEventListener('visibilitychange', ve);
  // só o mouse pausa: no celular o toque (que o navegador também anuncia como "entrou") não prende o filme
  tela.addEventListener('pointerenter', e => { if (e.pointerType === 'touch') return; motivo.mouse = true; marca(); });
  tela.addEventListener('pointerleave', e => { if (e.pointerType === 'touch') return; motivo.mouse = false; marca(); });
  if (botao) { botao.hidden = false; botao.addEventListener('click', () => { motivo.botao = !motivo.botao; marca(); retoma(); }); }
  // a 1ª cena entra junto com o palco (que aparece .35 s depois do .pronto), não antes, com a janela ainda invisível
  pronto.then(() => setTimeout(() => {
    comecou = true; mostra(0); retoma();
    barras.forEach((b, k) => { b.style.cursor = 'pointer'; b.addEventListener('click', () => mostra(k)); });
  }, 350));
}

// 4. profundidade: o mouse inclina o filme, move a ilustração e o brilho do palco (só com mouse de verdade)
if (!calmo && matchMedia('(hover:hover) and (pointer:fine)').matches) {
  const palco = ac.querySelector('.ac-palco-in'), tela = ac.querySelector('.ac-tela'), cena = ac.querySelector('.ac-cena'), glow = ac.querySelector('.ac-glow');
  let alvo = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
  const anima = () => {
    cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
    // --ty/--tx (não --ry/--rx): assim o :hover do CSS ainda aplaina o filme quando o mouse pousa nele
    tela.style.setProperty('--ty', (-6 + cur.x * 5).toFixed(2) + 'deg');
    tela.style.setProperty('--tx', (4 - cur.y * 4).toFixed(2) + 'deg');
    cena.style.setProperty('--cx', (-cur.x * 12).toFixed(1) + 'px');
    cena.style.setProperty('--cy', (-cur.y * 8).toFixed(1) + 'px');
    glow.style.setProperty('--mx', (78 + cur.x * 22).toFixed(1) + '%');
    glow.style.setProperty('--my', (18 + cur.y * 22).toFixed(1) + '%');
    if (Math.abs(alvo.x - cur.x) > .002 || Math.abs(alvo.y - cur.y) > .002) raf = requestAnimationFrame(anima); else raf = 0;
  };
  // a caixa do palco é lida uma vez e guardada (rolar ou mudar a janela pede de novo): sem ler layout a cada movimento
  let caixa = null; const esquece = () => { caixa = null; };
  addEventListener('scroll', esquece, { passive: true }); addEventListener('resize', esquece, { passive: true });
  const move = e => {
    const r = caixa || (caixa = palco.getBoundingClientRect());
    alvo = { x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2)), y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2)) };
    if (!raf) raf = requestAnimationFrame(anima);
  };
  ac.querySelector('.ac-meio').addEventListener('pointermove', move, { passive: true });
  ac.querySelector('.ac-meio').addEventListener('pointerleave', () => { alvo = { x: 0, y: 0 }; if (!raf) raf = requestAnimationFrame(anima); });
}

})();
/* ===== 02-clientes.js */
;(()=>{if(!document.querySelector('[data-secao="02-clientes"]'))return;
// Quadro 2 · os nossos clientes: os estados com cliente acendem um a um quando o mapa entra na tela (só uma vez).
// Sem JS ou com movimento reduzido, os estados já aparecem em laranja.
// v7: depois de acesos, um pulso passa de estado em estado enquanto o mapa está na tela (pausa com o mouse em cima,
// e aí o mouse inclina o mapa de leve).
const cl = document.querySelector('.cl');
if (cl) {
  const mapa = cl.querySelector('.cl-mapa');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mapa && !calmo && 'IntersectionObserver' in window) {
    cl.classList.add('is-js');
    const ufs = [...cl.querySelectorAll('.cl-ufs path.cl-on')].sort((a, b) => (+a.style.getPropertyValue('--i') || 0) - (+b.style.getPropertyValue('--i') || 0));
    let k = -1, timer = 0, visto = false, sobre = false;
    const pulsa = () => {
      ufs.forEach(p => p.classList.remove('cl-pulso'));
      if (visto && !sobre && ufs.length) { k = (k + 1) % ufs.length; ufs[k].classList.add('cl-pulso'); }
      timer = visto ? setTimeout(pulsa, 1500) : 0; // fora da tela o pulso para (volta quando o mapa reaparece)
    };
    const io = new IntersectionObserver(es => es.forEach(en => {
      visto = en.isIntersecting && en.intersectionRatio >= 0.34;
      if (visto && !cl.classList.contains('is-viva')) { cl.classList.add('is-viva'); clearTimeout(timer); timer = setTimeout(pulsa, 1800); }
      else if (visto && !timer) timer = setTimeout(pulsa, 300);
    }), { threshold: 0.35 });
    io.observe(mapa);

    // profundidade: o mapa inclina com o mouse (só com mouse de verdade)
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      let alvo = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
      const anima = () => {
        cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
        mapa.style.setProperty('--ry', (cur.x * 6).toFixed(2) + 'deg');
        mapa.style.setProperty('--rx', (-cur.y * 5).toFixed(2) + 'deg');
        raf = Math.abs(alvo.x - cur.x) > .002 || Math.abs(alvo.y - cur.y) > .002 ? requestAnimationFrame(anima) : 0;
      };
      mapa.addEventListener('pointermove', e => {
        const r = mapa.getBoundingClientRect();
        alvo = { x: ((e.clientX - r.left) / r.width - .5) * 2, y: ((e.clientY - r.top) / r.height - .5) * 2 };
        if (!raf) raf = requestAnimationFrame(anima);
      }, { passive: true });
      mapa.addEventListener('pointerenter', () => { sobre = true; ufs.forEach(p => p.classList.remove('cl-pulso')); });
      mapa.addEventListener('pointerleave', () => { sobre = false; alvo = { x: 0, y: 0 }; if (!raf) raf = requestAnimationFrame(anima); });
    }
  }
}

})();
/* ===== 025-por-que.js */
;(()=>{if(!document.querySelector('[data-secao="025-por-que"]'))return;
// Quadro 2.5 · por que contratar a Roomi: desenha as linhas post-it → solução (desktop), acende ligações no
// mouse, no foco e no toque, alterna as duas linguagens (chave) e anima a entrada uma vez.
// Sem JS: as duas faces e o nome da solução ficam escritos em cada post-it.
const pq = document.querySelector('.pq');
if (!pq) return;
const quadro = pq.querySelector('.pq-quadro');
const notasBox = pq.querySelector('.pq-notas');
const solsBox = pq.querySelector('.pq-sols');
const svg = pq.querySelector('.pq-fios');
if (!quadro || !notasBox || !solsBox || !svg) return;

const notas = [...pq.querySelectorAll('.pq-nota')];
const sols = [...pq.querySelectorAll('.pq-sol')];
const ordem = sols.map(s => s.dataset.sol);
// data-para: soluções obrigatórias (linha cheia); data-opc: opcionais, "pode fazer parte ou não" (linha tracejada)
const lista = v => (v || '').split(/\s+/).filter(s => ordem.includes(s));
const ligacoes = n => [...lista(n.dataset.para).map(s => ({ s, opc: false })), ...lista(n.dataset.opc).map(s => ({ s, opc: true }))];
const destinos = n => ligacoes(n).map(l => l.s);
const leg = pq.querySelector('.pq-leg');
const NS = 'http://www.w3.org/2000/svg';
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desk = matchMedia('(min-width: 901px)');

pq.classList.add('is-js');
sols.forEach((s, k) => s.style.setProperty('--k', k));

// ---- chave: como você fala / como o mercado chama
const chave = pq.querySelector('.pq-chave');
if (chave) {
  chave.hidden = false;
  chave.addEventListener('click', e => {
    const bt = e.target.closest('.pq-bt');
    if (!bt) return;
    const tec = bt.dataset.modo === 'tec';
    pq.classList.toggle('is-tec', tec);
    chave.querySelectorAll('.pq-bt').forEach(b => b.setAttribute('aria-pressed', String(b === bt)));
  });
}
const dica = pq.querySelector('.pq-dica');
if (dica) {
  dica.hidden = false;
  if (matchMedia('(hover: none)').matches) {
    const t = dica.querySelector('.pq-dica-txt');
    if (t) t.textContent = 'Toque num pedido ou numa solução.';
  }
}

// ---- posição sem transformações (os post-its ficam tortos e se mexem na entrada): soma offsets até o quadro
function caixa(el) {
  let x = 0, y = 0, e = el;
  while (e && e !== quadro) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

// ---- desenho das linhas: post-it desce até a faixa da sua linha, corre até o barramento da solução, sobe/desce até o cartão
let fios = [];
function desenha() {
  svg.textContent = '';
  fios = [];
  if (leg) leg.hidden = !desk.matches;
  const todas = [...pq.querySelectorAll('.pq-linha')];
  if (!desk.matches) { pq.classList.remove('is-fios'); todas.forEach(l => { l.style.marginBottom = ''; }); return; }
  pq.classList.add('is-fios');
  // vão abaixo de cada linha (menos a última, que usa o respiro do quadro): faixas a 7px + 4px cada, mais 5px antes
  // do rótulo do tema da linha de baixo
  todas.forEach((l, i) => {
    const n = ordem.filter(s => [...l.querySelectorAll('.pq-nota')].some(x => destinos(x).includes(s))).length;
    l.style.marginBottom = i < todas.length - 1 ? `${12 + 4 * Math.max(0, n - 1)}px` : '';
  });
  const W = quadro.clientWidth, H = quadro.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const cn = caixa(notasBox), cs = caixa(solsBox);
  const x0 = cn.x + cn.w + 12, x1 = cs.x - 16;
  const porta = Object.fromEntries(sols.map(s => { const c = caixa(s); return [s.dataset.sol, { x: c.x, y: Math.round(c.y + c.h / 2) + .5 }]; }));
  // cada linha de post-its: caixas e a faixa (y) de cada solução no vão logo abaixo dela
  const linhas = [...pq.querySelectorAll('.pq-linha')].map(linha => {
    const ns = [...linha.querySelectorAll('.pq-nota')];
    const cxs = ns.map(caixa);
    const fundo = ns.length ? Math.max(...cxs.map(c => c.y + c.h)) : 0;
    const usados = ordem.filter(s => ns.some(n => destinos(n).includes(s)));
    const faixa = Object.fromEntries(usados.map((s, i) => [s, Math.round(fundo + 7 + i * 4) + .5]));
    return { ns, cxs, faixa };
  }).filter(l => l.ns.length);
  // barramentos (um vertical por solução, entre os post-its e os cartões): a ordem da esquerda para a direita é a que
  // cruza menos linhas. Cada barramento vai da faixa mais alta (ou mais baixa) que usa até a porta do cartão; uma linha
  // horizontal cruza o barramento de outra solução quando passa por ele (à esquerda do seu, na ida; à direita, na chegada).
  const vao = Object.fromEntries(ordem.map(s => {
    const ys = [porta[s] ? porta[s].y : 0, ...linhas.filter(l => s in l.faixa).map(l => l.faixa[s])];
    return [s, [Math.min(...ys), Math.max(...ys)]];
  }));
  const dentro = (y, t) => y > vao[t][0] && y < vao[t][1];
  const custo = seq => {
    const pos = Object.fromEntries(seq.map((s, i) => [s, i]));
    let n = 0;
    linhas.forEach(l => Object.entries(l.faixa).forEach(([s, y]) => seq.forEach(t => { if (pos[t] < pos[s] && dentro(y, t)) n++; })));
    seq.forEach(s => { if (porta[s]) seq.forEach(t => { if (pos[t] > pos[s] && dentro(porta[s].y, t)) n++; }); });
    return n;
  };
  const perms = a => a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
  let ordemBus = [...ordem].reverse(), melhor = custo(ordemBus);
  if (ordem.length <= 7) perms(ordem).forEach(p => { const c = custo(p); if (c < melhor) { melhor = c; ordemBus = p; } });
  const passo = ordemBus.length > 1 ? (x1 - x0) / (ordemBus.length - 1) : 0;
  const busX = Object.fromEntries(ordemBus.map((s, i) => [s, Math.round(x0 + i * passo) + .5]));
  let k = 0;
  linhas.forEach(({ ns, cxs, faixa }) => {
    ns.forEach((n, i) => {
      // as descidas de um post-it vão da faixa mais funda (à esquerda) para a mais rasa: assim não se cruzam entre si
      const c = cxs[i], ls = ligacoes(n).filter(l => porta[l.s]).sort((a, b) => faixa[b.s] - faixa[a.s]);
      ls.forEach(({ s, opc }, j) => {
        const p = porta[s];
        const x = Math.round(c.x + c.w / 2 + (j - (ls.length - 1) / 2) * 11) + .5;
        const yl = faixa[s];
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M${x} ${c.y + c.h - 2}V${yl}H${busX[s]}V${p.y}H${p.x}`);
        // a cheia se desenha na entrada (pathLength 1); a tracejada precisa do traço em px, então só aparece
        if (!opc) path.setAttribute('pathLength', '1');
        path.setAttribute('class', opc ? 'pq-fio pq-opc' : 'pq-fio');
        path.style.setProperty('--k', k);
        const pino = document.createElementNS(NS, 'circle');
        pino.setAttribute('cx', x); pino.setAttribute('cy', c.y + c.h);
        pino.setAttribute('r', opc ? '2.6' : '3.2');
        pino.setAttribute('class', opc ? 'pq-pino pq-opc' : 'pq-pino');
        pino.style.setProperty('--k', k);
        fios.push({ n, s, opc, path, pino });
        k++;
      });
    });
  });
  // tracejadas embaixo, cheias por cima
  fios.filter(f => f.opc).concat(fios.filter(f => !f.opc)).forEach(f => svg.append(f.path, f.pino));
  aplica();
}

// ---- foco: um post-it ou uma solução
let ativo = null, fixo = null, auto = null; // auto: o passeio sozinho pelas soluções (v7, fim do arquivo)
function aplica() {
  const a = ativo || fixo || auto;
  pq.classList.toggle('is-foco', !!a);
  pq.classList.toggle('is-filtro', !!a && a.classList.contains('pq-sol')); // no celular: só os pedidos da solução tocada
  notas.forEach(n => n.classList.remove('is-on', 'is-opc'));
  sols.forEach(s => s.classList.remove('is-on', 'is-opc'));
  fios.forEach(f => { f.path.classList.remove('is-on'); f.pino.classList.remove('is-on'); });
  if (!a) return;
  const ehNota = a.classList.contains('pq-nota');
  const sol = ehNota ? null : a.dataset.sol;
  // ligação opcional acende também, mas com a marca .is-opc (contorno tracejado)
  const opcEntre = (n, s) => !lista(n.dataset.para).includes(s) && lista(n.dataset.opc).includes(s);
  notas.forEach(n => {
    if (ehNota ? n === a : destinos(n).includes(sol)) { n.classList.add('is-on'); if (!ehNota && opcEntre(n, sol)) n.classList.add('is-opc'); }
  });
  const solsOn = ehNota ? destinos(a) : [sol];
  sols.forEach(s => {
    if (solsOn.includes(s.dataset.sol)) { s.classList.add('is-on'); if (ehNota && opcEntre(a, s.dataset.sol)) s.classList.add('is-opc'); }
  });
  fios.forEach(f => {
    if (ehNota ? f.n === a : f.s === sol) {
      f.path.classList.add('is-on'); f.pino.classList.add('is-on');
      svg.append(f.path, f.pino); // por cima das outras linhas
    }
  });
}
const alvos = [...notas, ...sols];
alvos.forEach(el => {
  el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { ativo = el; aplica(); } });
  el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && ativo === el) { ativo = null; aplica(); } });
  // só o foco de teclado acende: o toque também dá foco, e aí o segundo toque não desligava o filtro do celular
  el.addEventListener('focus', () => { let v = true; try { v = el.matches(':focus-visible'); } catch (_) { } if (v) { ativo = el; aplica(); } });
  el.addEventListener('blur', () => { if (ativo === el) { ativo = null; aplica(); } });
  el.addEventListener('click', e => {
    if (e.pointerType === 'mouse') return;
    fixo = fixo === el ? null : el;
    aplica();
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fixo = fixo === el ? null : el; aplica(); }
  });
});
document.addEventListener('click', e => {
  if (fixo && !e.target.closest('.pq-nota, .pq-sol')) { fixo = null; aplica(); }
});

// ---- redesenha quando o tamanho muda (só depois das fontes, que mudam a altura dos post-its)
let pedido = 0;
const agenda = () => { cancelAnimationFrame(pedido); pedido = requestAnimationFrame(desenha); };
if ('ResizeObserver' in window) new ResizeObserver(agenda).observe(quadro);
else addEventListener('resize', agenda);
if (desk.addEventListener) desk.addEventListener('change', agenda);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(agenda);
desenha();

// ---- entrada (uma vez)
if (reduz || !('IntersectionObserver' in window)) {
  pq.classList.add('is-viva', 'is-pronta');
} else {
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    pq.classList.add('is-viva');
    io.disconnect();
    setTimeout(() => pq.classList.add('is-pronta'), 2600);
  }), { threshold: 0, rootMargin: '0px 0px -20% 0px' }); // v7: no celular o mural tem umas 2 telas de altura; 30% dele pedia uns 530px à vista e o bloco escuro passava vazio antes
  io.observe(quadro);
}

// ---- v7 · o quadro roda sozinho: com o mural na tela e ninguém mexendo, cada solução acende por vez com os pedidos
// que ela atende (as mesmas ligações do mouse), depois uma pausa com tudo aceso e recomeça. O mouse no mural, o foco
// ou um toque param o passeio; ele volta 4 s depois que o mouse sai. Só no desktop e sem movimento reduzido.
if (!reduz && 'IntersectionObserver' in window) {
  let k = -1, timer = 0, visto = false, mexendo = false;
  const passo = () => {
    clearTimeout(timer);
    if (!visto || mexendo || fixo || ativo || !desk.matches || !pq.classList.contains('is-pronta')) { if (auto) { auto = null; aplica(); } timer = setTimeout(passo, 1200); return; }
    k = (k + 1) % (sols.length + 1);
    auto = k < sols.length ? sols[k] : null; // a última volta é a pausa, sem foco
    pq.classList.add('is-passeio');
    aplica();
    timer = setTimeout(passo, auto ? 2600 : 3200);
  };
  new IntersectionObserver(([e]) => { visto = e.isIntersecting && e.intersectionRatio > .5; if (!visto && auto) { auto = null; aplica(); } }, { threshold: [0, .5, .8] }).observe(quadro);
  quadro.addEventListener('pointerenter', () => { mexendo = true; pq.classList.remove('is-passeio'); clearTimeout(timer); timer = setTimeout(passo, 1200); if (auto) { auto = null; aplica(); } });
  quadro.addEventListener('pointerleave', () => { clearTimeout(timer); timer = setTimeout(() => { mexendo = false; passo(); }, 4000); });
  quadro.addEventListener('focusin', () => { mexendo = true; auto = null; pq.classList.remove('is-passeio'); });
  quadro.addEventListener('focusout', () => { mexendo = false; });
  timer = setTimeout(passo, 4000);
}

})();
/* ===== 03-entregas.js */
;(()=>{if(!document.querySelector('[data-secao="03-entregas"]'))return;
// Quadro 3 · o que você recebe. Sanfona das 4 etapas + filme de cada uma.
// Cada filme é uma lista de passos [ms, classe, entrega, alvo do cursor]. As classes se acumulam no palco
// e o CSS reage a elas. ?etapa=d|p|e|m&passo=sN para o filme num ponto (para print).
// A entrega 3 de toda etapa é "E muito mais": o último passo de cada filme mostra as outras entregas.
// A cena tem largura W entre 440 e 780 px (o palco / 0,86, para o texto da cena sair grande) e a altura do palco;
// as telas são fluidas. Voos de uma tela para outra (o site vira print, o slide vira miniatura, o PDF vira anexo)
// são medidos aqui: [data-voa=alvo] ganha --vx/--vy/--vs, [data-asp=alvo] a proporção do alvo, [data-origem] o ponto de zoom.
const en = document.querySelector('.en');
const q = new URLSearchParams(location.search);
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FILMES = {
  // d: site → print vira slide → grade de slides → PDF anexo no e-mail → relatório → quick wins → e muito mais
  d: { dur: 30500, passos: [[0, 's1', 0, '.dg-site .hs-res'], [2600, 's2', 0], [6400, 's3', 0, '.sl-vgrade'], [10200, 's4', 0, '.sl-exp'],
    [11300, 's5', 0, '.ml-r1'], [14200, 's6', 1, '.ml-r2'], [15400, 's7', 1], [20200, 's8', 2, '.ml-r3'], [21400, 's9', 2], [26200, 's10', 3]] },
  p: { dur: 21500, passos: [[0, 's1', 0, '.pl-a1'], [5200, 's2', 1, '.pl-a2'], [10200, 's3', 2, '.pl-a3'], [13400, 's4', 2, '.pl-assina b'], [17200, 's5', 3]] },
  e: { dur: 22500, passos: [[0, 's1', 0, '.eg-resp .on'], [5000, 's2', 1], [6600, 's3', 1, '.eg-c1'], [8400, 's4', 1, '.eg-c3'], [10200, 's5', 1, '.eg-c4'], [13000, 's6', 2], [18000, 's7', 3]] },
  m: { dur: 21500, passos: [[0, 's1', 0], [5200, 's2', 1], [11000, 's3', 2, '.mo-enc tbody tr:first-child em'], [17000, 's4', 3]] },
};
// versão .1 (página quadros-ponto1): um 5º cartão "c" com o cronograma, que roda o próprio cursor (04-cronograma.js)
const p1 = document.body.matches('.pg-home,.pg-quadros,.pg-quadros-ponto1') && !!en.querySelector('.en-f[data-f="c"]');
const ORDEM = p1 ? ['d', 'p', 'e', 'm', 'c'] : ['d', 'p', 'e', 'm'];
const fases = [...en.querySelectorAll('.en-f')];
let fase = 0, t0 = 0, rodando = false, visivel = false, feitos = new Set(), timers = [];

// posição de um elemento dentro da cena, sem contar transformações (offset* ignora transform)
function pos(el, c) { let x = 0, y = 0, e = el; while (e && e !== c) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; }
function mede(c) {
  c.querySelectorAll('[data-asp]').forEach(el => { const a = c.querySelector(el.dataset.asp); if (a && a.offsetHeight) el.style.setProperty('--asp', (a.offsetWidth / a.offsetHeight).toFixed(4)); });
  // o anexo do e-mail cabe na área de leitura (cena larga e baixa, como 1920×945 e 1366×657): encolhe na proporção.
  // Na cena estreita a leitura fica embaixo da lista, que cresce a cada e-mail: lá vale a largura do CSS.
  c.querySelectorAll('.ml-anx').forEach(a => {
    a.style.removeProperty('width');
    const v = a.closest('.ml-ver'), p = a.querySelector('.ml-anx-prev');
    if (c.dataset.l === 'e' || !v || !p || !a.offsetWidth || !p.offsetHeight) return;
    const sobra = pos(v, c).y + v.clientHeight - parseFloat(getComputedStyle(v).paddingBottom) - (pos(a, c).y + a.offsetHeight);
    if (sobra < 0) a.style.width = Math.max(120, a.offsetWidth * (p.offsetHeight + sobra) / p.offsetHeight).toFixed(0) + 'px';
  });
  c.querySelectorAll('[data-voa]').forEach(el => {
    const a = c.querySelector(el.dataset.voa); if (!a || !el.offsetWidth || !a.offsetWidth) return;
    const E = pos(el, c), T = pos(a, c), s = T.w / E.w;
    el.style.setProperty('--vx', (T.x - E.x).toFixed(1) + 'px');
    el.style.setProperty('--vy', (T.y - E.y + (T.h - E.h * s) / 2).toFixed(1) + 'px');
    el.style.setProperty('--vs', s.toFixed(4));
  });
  c.querySelectorAll('[data-origem]').forEach(el => {
    const a = c.querySelector(el.dataset.origem); if (!a) return;
    const E = pos(el, c), T = pos(a, c);
    el.style.setProperty('--ox', (T.x - E.x + T.w / 2).toFixed(0) + 'px');
    el.style.setProperty('--oy', (T.y - E.y + T.h / 2).toFixed(0) + 'px');
  });
}
// v9 · com as abas em cima, o corpo da etapa ocupa a largura toda e o palco ficava largo e baixo (até 2,6 × 1). As telas
// do filme foram feitas pra até ~1,4 × 1: acima disso a grade de slides passa por cima do cabeçalho e o resto corta
// embaixo. O palco fica com no máximo PALCO_ASP vezes a altura (--pw no CSS) e a coluna de texto fica com o resto.
const PALCO_ASP = 1.4;
const ajusta = () => fases.forEach(f => {
  const p = f.querySelector('.en-palco'), c = f.querySelector('.en-cena'), cp = f.querySelector('.en-corpo');
  if (!p) return; // cartão do cronograma (versão .1)
  if (cp && cp.clientHeight) { const s = getComputedStyle(cp), ih = cp.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
    cp.style.setProperty('--pw', Math.round(ih * PALCO_ASP) + 'px'); }
  const w = p.clientWidth, h = p.clientHeight; if (!w || !h) return;
  const W = Math.round(Math.max(440, Math.min(780, w / .86))), k = w / W, H = Math.round(h / k);
  c.style.width = W + 'px'; c.style.height = H + 'px';
  c.dataset.l = W < 600 ? 'e' : ''; // cena estreita: telas simplificadas
  c.style.setProperty('--k', k.toFixed(4));
  mede(c);
});
new ResizeObserver(ajusta).observe(en);
document.fonts?.ready.then(ajusta);

const cena = () => fases[fase].querySelector('.en-cena');
function cursor(alvo) { timers.push(setTimeout(() => mira(alvo), 550)); }
function mira(alvo) {
  const c = cena(), cur = c.querySelector('.en-cur'); if (!cur) return;
  const el = alvo && c.querySelector(alvo);
  if (!el) { cur.classList.add('off'); return; }
  const k = parseFloat(c.style.getPropertyValue('--k')) || 1, rc = c.getBoundingClientRect(), r = el.getBoundingClientRect();
  cur.classList.remove('off');
  cur.style.setProperty('--cx', ((r.left + r.width * .6 - rc.left) / k).toFixed(0) + 'px');
  cur.style.setProperty('--cy', ((r.top + r.height * .55 - rc.top) / k).toFixed(0) + 'px');
  timers.push(setTimeout(() => cur.classList.add('clic'), 750), setTimeout(() => cur.classList.remove('clic'), 1300));
}
// efeitos que pedem JS: contador, digitação, status
function extras(f, cls) {
  const c = cena();
  if (f === 'm' && cls === 's1') { const b = c.querySelector('[data-to]'), fim = +b.dataset.to, ini = performance.now();
    const passo = t => { const k = Math.min(1, (t - ini) / 1400); b.textContent = Math.round(fim * (1 - Math.pow(1 - k, 3))) + '%'; if (k < 1 && fases[fase] === c.closest('.en-f')) requestAnimationFrame(passo); };
    timers.push(setTimeout(() => requestAnimationFrame(passo), 300)); }
  if (f === 'm' && cls === 's2') c.querySelectorAll('.mo-dig').forEach((p, j) => { const txt = p.dataset.txt; p.textContent = '';
    for (let i = 1; i <= txt.length; i++) timers.push(setTimeout(() => { p.textContent = txt.slice(0, i); }, 300 + j * 2400 + i * 26)); });
  if (f === 'm' && cls === 's3') { const linhas = [...c.querySelectorAll('.mo-enc tbody tr:not(.mo-ok)')], cont = c.querySelector('.mo-cont');
    linhas.forEach(l => l.classList.remove('ok')); cont.textContent = '9';
    linhas.forEach((l, i) => timers.push(setTimeout(() => { l.classList.add('ok'); l.querySelector('em').textContent = 'concluído'; cont.textContent = String(10 + i); }, 900 + i * 1100))); }
  if (f === 'e' && /^s[2-5]$/.test(cls)) c.querySelector('.eg-sp-cab em').textContent = { s2: 1, s3: 2, s4: 3, s5: 5 }[cls];
}
function limpa(c) {
  timers.forEach(clearTimeout); timers = [];
  c.className = 'en-cena';
  c.querySelectorAll('.mo-enc tbody tr:not(.mo-ok)').forEach(l => { l.classList.remove('ok'); l.querySelector('em').textContent = 'em curso'; });
}
function aplica(ate) { // aplica os passos até o tempo `ate`
  const f = ORDEM[fase], c = cena(), ents = fases[fase].querySelectorAll('.en-ents li');
  let novo = false;
  FILMES[f].passos.forEach(([ms, cls, ent, alvo], i) => {
    if (ms > ate || feitos.has(i)) return;
    if (!novo) { novo = true; mede(c); } // remede antes do passo (linhas novas do e-mail já abriram)
    feitos.add(i); c.classList.add(cls); extras(f, cls);
    if (ent !== undefined) ents.forEach((li, k) => { li.classList.toggle('at', k === ent); li.classList.toggle('feito', k < ent); });
    cursor(alvo);
  });
  // progresso da entrega atual
  const ps = FILMES[f].passos, ent = [...ents].findIndex(li => li.classList.contains('at'));
  const ini = (ps.find(p => p[2] === ent) || [0])[0], prox = (ps.find(p => p[2] > ent) || [FILMES[f].dur])[0];
  if (ents[ent]) ents[ent].style.setProperty('--p', Math.min(1, (ate - ini) / (prox - ini)).toFixed(3));
}
function abre(i, desde = 0) {
  fases.forEach((f, k) => { f.classList.toggle('on', k === i); f.setAttribute('aria-selected', k === i); });
  if (ORDEM[i] === 'c') { timers.forEach(clearTimeout); timers = []; fase = i; return; } // o cronograma anda sozinho
  fase = i; feitos = new Set(); limpa(cena());
  fases[i].querySelectorAll('.en-ents li').forEach(li => { li.classList.remove('at', 'feito'); li.style.removeProperty('--p'); });
  t0 = performance.now() - desde;
  setTimeout(() => { ajusta(); aplica(desde); }, desde ? 0 : 450);
}
fases.forEach((f, i) => {
  f.addEventListener('click', e => { if (!f.classList.contains('on')) abre(i); });
  f.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !f.classList.contains('on')) { e.preventDefault(); abre(i); } });
  f.querySelectorAll('.en-ents li').forEach(li => li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); } }));
  f.querySelectorAll('.en-ents li').forEach(li => li.addEventListener('click', () => {
    if (!f.classList.contains('on')) return;
    const ms = FILMES[ORDEM[i]].passos.find(p => p[2] === +li.dataset.e)[0];
    feitos = new Set(); limpa(cena()); t0 = performance.now() - ms; aplica(ms);
  }));
  const palco = f.querySelector('.en-palco');
  if (!palco) return; // cartão do cronograma (versão .1)
  // só o mouse pausa: no toque, o navegador emula o mouseenter sem o mouseleave e a pausa ficava presa
  palco.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') rodando = false; });
  palco.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') rodando = visivel; });
});

const fixa = q.get('etapa');
if (fixa || calmo) {
  const i = Math.max(0, ORDEM.indexOf(fixa || 'd')), f = ORDEM[i];
  if (f === 'c') { fases.forEach((x, k) => { x.classList.toggle('on', k === i); x.setAttribute('aria-selected', k === i); }); fase = i; ajusta(); } else {
  const passo = q.get('passo'), ps = FILMES[f].passos;
  const ms = passo ? (ps.find(p => p[1] === passo) || ps[ps.length - 1])[0] : ps[ps.length - 1][0];
  fases.forEach((x, k) => { x.classList.toggle('on', k === i); });
  fase = i; ajusta(); aplica(ms + 1); }
} else {
  abre(0);
  // o relógio só gira com o quadro na tela (fora dela, nenhum quadro de animação gasto); ao voltar, a etapa recomeça.
  // Foco de teclado nas etapas segura a passagem pra próxima (a etapa aberta termina o filme e espera).
  let ult = performance.now(), raf = 0, foco = false;
  const laco = t => { raf = 0; const dt = t - ult; ult = t;
    if (dt > 200) t0 += dt; // aba oculta: o tempo parado não conta
    if (ORDEM[fase] === 'c') { /* o cronograma anda sozinho e, na semana 24, volta para o 01 */ }
    else if (rodando) { const ate = t - t0; aplica(ate); if (ate >= FILMES[ORDEM[fase]].dur && !foco) abre((fase + 1) % ORDEM.length); } else t0 += dt;
    if (visivel) raf = requestAnimationFrame(laco); };
  new IntersectionObserver(([e]) => {
    const antes = visivel; visivel = e.isIntersecting && e.intersectionRatio > .35; rodando = visivel && !en.querySelector('.en-palco:hover');
    if (visivel && !antes) abre(fase);
    if (visivel && !raf) { ult = performance.now(); raf = requestAnimationFrame(laco); }
  }, { threshold: [0, .35, .6] }).observe(en);
  const trilho = en.querySelector('.en-trilho');
  if (trilho) {
    trilho.addEventListener('focusin', e => { let v = false; try { v = e.target.matches(':focus-visible'); } catch (_) { } if (v) foco = true; });
    trilho.addEventListener('focusout', e => { if (!trilho.contains(e.relatedTarget)) foco = false; });
  }
}

})();
/* ===== 04-cronograma.js */
;(()=>{if(!document.querySelector('[data-secao="04-cronograma"]'))return;
// Quadro 4 · cronograma do Roomi 360. v9 (da v8): abre completo e parado na semana 24 (12 de 12 entregas); o botão de
// rodar (.cr-play) toca as semanas da 1 à 24 (1,1 s cada) e para na 24 (na home, depois reabre o cartão 01). Na v7 o cursor andava sozinho ao aparecer.
// Rodando: as barras enchem até a semana, reuniões e marcos já passados ficam cheios, e a faixa de entregas
// embaixo recebe as 3 miniaturas de cada marco que o cursor já passou (uma a uma). Na semana 24 a faixa está cheia;
// quando o ciclo volta à semana 1, ela esvazia. Mouse na grade: o cursor segue o mouse (pausa), e a faixa mostra só
// o que já foi entregue até ali. Toque na grade: vai para a semana tocada e pausa. Teclado: botões de semana
// anterior/próxima, pausar e as fases. Clicar numa fase fixa o destaque nela (clicar de novo solta) e a faixa mostra
// as entregas daquela fase. Movimento reduzido: começa pausado na semana 24 (tudo à vista). ?semana=N: pausado na N.
// v7: a grade se desenha ao aparecer (.cr-espera / .cr-desenha) e a linha sob o mouse acende (.cr-linha, .is-sob).
// Entregas dos marcos (no HTML): gestao/deck-v6-texto.txt:427-430, 438-441, 449-452, 464-467.
const cr = document.querySelector('.cr');
if (cr) {
  const SEM = 24, MS = 1100, FIM_PAUSA = 2600;
  const $ = q => cr.querySelector(q), $$ = q => [...cr.querySelectorAll(q)];
  const g = $('.cr-g'), cursor = $('.cr-cursor'), faixa = $('.cr-faixa');
  const ctl = $('.cr-ctl'), play = $('.cr-play');
  const agSem = $('.cr-agora-sem'), agMes = $('.cr-agora-mes'), entN = $('.cr-ents-n');
  const fases = $$('.cr-fase').map(b => ({ b, f: +b.dataset.f, ini: +b.dataset.ini, fim: +b.dataset.fim }));
  const comFaixa = $$('.cr-g [data-ini]');
  const pontos = $$('.cr-pt,.cr-marco');
  const sems = $$('.cr-sem');
  const grupos = $$('.cr-eg').map(n => ({ n, f: +n.dataset.f, w: +n.dataset.w, es: [...n.querySelectorAll('.cr-e')] }));
  const total = grupos.reduce((s, x) => s + x.es.length, 0);
  const mqCel = matchMedia('(max-width: 720px)'), mqCalmo = matchMedia('(prefers-reduced-motion: reduce)');
  // na home (e nas páginas quadros) o cronograma mora no 5º cartão da sanfona do quadro 3 (00-ponto1.js). Só toca
  // com o cartão aberto. v9: na carga a sanfona para no cronograma completo; depois do play chegar na 24, reabre o cartão 01.
  const cartao = document.body.matches('.pg-home,.pg-quadros,.pg-quadros-ponto1') ? cr.closest('.en-f') : null;
  const aberto = () => !cartao || cartao.classList.contains('on');

  const pedida = parseInt(new URLSearchParams(location.search).get('semana'), 10);
  const temPedida = pedida >= 1 && pedida <= SEM;
  // v9 (da v8): sempre parado na semana 24 (como no movimento reduzido da v7), com as barras cheias e as 12 entregas à vista.
  // O botão de rodar toca as semanas da 1 à 24 uma vez e para.
  let w = temPedida ? pedida : SEM, fixa = 0, pausado = true, sobre = false, visivel = false, timer = 0;
  let volta01 = false; // v9: o play chegou na 24 (na home, reabre o cartão 01 depois de FIM_PAUSA)
  let wAntesDoMouse = 0; // parado, o mouse na grade passeia pelas semanas; ao sair, a grade volta aonde estava

  cr.classList.add('is-js');
  if (ctl) ctl.hidden = false;

  // v7 · a grade se desenha quando o quadro aparece: cada peça ganha a sua linha (--r) e a sua semana (--wk) pro
  // escalonamento do CSS; .cr-espera esconde (só fora da tela), .cr-desenha roda a entrada e sai depois dela.
  // Fora da tela de novo, volta a esperar, e desenha outra vez na volta. Movimento reduzido ou ?semana=N: nada espera.
  $$('.cr-g > [style*="grid-row"]').forEach(n => { const r = parseInt(n.style.gridRowStart, 10); if (r >= 3) n.style.setProperty('--r', r - 3); });
  $$('.cr-pt,.cr-marco').forEach(n => n.style.setProperty('--wk', +n.dataset.w));
  sems.forEach((n, i) => n.style.setProperty('--wk', i + 1));
  $$('.cr-mes').forEach((n, i) => n.style.setProperty('--wk', i * 4 + 1));
  $$('.cr-lista > li').forEach((n, i) => n.style.setProperty('--r', i * 2));
  $$('.cr-eg').forEach((n, i) => n.style.setProperty('--r', i));
  let desenhado = false, tDes = 0;
  const espera = () => {
    if (mqCalmo.matches || temPedida) return;
    clearTimeout(tDes); desenhado = false;
    cr.classList.remove('cr-desenha'); cr.classList.add('cr-espera');
  };
  const desenha = () => {
    if (desenhado) return;
    desenhado = true;
    if (!cr.classList.contains('cr-espera')) return;
    cr.classList.add('cr-desenha'); cr.classList.remove('cr-espera');
    clearTimeout(tDes); tDes = setTimeout(() => cr.classList.remove('cr-desenha'), 2600);
  };
  espera();

  // a linha da grade sob o mouse acende (atividade, barra, reuniões e quem), junto com a semana que já seguia o mouse
  const linhaSob = $('.cr-linha');
  // só os itens de uma linha (sem "3 / 5"). Lê pela propriedade, não pelo texto do style: o Safari reescreve
  // "grid-row: 3" como "grid-row-start: 3; grid-row-end: auto" e a expressão antiga dava null e derrubava o cronograma no iPhone (14/10)
  const porLinha = $$('.cr-g > [style*="grid-row"]').filter(n => { const fim = n.style.gridRowEnd; return !fim || fim === 'auto'; }).map(n => ({ n, r: parseInt(n.style.gridRowStart, 10) }));
  let rSob = 0;
  const marcaLinha = r => {
    if (r === rSob || !g) return;
    rSob = r;
    g.classList.toggle('is-linha', r > 0);
    if (r > 0 && linhaSob) linhaSob.style.gridRow = String(r);
    porLinha.forEach(x => x.n.classList.toggle('is-sob', x.r === r));
  };
  const linhaDoY = y => {
    const trilhos = getComputedStyle(g).gridTemplateRows.split(' ').map(parseFloat);
    let topo = g.getBoundingClientRect().top;
    for (let k = 0; k < trilhos.length; k++) { if (y >= topo && y < topo + trilhos[k]) return k >= 2 ? k + 1 : 0; topo += trilhos[k]; }
    return 0;
  };

  const mes = s => Math.ceil(s / 4);

  // faixa: entregue = marco já alcançado pelo cursor
  // (no celular a grade some e o cursor não anda: a faixa fica cheia)
  const pintaEntregas = () => {
    let n = 0;
    const ate = mqCel.matches ? SEM : w;
    grupos.forEach(x => {
      const feito = x.w <= ate;
      if (feito) n += x.es.length;
      x.n.classList.toggle('is-fut', !feito);
      x.n.classList.toggle('is-agora', x.w === ate && !mqCel.matches);
      x.n.classList.remove('is-off');
      x.es.forEach(e => e.classList.toggle('is-fut', !feito));
    });
    if (entN) entN.textContent = ` · ${n} de ${total}`;
  };

  const pintaSemana = () => {
    cr.classList.remove('is-fixa');
    if (faixa) faixa.style.setProperty('--w', w);
    sems.forEach((n, i) => n.classList.toggle('is-agora', i + 1 === w));
    comFaixa.forEach(n => {
      const ini = +n.dataset.ini, fim = +n.dataset.fim;
      const on = ini <= w && w <= fim, cheio = w >= SEM; // v9 (da v8): na semana 24 (completo) nenhuma linha apaga
      n.classList.toggle('is-off', !on && !cheio);
      n.classList.toggle('is-on', on && !cheio);
      if (n.classList.contains('cr-bar')) n.style.setProperty('--p', Math.max(0, Math.min(1, (w - ini + 1) / (fim - ini + 1))).toFixed(3));
    });
    $$('.cr-trilha').forEach(n => n.classList.remove('is-off'));
    pontos.forEach(n => { const s = +n.dataset.w; n.classList.remove('is-off'); n.classList.toggle('is-fut', s > w); n.classList.toggle('is-agora', s === w); });
    fases.forEach(a => a.b.setAttribute('aria-pressed', 'false'));
    if (agSem) agSem.textContent = 'Semana ' + w;
    if (agMes) agMes.textContent = 'Mês ' + mes(w);
    pintaEntregas();
  };

  const pintaFase = f => {
    const a = fases.find(x => x.f === f);
    cr.classList.add('is-fixa');
    sems.forEach((n, i) => n.classList.toggle('is-agora', i + 1 >= a.ini && i + 1 <= a.fim));
    $$('.cr-g [data-f]').forEach(n => {
      const on = +n.dataset.f === f;
      n.classList.toggle('is-off', !on);
      n.classList.toggle('is-on', on);
      if (n.classList.contains('cr-bar')) n.style.setProperty('--p', 1);
    });
    pontos.forEach(n => n.classList.remove('is-fut', 'is-agora'));
    fases.forEach(x => x.b.setAttribute('aria-pressed', String(x.f === f)));
    if (agSem) agSem.textContent = `Sem ${a.ini}–${a.fim}`;
    if (agMes) agMes.textContent = mes(a.ini) === mes(a.fim) ? 'Mês ' + mes(a.ini) : `Meses ${mes(a.ini)} a ${mes(a.fim)}`;
    // faixa: as 12 à vista, a fase escolhida em destaque
    grupos.forEach(x => {
      x.n.classList.remove('is-fut', 'is-agora');
      x.n.classList.toggle('is-off', x.f !== f);
      x.es.forEach(e => e.classList.remove('is-fut'));
    });
    const g1 = grupos.find(x => x.f === f);
    if (entN) entN.textContent = g1 ? ` · marco da semana ${g1.w}` : '';
  };

  const estadoPlay = () => {
    if (!play) return;
    const parado = pausado || !!fixa;
    play.setAttribute('aria-pressed', String(parado));
    play.setAttribute('aria-label', parado ? 'Rodar as semanas' : 'Pausar');
  };
  const para = () => { clearTimeout(timer); timer = 0; };
  const agenda = () => {
    para();
    // v9: na home, depois que o play chegou na 24, o cartão 01 da sanfona reabre (como na v7); na carga parada, nada
    if (volta01 && cartao && w >= SEM && !fixa && !sobre && visivel && aberto()) {
      timer = setTimeout(() => { volta01 = false; cartao.parentElement.querySelector('.en-f').click(); }, FIM_PAUSA); return; }
    if (pausado || fixa || sobre || !visivel || !aberto()) return;
    if (mqCel.matches) return;
    if (w >= SEM) { pausado = true; volta01 = !!cartao; estadoPlay(); agenda(); return; } // v9 (da v8): tocou até a 24, para ali (completo)
    timer = setTimeout(() => { w = w + 1; pintaSemana(); agenda(); }, MS);
  };
  const vaiPara = s => { fixa = 0; wAntesDoMouse = 0; volta01 = false; w = Math.max(1, Math.min(SEM, s)); pintaSemana(); estadoPlay(); agenda(); };

  // fases
  fases.forEach(a => a.b.addEventListener('click', () => {
    volta01 = false;
    if (fixa === a.f) { fixa = 0; w = pausado ? SEM : a.ini; pintaSemana(); } // v9 (da v8): parado, solta de volta no completo
    else { fixa = a.f; pintaFase(a.f); }
    estadoPlay(); agenda();
  }));
  // botões
  const ant = $('.cr-ant'), prox = $('.cr-prox');
  if (ant) ant.addEventListener('click', () => { pausado = true; vaiPara(fixa ? fases[fixa - 1].ini - 1 : w - 1); });
  if (prox) prox.addEventListener('click', () => { pausado = true; vaiPara(fixa ? fases[fixa - 1].fim + 1 : w + 1); });
  if (play) play.addEventListener('click', () => {
    if (fixa) { fixa = 0; pausado = false; pintaSemana(); }
    else pausado = !pausado;
    if (!pausado && w >= SEM) { w = 1; pintaSemana(); } // v9 (da v8): tocar a partir do completo recomeça da semana 1
    wAntesDoMouse = 0; volta01 = false;
    estadoPlay(); agenda();
  });
  // mouse e toque na grade: a semana sob o ponteiro
  const semDoX = x => { const r = cursor.getBoundingClientRect(); if (x < r.left || x > r.right) return 0; return Math.min(SEM, Math.floor((x - r.left) / r.width * SEM) + 1); };
  if (g && cursor) {
    g.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      marcaLinha(linhaDoY(e.clientY));
      if (fixa || e.target.closest('.cr-ctl')) return;
      if (!sobre) wAntesDoMouse = pausado ? w : 0;
      sobre = true; para();
      const s = semDoX(e.clientX);
      if (s && s !== w) { w = s; pintaSemana(); }
    });
    g.addEventListener('pointerleave', e => { if (e.pointerType !== 'mouse') return; marcaLinha(0); sobre = false;
      if (wAntesDoMouse && pausado && !fixa && w !== wAntesDoMouse) { w = wAntesDoMouse; pintaSemana(); } // v9 (da v8): parado, volta ao que estava
      wAntesDoMouse = 0; agenda(); });
    g.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || e.target.closest('.cr-fase,.cr-ctl')) return;
      const s = semDoX(e.clientX);
      if (s) { pausado = true; vaiPara(s); }
    });
  }

  pintaSemana(); estadoPlay();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => {
      const antes = visivel;
      visivel = e.isIntersecting;
      if (visivel && !antes && !fixa && !pausado) { w = 1; pintaSemana(); }
      agenda();
    }), { threshold: 0.35 }).observe(g || cr);
  } else { visivel = true; agenda(); }
  // o desenho da grade: quando a peça aparece (e, na home, com o cartão aberto); fora da tela, volta a esperar
  const peca = $('.cr-peca') || cr;
  let pecaVisivel = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => {
      pecaVisivel = e.isIntersecting;
      if (pecaVisivel && aberto()) desenha(); else if (!pecaVisivel) espera();
    }), { threshold: 0 }).observe(peca);
  } else desenha();
  if (cartao) new MutationObserver(() => { if (aberto()) { if (pecaVisivel) desenha(); if (!fixa && !pausado) { w = 1; pintaSemana(); } agenda(); } else { volta01 = false; para(); espera(); } }).observe(cartao, { attributes: true, attributeFilter: ['class'] });
  // impressão (o PDF dos decks): o papel mostra o cronograma inteiro, na última semana como no movimento reduzido,
  // e a tela volta à semana em que estava
  let antesDoPapel = 0;
  addEventListener('beforeprint', () => { antesDoPapel = w; para(); cr.classList.remove('cr-espera', 'cr-desenha'); if (!fixa) { w = SEM; pintaSemana(); } });
  addEventListener('afterprint', () => { if (!fixa && antesDoPapel) { w = antesDoPapel; pintaSemana(); } if (!pecaVisivel) espera(); agenda(); });
  const reavalia = () => { if (!fixa) pintaSemana(); agenda(); };
  [mqCel, mqCalmo].forEach(mq => mq.addEventListener ? mq.addEventListener('change', reavalia) : mq.addListener(reavalia));
}

})();
/* ===== 05-cubo-materiais.js */
;(()=>{if(!document.querySelector('[data-secao="05-cubo-materiais"]'))return;
// Quadro 5 · Cubo + materiais: quando o quadro entra na tela, os rótulos do Cubo aparecem e as capas chegam uma a uma.
// Sem JS (ou sem IntersectionObserver), tudo já aparece parado. Com movimento reduzido, nada anima (ver o CSS).
// v7: com o quadro na tela, os 3 rótulos do Cubo acendem um por vez (a janela "mostra" cada parte da tela); o mouse
// em cima da janela pausa. v9 (da v8): as capas ficam retas e paradas (sai o leque que se levantava). A janela do Cubo inclina com o mouse.
const cm = document.querySelector('.cm');
if (cm && 'IntersectionObserver' in window) {
  cm.classList.add('cm-js');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visto = false;
  const io = new IntersectionObserver(es => es.forEach(e => {
    visto = e.isIntersecting;
    if (visto) cm.classList.add('cm-vis');
  }), { threshold: 0.25 });
  io.observe(cm);

  if (!calmo) {
    // um ciclo que acende um item por vez, pausa com o mouse em cima do grupo
    const ciclo = (itens, grupo, cls, ms, ini) => {
      let k = -1, sobre = false;
      const anda = () => {
        // só os que estão à mostra (o rótulo 3 some no celular e nas telas baixas): sem passo vazio no ciclo
        const vivos = itens.filter(el => el.getClientRects().length);
        if (visto && !sobre && vivos.length) { k = (k + 1) % vivos.length; itens.forEach(el => el.classList.toggle(cls, el === vivos[k])); }
        setTimeout(anda, ms);
      };
      grupo.addEventListener('pointerenter', () => { sobre = true; itens.forEach(el => el.classList.remove(cls)); });
      grupo.addEventListener('pointerleave', () => { sobre = false; });
      setTimeout(anda, ini);
    };
    const rots = [...cm.querySelectorAll('.cm-rot')], palco = cm.querySelector('.cm-palco');
    if (rots.length && palco) ciclo(rots, palco, 'cm-at', 2400, 1600);

    // profundidade: a janela do Cubo inclina com o mouse (só com mouse de verdade)
    if (palco && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      let alvo = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
      const anima = () => {
        cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
        palco.style.setProperty('--my', (cur.x * 4).toFixed(2) + 'deg');
        palco.style.setProperty('--mx', (-cur.y * 3).toFixed(2) + 'deg');
        raf = Math.abs(alvo.x - cur.x) > .002 || Math.abs(alvo.y - cur.y) > .002 ? requestAnimationFrame(anima) : 0;
      };
      palco.addEventListener('pointermove', e => {
        const r = palco.getBoundingClientRect();
        alvo = { x: ((e.clientX - r.left) / r.width - .5) * 2, y: ((e.clientY - r.top) / r.height - .5) * 2 };
        if (!raf) raf = requestAnimationFrame(anima);
      }, { passive: true });
      palco.addEventListener('pointerleave', () => { alvo = { x: 0, y: 0 }; if (!raf) raf = requestAnimationFrame(anima); });
    }
  }
}

})();
/* ===== 06-produtos.js */
;(()=>{if(!document.querySelector('[data-secao="06-produtos"]'))return;
// Quadro 6 · verticais e produtos (06-produtos, home e verticais.html): profundidade no hover dos 3 cartões.
// O cartão inclina para o lado do mouse (propriedade rotate, amortecida a .08; a perspectiva está no pai) e o brilho
// coral segue o ponteiro. Só com mouse de verdade e sem movimento reduzido; no toque nada muda.
const pd = document.querySelector('.pd');
if (pd && !matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover:hover) and (pointer:fine)').matches) {
  pd.querySelectorAll('.pd-grupo').forEach(g => {
    let alvo = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
    const MAX = 3.2;
    const anima = () => {
      cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
      const ang = Math.hypot(cur.x, cur.y) * MAX;
      g.style.rotate = ang > .02 ? `${(-cur.y).toFixed(3)} ${cur.x.toFixed(3)} 0 ${ang.toFixed(2)}deg` : '';
      raf = Math.abs(alvo.x - cur.x) > .003 || Math.abs(alvo.y - cur.y) > .003 ? requestAnimationFrame(anima) : 0;
    };
    g.addEventListener('pointermove', e => {
      const r = g.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      alvo = { x: Math.max(-1, Math.min(1, (px - .5) * 2)), y: Math.max(-1, Math.min(1, (py - .5) * 2)) };
      g.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); g.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      g.classList.add('inc');
      if (!raf) raf = requestAnimationFrame(anima);
    }, { passive: true });
    g.addEventListener('pointerleave', () => { alvo = { x: 0, y: 0 }; g.classList.remove('inc'); if (!raf) raf = requestAnimationFrame(anima); });
  });
}

// v9: cartões que giram (assinatura e ferramentas). No mouse o giro é do CSS (:hover); aqui fica o clique/toque e o teclado.
// Tocar na frente vira o cartão (e desvira os outros); tocar no verso (só a frase, sem link) desvira. Enter/Espaço na
// frente vira e desvira; Esc ou o foco saindo do cartão desvira.
if (pd) {
  const giras = [...pd.querySelectorAll('.pd-gira')];
  const vira = (li, sim) => {
    li.classList.toggle('virado', sim);
    li.querySelector('.pd-frente').setAttribute('aria-expanded', sim ? 'true' : 'false');
  };
  giras.forEach(li => {
    const frente = li.querySelector('.pd-frente'), verso = li.querySelector('.pd-verso');
    frente.addEventListener('click', () => { giras.forEach(o => o !== li && vira(o, false)); vira(li, true); });
    verso.addEventListener('click', () => vira(li, false));
    frente.addEventListener('keydown', e => {
      if (e.key === 'Escape') { vira(li, false); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); vira(li, !li.classList.contains('virado'));
    });
    // o foco foi para outro elemento fora do cartão (Tab); clique em área vazia fica com o ouvinte de baixo
    li.addEventListener('focusout', e => { if (e.relatedTarget && !li.contains(e.relatedTarget)) vira(li, false); });
  });
  // tocar fora de qualquer cartão desvira todos
  document.addEventListener('click', e => { if (!e.target.closest('.pd-gira')) giras.forEach(o => vira(o, false)); });
}

})();
/* ===== 07-quem-calc.js */
;(()=>{if(!document.querySelector('[data-secao="07-quem-calc"]'))return;
/* Quadro 7 · calculadora compacta (prefixo qk-). A conta é a do 00-calc-conta.js (window.RoomiCalc, 14/10: a mesma do
   passo 3 do formulário "Vamos conversar mais"), que é cópia literal do bloco <calc> do 52-calc.js (v4 = v3 = deck),
   com as premissas padrão (multiplicador 100%). Só entram os campos que mudam a conta: quartos, ocupação, diária,
   % via OTAs e via operadoras e as duas comissões (venda direta e "outros" não entram em p2Calc).
   Canais em inteiros, como no v4 (aplicaMix arredonda). OTAs + operadoras até 100%.
   Abre vazia, com "?" nos 3 cenários (como na v7); o resultado aparece quando os 7 campos estão preenchidos.
   "Ver com um hotel exemplo" preenche EXEMPLO (os padrões de P2_CAMPOS, mas 250 quartos e R$ 1.500 de diária: exemplo
   pequeno fazia o ganho parecer pequeno) e o botão vira "Redefinir", que volta ao estado inicial.
   Nada sai da página: sem fetch, sem storage. */
(function () {
  var C = window.RoomiCalc;
  var s = document.querySelector('.qk-calc');
  if (!s || !C) return;
  var p2Calc = C.p2Calc, p2Num = C.p2Num, p2Partes = C.p2Partes, p2Brl = C.p2Brl, p2Campo = C.p2Campo;
  var CAMPOS = C.CAMPOS;
  var P = C.P;

  function campo(k) { return s.querySelector('input[data-k="' + k + '"]'); }
  // NaN = vazio. Faixas de P2_CAMPOS; canais em inteiros (como o aplicaMix do v4).
  function valor(k) {
    var i = campo(k);
    return i ? C.faixa(k, C.lerTexto(i.value)) : NaN;
  }
  function hotel() { var h = {}; CAMPOS.forEach(function (k) { h[k] = valor(k); }); return h; }

  var msg = s.querySelector('[data-f="msg"]');
  var cards = [].slice.call(s.querySelectorAll('.qk-cen'));
  function limpa(texto) {
    s.classList.remove('qk-ok');
    msg.textContent = texto;
    cards.forEach(function (c) {
      c.querySelector('.qk-gn').textContent = '?';
      c.querySelector('.qk-gu').textContent = '';
      c.querySelector('[data-f="pct"]').textContent = '';
    });
  }
  function atualiza() {
    var h = hotel();
    var falta = CAMPOS.filter(function (k) { return isNaN(h[k]); }).length;
    if (falta) { limpa(falta === CAMPOS.length ? 'Preencha os 7 campos ou veja um hotel exemplo.' : 'Falta' + (falta > 1 ? 'm ' : ' ') + falta + ' campo' + (falta > 1 ? 's' : '') + '.'); return; }
    if (h.otas + h.oper > 100) { limpa('OTAs e operadoras passam de 100% da receita.'); return; }
    var r = p2Calc(h, P);
    s.classList.add('qk-ok');
    msg.textContent = 'Receita de diárias hoje: ' + p2Brl(r.base) + ' por ano.';
    cards.forEach(function (c) {
      var x = r.cen[c.getAttribute('data-c')];
      var p = p2Partes(x.total);
      c.querySelector('.qk-gn').textContent = p.n;
      c.querySelector('.qk-gu').textContent = p.u;
      c.querySelector('[data-f="pct"]').innerHTML = ' · <b class="num">+' + p2Num(Math.round(x.pct * 100), 0) + '%</b> na receita';
    });
  }
  // ao sair do campo, o texto volta formatado e dentro da faixa
  s.addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-k');
    if (!k) return;
    var v = valor(k);
    if (!isNaN(v)) e.target.value = p2Campo(k, v);
    atualiza();
  });
  s.addEventListener('input', function (e) { if (e.target.getAttribute('data-k')) { s.classList.remove('qk-convite'); atualiza(); } });
  s.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.getAttribute('data-k')) { e.target.dispatchEvent(new Event('change', { bubbles: true })); e.preventDefault(); }
  });
  // hotel exemplo: EXEMPLO (do 00-calc-conta.js) nos 7 campos, a conta e o selo na mensagem (sai no próximo input)
  var EXEMPLO = C.EXEMPLO;
  function exemplo() {
    CAMPOS.forEach(function (k) { campo(k).value = p2Campo(k, EXEMPLO[k]); });
    atualiza();
    if (s.classList.contains('qk-ok')) msg.textContent = 'Hotel exemplo · ' + msg.textContent;
  }
  function vazia() { return !CAMPOS.some(function (k) { return campo(k) && campo(k).value.trim(); }); }
  // o botão vira "Redefinir" depois do exemplo e assim fica (mesmo digitando à mão) até a calculadora voltar a ficar vazia
  var usouExemplo = false;
  function botao() {
    if (usouExemplo && vazia()) usouExemplo = false;
    s.classList.toggle('qk-redef', usouExemplo);
  }
  s.addEventListener('input', botao);
  var bx = s.querySelector('[data-acao="exemplo"]');
  if (bx) bx.addEventListener('click', function () {
    if (usouExemplo) {
      // Redefinir: campos vazios, "?" nos cenários, mensagem inicial e o convite (pulso) de volta
      usouExemplo = false;
      CAMPOS.forEach(function (k) { campo(k).value = ''; });
      s.classList.add('qk-convite');
      atualiza();
    } else {
      usouExemplo = true;
      s.classList.remove('qk-convite');
      exemplo();
    }
    botao();
  });
  // impressão (o PDF da proposta): a calculadora vazia sai com o hotel exemplo e o selo dele, e volta vazia depois
  var impressa = false;
  addEventListener('beforeprint', function () {
    if (!vazia()) return;
    impressa = true;
    exemplo();
  });
  addEventListener('afterprint', function () {
    if (!impressa) return;
    impressa = false;
    CAMPOS.forEach(function (k) { campo(k).value = ''; });
    atualiza();
  });
  // abre vazia, com "?" (campo já preenchido pelo navegador ao voltar na página: respeita o que está lá)
  if (vazia()) s.classList.add('qk-convite');
  atualiza();
})();

// v7 · o brilho coral dos cenários segue o mouse (só com mouse de verdade; o CSS acende no hover)
if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
  document.querySelectorAll('.qk-cen').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      c.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  });
}

})();
/* ===== 08-final.js */
;(()=>{if(!document.querySelector('[data-secao="08-final"]'))return;
// Quadro 8 · chamada final + visor "Experimente nossos entregáveis" (prefixo fn-).
// Para pôr um modelo novo: suba o HTML em site-src/estatico/amostras/<slug>.html e acrescente uma linha em MODELOS com
// pronto: true (modelo que já tem linha aqui: só acrescente pronto: true na linha dele).
// Linha sem pronto = arquivo ainda não subiu: o visor mostra a capa "modelo em preparação" e não pede nada ao servidor
// (pedir arquivo que não existe deixa um 404 no console de toda página com este quadro). Linha com pronto: o JS confere
// com HEAD que o arquivo está lá antes de abrir; se não estiver, volta à capa.
// largura (opcional): se o modelo não for responsivo, ponha a largura (px) em que ele foi feito; o visor o desenha nela
// e reduz o modelo inteiro para caber. Sem largura, o modelo aparece no tamanho natural do visor (legível e clicável).
const MODELOS = [
  { slug: 'presenca-digital', nome: 'Análise de Presença Digital', etapa: 'Diagnóstico', desc: 'Site, OTAs, Google e redes sociais' },
  { slug: 'historico-resultados', nome: 'Análise Histórica de Resultados', etapa: 'Diagnóstico', desc: 'Receita, ocupação e diária' },
  { slug: 'plano-de-acao', nome: 'Plano de Ação', etapa: 'Planejamento', desc: 'Plano de ação unificado de marketing e vendas' },
];

const sec = document.querySelector('.fn');
const lista = sec && sec.querySelector('.fn-lista');
const palco = sec && sec.querySelector('.fn-palco');
const cheia = sec && sec.querySelector('.fn-cheia');
const barT = sec && sec.querySelector('.fn-bar-t');
if (sec && lista && palco) {
  const url = m => 'amostras/' + m.slug + '.html';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const estado = {}; // slug -> 'pronto' | 'falta' (sem chave = ainda perguntando)
  let atual = 0;

  // existe? HEAD primeiro; servidor que não aceita HEAD (405/501) ganha um GET. Qualquer falha = "em preparação".
  const existe = async m => {
    if (!m.pronto) return false; // o arquivo ainda não subiu: nada a perguntar
    if (!/^https?:$/.test(location.protocol)) return false; // aberto do disco ou no arquivo único: sem servidor pra perguntar (evita erro de CORS no console)
    try {
      let r = await fetch(url(m), { method: 'HEAD', cache: 'no-store' });
      if (r.status === 405 || r.status === 501) r = await fetch(url(m), { cache: 'no-store' });
      return r.ok;
    } catch (e) { return false; }
  };

  // abas
  const abas = MODELOS.map((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fn-aba';
    b.id = 'fn-aba-' + m.slug;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'fn-palco');
    b.innerHTML = '<small>' + esc(m.etapa) + '</small><b>' + esc(m.nome) + '</b><em class="fn-st">em preparação</em>';
    b.addEventListener('click', () => escolhe(i, true));
    lista.appendChild(b);
    return b;
  });
  const mais = document.createElement('p');
  mais.className = 'fn-mais';
  mais.textContent = 'Mais modelos em breve';
  lista.appendChild(mais);
  palco.id = 'fn-palco';

  lista.addEventListener('keydown', e => {
    const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (e.key === 'Home' || e.key === 'End' || k) {
      e.preventDefault();
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? MODELOS.length - 1 : (atual + k + MODELOS.length) % MODELOS.length;
      escolhe(n, true); abas[n].focus();
    }
  });

  // com largura: modelo desenhado nela e reduzido para caber; sem largura ou em visor estreito (celular): tamanho natural
  let frame = null;
  const ajusta = () => {
    if (!frame) return;
    const m = MODELOS[atual], w = palco.clientWidth, h = palco.clientHeight;
    const W = m.largura || 0;
    if (!W || w < 440 || w >= W) { frame.style.width = '100%'; frame.style.height = '100%'; frame.style.transform = ''; return; }
    const k = w / W;
    frame.style.width = W + 'px'; frame.style.height = (h / k) + 'px'; frame.style.transform = 'scale(' + k + ')';
  };
  if ('ResizeObserver' in window) new ResizeObserver(ajusta).observe(palco);

  const capa = m => '<div class="fn-capa">' +
    '<span class="fn-capa-folha" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
    '<p class="fn-capa-k">Roomi 360 · ' + esc(m.etapa) + '</p>' +
    '<p class="fn-capa-t">' + esc(m.nome) + '</p>' +
    '<p class="fn-capa-d">' + esc(m.desc) + '</p>' +
    '<p class="fn-capa-s"><i aria-hidden="true"></i>' + (estado[m.slug] ? 'Modelo em preparação' : 'Carregando') + '</p></div>';

  const desenha = () => {
    const m = MODELOS[atual];
    if (barT) barT.textContent = m.nome;
    if (estado[m.slug] === 'pronto') {
      if (frame && frame.dataset.slug === m.slug) return;
      palco.innerHTML = '';
      frame = document.createElement('iframe');
      frame.className = 'fn-frame';
      frame.dataset.slug = m.slug;
      frame.title = 'Modelo: ' + m.nome;
      frame.src = url(m);
      palco.appendChild(frame);
      palco.classList.add('tem-frame');
      ajusta();
      if (cheia) { cheia.href = url(m); cheia.hidden = false; cheia.setAttribute('aria-label', 'Abrir ' + m.nome + ' em tela cheia, em nova aba'); }
    } else {
      frame = null;
      palco.classList.remove('tem-frame');
      palco.innerHTML = capa(m);
      if (cheia) cheia.hidden = true;
    }
  };

  function escolhe(i) {
    atual = i;
    abas.forEach((b, j) => { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; b.classList.toggle('on', j === i); });
    palco.setAttribute('aria-labelledby', abas[i].id);
    desenha();
  }
  MODELOS.forEach(m => { if (!m.pronto) estado[m.slug] = 'falta'; }); // a capa já diz "em preparação", sem "Carregando"
  escolhe(0);

  // pergunta pelos arquivos (só os marcados pronto) quando o quadro chega perto da tela
  let perguntou = false;
  const pergunta = () => {
    if (perguntou) return; perguntou = true;
    MODELOS.forEach((m, i) => m.pronto && existe(m).then(ok => {
      estado[m.slug] = ok ? 'pronto' : 'falta';
      const st = abas[i].querySelector('.fn-st');
      st.textContent = ok ? 'ver modelo' : 'em preparação';
      abas[i].classList.toggle('pronto', ok);
      if (i === atual) desenha();
    }));
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); pergunta(); } }, { rootMargin: '800px 0px' });
    io.observe(sec);
  } else pergunta();

  // quadro 8 + rodapé = a última tela: o quadro desconta a altura do rodapé (0 quando o rodapé está escondido)
  const rp = document.querySelector('body > footer.rp');
  const mede = () => sec.style.setProperty('--fn-rp', (rp ? rp.offsetHeight : 0) + 'px');
  mede();
  if (rp && 'ResizeObserver' in window) new ResizeObserver(mede).observe(rp);
  addEventListener('resize', mede, { passive: true });
}

})();
/* ===== 90-conversa.js */
;(()=>{
// Endereço /exec do Google Apps Script que recebe o formulário (planilha da Roomi + e-mail pra marketing@roomi.digital;
// o script mora em tools/formulario/). Vazio = o envio ainda não está ligado: o formulário oferece "Enviar por e-mail".
const ENDERECO_FORM = 'https://script.google.com/macros/s/AKfycbz0hmFGwbbNj5hWhk_59NtRVENguPYuz6IVdnhaiX8u0FhwGnXd3zsJLh1CRqj7_0JW/exec';

// Formulário "Vamos conversar mais" (o HTML é o 90-conversa.html, o CSS o 90-conversa.css; plano em
// gestao/formulario-plano.md). Prefixo 90- de propósito: o JS de 00- e 90- roda em toda página sem guarda.
// Qualquer botão ou link com data-conversa abre a tela (sem JS ele segue o próprio href, um mailto).
// Tela: <dialog> modal; fecha no X, no Esc e no "Fechar" do fim; Tab preso dentro; rolagem da página travada; o foco
// volta pro botão que abriu. Três passos (frases do mural · contato · simulação) e o fim.
// Envio (contrato com o Apps Script): POST text/plain (sem preflight) com o JSON de dados(); a resposta é {"ok":true}.
// Sucesso = resposta lida com ok === true; qualquer outra coisa mostra a faixa de falha, sem perder o que foi digitado.
// O id é um por envio: nasce na primeira tentativa e se repete se a pessoa tentar de novo (o script pode descartar o repetido).
const dlg = document.getElementById('conversa');
const C = window.RoomiCalc;
if (dlg && C) {
  dlg.hidden = false; // nasce hidden pra não aparecer sem JS; daqui pra frente quem manda é o [open] do <dialog>
  const form = dlg.querySelector('.cv-form');
  const q = s => dlg.querySelector(s), qq = s => [...dlg.querySelectorAll(s)];
  const passos = { 1: q('[data-passo="1"]'), 2: q('[data-passo="2"]'), 3: q('[data-passo="3"]'), fim: q('[data-passo="fim"]') };
  const bt = n => q('.cv-pe [data-cv="' + n + '"]');
  const falha = q('[data-cv="falha"]');
  // deOnde: o passo de onde saiu o envio (o Voltar do fim "por e-mail" volta pra ele); enviado: o envio deu certo
  let atual = 1, quemAbriu = null, idEnvio = null, enviando = false, deOnde = 2, enviado = false;

  // ---- abrir e fechar
  const abre = gatilho => {
    quemAbriu = gatilho || document.activeElement;
    if (dlg.open) return;
    if (enviado) limpaTudo(); // reabriu depois de um envio que deu certo: começa do zero
    const barra = innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add('cv-trava');
    if (barra > 0) document.body.style.paddingRight = barra + 'px';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    vai(atual, true);
  };
  const solta = () => {
    document.documentElement.classList.remove('cv-trava');
    document.body.style.paddingRight = '';
    if (quemAbriu && quemAbriu.isConnected && quemAbriu.getClientRects().length) quemAbriu.focus();
  };
  const fecha = () => { if (dlg.open) { if (dlg.close) dlg.close(); else { dlg.removeAttribute('open'); solta(); } } };
  dlg.addEventListener('close', solta);
  dlg.addEventListener('cancel', e => { e.preventDefault(); fecha(); }); // Esc
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-conversa]');
    if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    abre(a);
  });
  // Tab preso: do último focável volta pro primeiro (e o contrário com Shift)
  dlg.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); fecha(); return; }
    if (e.key !== 'Tab') return;
    const fs = qq('a[href],button:not([disabled]),input:not([tabindex="-1"]),select,textarea,[tabindex="0"]').filter(el => el.getClientRects().length && !el.closest('[hidden]'));
    if (!fs.length) return;
    const i = fs.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); fs[fs.length - 1].focus(); }
    else if (!e.shiftKey && (i === fs.length - 1 || i < 0)) { e.preventDefault(); fs[0].focus(); }
  });

  // ---- passos: mostra o passo, os botões do pé dele e o "Passo N de 3"; o foco vai pro título
  const PE = { 1: ['pular', 'avancar'], 2: ['voltar', 'enviar-ja', 'avancar'], 3: ['voltar', 'enviar'], fim: ['fechar'] };
  function vai(n, abrindo) {
    atual = n;
    if (n === 2) cartao();
    Object.keys(passos).forEach(k => { passos[k].hidden = String(k) !== String(n); });
    qq('.cv-pe [data-cv]').forEach(b => { b.hidden = !PE[n].includes(b.dataset.cv); });
    if (n === 'fim') bt('voltar').hidden = !passos.fim.querySelector('[data-fim="email"]:not([hidden])');
    q('[data-cv="passo"] b').textContent = n === 'fim' ? 3 : n;
    q('[data-cv="passo"]').hidden = n === 'fim';
    dlg.style.setProperty('--cv-n', n === 'fim' ? 3 : n);
    falha.hidden = true;
    q('.cv-corpo').scrollTop = 0;
    const t = passos[n].querySelector(n === 'fim' ? 'div:not([hidden]) h2' : 'h2');
    if (t) t.focus({ preventScroll: true });
    if (abrindo && !t) q('.cv-x').focus();
  }
  dlg.querySelector('.cv-pe').addEventListener('click', e => {
    const b = e.target.closest('[data-cv]');
    if (!b) return;
    const a = b.dataset.cv;
    if (a === 'pular' || (a === 'avancar' && atual === 1)) vai(2);
    else if (a === 'avancar' && atual === 2) { if (valida()) vai(3); }
    else if (a === 'voltar') vai(atual === 'fim' ? deOnde : atual - 1);
    else if (a === 'enviar-ja') { if (valida()) envia(false); }
    else if (a === 'enviar') { if (valida()) envia(true); else vai(2), valida(); }
    else if (a === 'fechar') fecha();
  });
  q('.cv-x').addEventListener('click', fecha);
  form.addEventListener('submit', e => e.preventDefault());
  // Enter num campo de texto do passo 2 não envia o form (o <form> não tem botão submit; isto é só pra garantir)
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])')) e.preventDefault(); });

  // ---- passo 1: post-its marcam e desmarcam, no máximo 10; com 10 marcados os outros ficam travados (aria-disabled,
  // continuam focáveis) e aparece o aviso "Para trocar, desmarque uma."
  const TETO = 10;
  const notas = qq('.cv-nota');
  const contaNotas = () => {
    const n = notas.filter(b => b.getAttribute('aria-pressed') === 'true').length, cheio = n >= TETO;
    q('[data-cv="marcadas"]').textContent = n;
    notas.forEach(b => { if (cheio && b.getAttribute('aria-pressed') !== 'true') b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); });
    q('[data-cv="teto"]').hidden = !cheio;
  };
  notas.forEach(b => b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    contaNotas();
  }));

  // ---- passo 2: validação leve (nome; e-mail ou telefone; o que foi preenchido tem de fazer sentido; consentimento)
  const campo = n => form.elements[n];
  const erro = (n, msg) => {
    const i = campo(n), el = q('#cv-e-' + n);
    i.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (el) el.textContent = msg || '';
    return !msg;
  };
  const digitos = s => s.replace(/\D/g, '');
  function valida() {
    const nome = campo('nome').value.trim(), email = campo('email').value.trim(), tel = campo('telefone').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), telOk = digitos(tel).length >= 10 && digitos(tel).length <= 15;
    const r = [
      erro('nome', nome ? '' : 'Escreva o seu nome.'),
      erro('email', email && !emailOk ? 'Confira o e-mail.' : !email && !tel ? 'Deixe um e-mail ou um telefone.' : ''),
      erro('telefone', tel && !telOk ? 'Confira o telefone, com DDD.' : !email && !tel ? 'Deixe um e-mail ou um telefone.' : ''),
      erro('consentimento', campo('consentimento').checked ? '' : 'Marque a caixa para a gente poder entrar em contato.')
    ];
    const ok = r.every(Boolean), alerta = q('[data-cv="alerta"]');
    alerta.hidden = ok;
    alerta.textContent = ok ? '' : 'Falta pouco: confira os campos marcados.';
    if (!ok) { const p = q('[aria-invalid="true"]'); if (p) p.focus(); }
    return ok;
  }
  // o erro some assim que a pessoa corrige o campo
  passos[2].addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') valida(), e.target.focus(); });
  passos[2].addEventListener('change', e => { if (e.target.name === 'consentimento' && e.target.getAttribute('aria-invalid') === 'true') valida(), e.target.focus(); });

  // o cartão do passo 2: repete o que a pessoa digita e o que marcou (passo 1 e "Quero conhecer"); vazio = texto-guia
  const mostra = k => q('[data-mostra="' + k + '"]');
  const poeTexto = (k, v, guia) => { const el = mostra(k); el.textContent = v || guia; el.classList.toggle('cv-vazio', !v); };
  const tag = (txt, cls) => { const s = document.createElement('span'); s.textContent = txt; if (cls) s.className = cls; return s; };
  function cartao() {
    const v = n => campo(n).value.trim();
    poeTexto('nome', v('nome'), 'Seu nome');
    poeTexto('quem', [v('cargo'), v('empresa')].filter(Boolean).join(' · '), 'Cargo · Empresa');
    poeTexto('email', v('email'), 'e-mail');
    poeTexto('telefone', v('telefone'), 'telefone');
    const ns = notas.filter(b => b.getAttribute('aria-pressed') === 'true'), box = mostra('notas');
    box.replaceChildren(...ns.slice(0, 3).map(b => { const s = tag(b.textContent.trim()); s.style.cssText = b.style.cssText; return s; }));
    if (ns.length > 3) { const e = document.createElement('em'); e.textContent = 'e mais ' + (ns.length - 3); box.append(e); }
    mostra('notas-sec').hidden = !ns.length;
    const cs = qq('input[name="conhecer"]:checked').map(i => i.value);
    mostra('conhecer').replaceChildren(...(cs.length ? cs.map(t => tag(t)) : [tag('nada marcado ainda', 'cv-vazio')]));
  }
  passos[2].addEventListener('input', cartao);
  passos[2].addEventListener('change', cartao);

  // ---- passo 3: a calculadora (mesma conta e mesmo comportamento da home, 07-quem-calc.js, via window.RoomiCalc)
  const calc = passos[3], msg = q('[data-cv="msg"]'), cens = qq('.cv-cen');
  const k = n => calc.querySelector('input[data-k="' + n + '"]');
  const valor = n => C.faixa(n, C.lerTexto(k(n).value));
  let usouExemplo = false, resultado = null;
  function atualiza() {
    const h = {}; C.CAMPOS.forEach(n => { h[n] = valor(n); });
    const falta = C.CAMPOS.filter(n => isNaN(h[n])).length;
    resultado = null;
    let texto = '';
    if (falta) texto = falta === C.CAMPOS.length ? 'Preencha os 7 campos ou veja um hotel exemplo.' : 'Falta' + (falta > 1 ? 'm ' : ' ') + falta + ' campo' + (falta > 1 ? 's' : '') + '.';
    else if (h.otas + h.oper > 100) texto = 'OTAs e operadoras passam de 100% da receita.';
    else { resultado = { h, r: C.p2Calc(h, C.P) }; texto = 'Receita de diárias hoje: ' + C.p2Brl(resultado.r.base) + ' por ano.'; }
    calc.classList.toggle('cv-pronta', !!resultado);
    msg.textContent = (resultado && usouExemplo ? 'Hotel exemplo · ' : '') + texto;
    cens.forEach(c => {
      const p = resultado ? C.p2Partes(resultado.r.cen[c.dataset.c].total) : { n: '?', u: '' };
      c.querySelector('b').textContent = p.n;
      c.querySelector('.cv-gu').textContent = p.u;
    });
  }
  const vazia = () => !C.CAMPOS.some(n => k(n).value.trim());
  calc.addEventListener('input', e => { if (e.target.dataset.k) { if (usouExemplo && vazia()) usouExemplo = false; calc.classList.toggle('cv-redef', usouExemplo); atualiza(); } });
  calc.addEventListener('change', e => { const n = e.target.dataset.k; if (!n) return; const v = valor(n); if (!isNaN(v)) e.target.value = C.p2Campo(n, v); atualiza(); });
  q('[data-cv="exemplo"]').addEventListener('click', () => {
    usouExemplo = !usouExemplo;
    C.CAMPOS.forEach(n => { k(n).value = usouExemplo ? C.p2Campo(n, C.EXEMPLO[n]) : ''; });
    calc.classList.toggle('cv-redef', usouExemplo);
    atualiza();
  });

  // ---- envio
  const marcadas = () => notas.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.trim());
  const numerosJunto = () => form.elements.numeros.value === 'sim';
  function dados(comCalc) {
    const v = n => campo(n).value.trim();
    const R = Math.round;
    let c = null;
    if (comCalc && numerosJunto() && resultado) {
      const { h, r } = resultado;
      c = { quartos: h.quartos, occ: h.occ, dm: h.dm, otas: h.otas, comOta: h.comOta, oper: h.oper, comOp: h.comOp,
        receitaHoje: R(r.base), conservador: R(r.cen.cons.total), provavel: R(r.cen.prov.total), forte: R(r.cen.forte.total) };
    }
    return { id: idEnvio, origem: location.href, enviadoEm: new Date().toISOString(), identifica: marcadas(),
      nome: v('nome'), empresa: v('empresa'), cargo: v('cargo'), email: v('email'), telefone: v('telefone'), comoSoube: v('comoSoube'),
      conhecer: qq('input[name="conhecer"]:checked').map(i => i.value), conteMais: v('conteMais'), consentimento: true,
      calc: c, hp: campo('hp').value };
  }
  // o resumo do mailto (sem endereço configurado ou envio que falhou)
  function resumo(d) {
    const brl = x => 'R$ ' + C.p2Num(x, 0);
    const l = ['Vamos conversar mais (formulário do site)', '',
      'Nome: ' + d.nome, 'Empresa: ' + (d.empresa || '-'), 'Cargo: ' + (d.cargo || '-'), 'E-mail: ' + (d.email || '-'), 'Telefone: ' + (d.telefone || '-'),
      'Como ficou sabendo: ' + (d.comoSoube || '-'), 'Quer conhecer: ' + (d.conhecer.join(', ') || '-'),
      'Com o que se identifica: ' + (d.identifica.length ? '' : '-'), ...d.identifica.map(t => '- ' + t), 'Nos conte mais: ' + (d.conteMais || '-')];
    if (d.calc) l.push('', 'Simulação: ' + d.calc.quartos + ' quartos, ocupação ' + d.calc.occ + '%, diária ' + brl(d.calc.dm) +
      ', OTAs ' + d.calc.otas + '% (comissão ' + d.calc.comOta + '%), operadoras ' + d.calc.oper + '% (comissão ' + d.calc.comOp + '%)',
      'Receita de diárias hoje: ' + brl(d.calc.receitaHoje) + ' por ano',
      'Ganho por ano: conservador ' + brl(d.calc.conservador) + ', provável ' + brl(d.calc.provavel) + ', forte ' + brl(d.calc.forte));
    l.push('', 'Concordo que a Roomi use estes dados para entrar em contato comigo.');
    return 'mailto:marketing@roomi.digital?subject=' + encodeURIComponent('Vamos conversar mais: ' + d.nome) + '&body=' + encodeURIComponent(l.join('\n'));
  }
  const novoId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  async function envia(comCalc) {
    if (enviando) return;
    deOnde = atual;
    if (!idEnvio) idEnvio = novoId();
    const d = dados(comCalc);
    qq('[data-cv="mailto"]').forEach(a => { a.href = resumo(d); });
    if (!ENDERECO_FORM) { mostraFim('email'); return; }
    enviando = true;
    const b = bt(comCalc ? 'enviar' : 'enviar-ja'), txt = b.textContent;
    qq('.cv-pe button').forEach(x => { x.disabled = true; });
    b.textContent = 'Enviando…';
    falha.hidden = true;
    let ok = false;
    try {
      const r = await fetch(ENDERECO_FORM, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) });
      const j = await r.json();
      ok = !!j && j.ok === true;
    } catch (e) { ok = false; }
    enviando = false;
    qq('.cv-pe button').forEach(x => { x.disabled = false; });
    b.textContent = txt;
    if (ok) { enviado = true; mostraFim('ok'); }
    else { falha.hidden = false; falha.querySelector('a').focus(); }
  }
  function mostraFim(qual) {
    qq('[data-fim]').forEach(el => { el.hidden = el.dataset.fim !== qual; });
    if (qual === 'ok') {
      // "Recebemos, Maria." com o primeiro nome digitado (sem nome, só "Recebemos.")
      const ola = q('[data-cv="ola"]'), primeiro = campo('nome').value.trim().split(/\s+/)[0] || '';
      ola.textContent = '';
      if (primeiro) { const n = document.createElement('span'); n.className = 'hl'; n.textContent = primeiro; ola.append(', ', n); }
    }
    vai('fim');
    // o aviãozinho: tira e põe a classe pra animação recomeçar a cada envio
    passos.fim.classList.remove('cv-voa');
    if (qual === 'ok') { void passos.fim.offsetWidth; passos.fim.classList.add('cv-voa'); }
  }
  // depois de um envio que deu certo, a próxima abertura começa do zero
  function limpaTudo() {
    form.reset();
    notas.forEach(b => b.setAttribute('aria-pressed', 'false'));
    contaNotas();
    qq('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
    qq('.cv-erro').forEach(e => { e.textContent = ''; });
    q('[data-cv="alerta"]').hidden = true;
    usouExemplo = false;
    calc.classList.remove('cv-redef');
    idEnvio = null;
    enviado = false;
    atualiza();
    atual = 1;
  }
  atualiza();
}

})();
/* ===== c1-cubo.js */
;(()=>{if(!document.querySelector('[data-secao="c1-cubo"]'))return;
// c1 · Como o Cubo trabalha. Duas vistas no mesmo cartão, trocadas por abas (a vista "As telas" subiu pro cabeçalho k1):
// 1 Fontes e saídas: porte do 42-cubo-fluxo (fios desenhados medindo os botões; relógio com cargas às 06:00 e 14:00,
//   que só roda com a vista aberta e o bloco na tela; clique numa fonte/saída realça o caminho). Na primeira vez que o
//   quadro aparece com essa vista aberta, as fontes e as saídas chegam escalonadas e os fios se desenham (.is-vem).
// 2 Por dentro: porte do 43-cubo-camadas (três partes, cada uma com a tela do Cubo onde aparece).
// Sem JS, as duas vistas aparecem empilhadas e legíveis. Com movimento reduzido, nada anima.
const sec = document.querySelector('.c1');
if (sec) {
  sec.classList.add('is-js', 'is-convite');
  const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visivel = false;

  // ---------- abas (genéricas para os dois grupos: vistas e partes)
  const abas = (lista, aoTrocar) => {
    const bs = [...lista.querySelectorAll('[role=tab]')];
    const vai = (b, foco, anima) => {
      bs.forEach(x => {
        const on = x === b;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        const p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) {
          p.hidden = !on;
          if (on && anima && !reduz()) { p.classList.remove('is-entra'); void p.offsetWidth; p.classList.add('is-entra'); }
        }
      });
      if (foco) b.focus();
      if (aoTrocar) aoTrocar(b);
    };
    bs.forEach((b, i) => {
      b.addEventListener('click', () => vai(b, false, true));
      b.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        vai(bs[(i + d + bs.length) % bs.length], true, true);
      });
    });
    vai(bs.find(b => b.getAttribute('aria-selected') === 'true') || bs[0], false, false);
  };

  // ---------- 1 · fontes e saídas
  const fx = sec.querySelector('.c1-fx');
  const palco = fx && fx.querySelector('.c1-fx-palco');
  const fios = fx && fx.querySelector('.c1-fios');
  const cubo = fx && fx.querySelector('.c1-cubo-svg');
  const fontes = fx ? [...fx.querySelectorAll('.c1-fonte')] : [];
  const saidas = fx ? [...fx.querySelectorAll('.c1-saida')] : [];
  const leg = fx && fx.querySelector('.c1-legenda span');
  const legBox = fx && fx.querySelector('.c1-legenda');
  const legPadrao = leg ? leg.textContent : '';
  const VB = { x: 690, y: 150, w: 340 };
  let sel = null, agenda = () => {}, relogio = { inicia() {}, para() {} };

  if (fx && palco && fios && cubo) {
    const marca = k => fx.querySelectorAll('[data-fx-k]').forEach(n => {
      const on = n.dataset.fxK === k;
      n.classList.toggle('is-on', on);
      if (n.hasAttribute('aria-pressed')) n.setAttribute('aria-pressed', String(on));
    });
    const curva = (x1, y1, x2, y2) => { const m = (x1 + x2) / 2; return `M${x1.toFixed(1)} ${y1.toFixed(1)} C ${m.toFixed(1)} ${y1.toFixed(1)}, ${m.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
    // mede pela caixa sem o deslocamento de entrada (translate), pra os fios nascerem no lugar final dos botões
    const caixa = b => { const r = b.getBoundingClientRect(), t = getComputedStyle(b).translate; if (!t || t === 'none') return r; const [dx = 0, dy = 0] = t.split(' ').map(parseFloat); return { left: r.left - dx, right: r.right - dx, top: r.top - (dy || 0), height: r.height }; };
    const desenha = () => {
      if (getComputedStyle(fios).display === 'none') return;
      const P = palco.getBoundingClientRect(), C = cubo.getBoundingClientRect();
      if (!P.width || !C.width) return;
      const s = C.width / VB.w;
      const cx = x => C.left - P.left + (x - VB.x) * s, cy = y => C.top - P.top + (y - VB.y) * s;
      const fio = [], corre = [], part = [], porta = [], pulso = [];
      // pulso: um ponto de luz que viaja pelo fio (halo + miolo), disparado pelo relógio entre as cargas
      const umPulso = (lado, k, i, d) => `<g class="c1-pulso c1-pulso-${lado}" data-fx-k="${k}" data-n="${i}"><path class="c1-pulso-h" pathLength="100" d="${d}"/><path class="c1-pulso-n" pathLength="100" d="${d}"/></g>`;
      fontes.forEach((b, i) => {
        const r = caixa(b), k = b.dataset.fxK;
        const d = curva(r.right - P.left, r.top - P.top + r.height / 2, cx(728), cy(265 + 22 * i));
        fio.push(`<path class="c1-fio c1-fio-e" data-fx-k="${k}" style="--i:${i}" pathLength="100" d="${d}"/>`);
        corre.push(`<path class="c1-corre" data-fx-k="${k}" pathLength="100" d="${d}"/>`);
        part.push(`<path class="c1-part c1-part-a" style="--i:${i}" pathLength="100" d="${d}"/><path class="c1-part c1-part-b" style="--i:${i}" pathLength="100" d="${d}"/>`);
        porta.push(`<circle class="c1-porta" style="--i:${i}" cx="${(r.right - P.left).toFixed(1)}" cy="${(r.top - P.top + r.height / 2).toFixed(1)}" r="3.5"/>`);
        pulso.push(umPulso('e', k, i, d));
      });
      saidas.forEach((b, i) => {
        const r = caixa(b), k = b.dataset.fxK;
        const d = curva(cx(992), cy(265 + 22 * i), r.left - P.left, r.top - P.top + r.height / 2);
        fio.push(`<path class="c1-fio c1-fio-s" data-fx-k="${k}" style="--i:${i}" pathLength="100" d="${d}"/>`);
        corre.push(`<path class="c1-corre" data-fx-k="${k}" pathLength="100" d="${d}"/>`);
        part.push(`<path class="c1-part c1-part-s" style="--i:${i}" pathLength="100" d="${d}"/>`);
        porta.push(`<circle class="c1-porta c1-porta-s" style="--i:${i}" cx="${(r.left - P.left).toFixed(1)}" cy="${(r.top - P.top + r.height / 2).toFixed(1)}" r="3.5"/>`);
        pulso.push(umPulso('s', k, i, d));
      });
      fios.setAttribute('viewBox', `0 0 ${P.width.toFixed(1)} ${P.height.toFixed(1)}`);
      fios.innerHTML = fio.join('') + corre.join('') + pulso.join('') + part.join('') + porta.join('');
      if (sel) marca(sel);
    };
    let pedido = 0;
    agenda = () => { if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; desenha(); }); };
    if ('ResizeObserver' in window) new ResizeObserver(agenda).observe(palco);
    else window.addEventListener('resize', agenda);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(agenda);

    const escreve = alvo => {
      if (!leg) return;
      leg.textContent = '';
      legBox.classList.toggle('is-cheia', !!alvo);
      if (!alvo) { leg.textContent = legPadrao; return; }
      const b = document.createElement('b');
      b.textContent = alvo.dataset.fxNome + ':';
      leg.append(b, ' ' + alvo.dataset.fxLeg);
    };
    const limpa = () => { sel = null; fx.classList.remove('is-foco'); marca(null); escreve(null); };
    fx.classList.add('is-convite');
    fx.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button[data-fx-k]');
      if (b && fx.contains(b)) {
        fx.classList.remove('is-convite');
        const k = b.dataset.fxK;
        if (sel === k) return limpa();
        sel = k; fx.classList.add('is-foco'); marca(k); escreve(b);
      } else if (sel) limpa();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && sel) limpa(); });

    // relógio: 1 h = 560 ms; às 06:00 e às 14:00 acontece a carga
    const MS_POR_HORA = 560, CARGAS = [6, 14], JANELA = 2200, DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
    const elDia = fx.querySelector('.c1-dia'), elHora = fx.querySelector('.c1-hora'), elRot = fx.querySelector('.c1-rot');
    const elPh = fx.querySelector('.c1-ph'), elPm = fx.querySelector('.c1-pm');
    let raf = 0, rodando = false, h = 4, dia = 0, tAnt = 0, tCarga = -1e9, ultima = 6;
    const dois = n => (n < 10 ? '0' : '') + n;
    const pinta = agora => {
      const hh = Math.floor(h), mi = Math.floor((h - hh) * 60);
      if (elDia) elDia.textContent = DIAS[dia % 7];
      if (elHora) elHora.textContent = dois(hh) + ':' + dois(mi);
      if (elRot) {
        const emCarga = agora - tCarga < JANELA;
        elRot.classList.toggle('is-agora', emCarga);
        elRot.textContent = emCarga ? (ultima === 6 ? 'carga da manhã' : 'carga da tarde') : 'próxima carga ' + (h >= 6 && h < 14 ? '14:00' : '06:00');
      }
      if (elPh) elPh.style.transform = `rotate(${(h % 12) * 30}deg)`;
      if (elPm) elPm.style.transform = `rotate(${(h % 1) * 360}deg)`;
    };
    const estatico = () => {
      fx.classList.remove('is-carga');
      if (elDia) elDia.textContent = 'seg';
      if (elHora) elHora.textContent = '06:00';
      if (elRot) { elRot.textContent = 'carga da manhã'; elRot.classList.remove('is-agora'); }
      if (elPh) elPh.style.transform = '';
      if (elPm) elPm.style.transform = '';
    };
    const carga = (qual, agora) => { ultima = qual; tCarga = agora; fx.classList.remove('is-carga'); void fx.offsetWidth; fx.classList.add('is-carga'); };

    // pulsos: entre as cargas, um ponto de luz sai de uma fonte (que acende), chega ao Cubo (que brilha) e segue
    // pra uma saída (que acende quando ele chega). Um por vez a cada PULSO ms, fora da janela de cada carga.
    // Com um caminho escolhido (clique), os pulsos passam só por ele.
    const PULSO = 1000, VIAGEM_E = 1250, VIAGEM_S = 1000, ORDEM_E = [0, 3, 1, 4, 2, 5], ORDEM_S = [2, 0, 4, 1, 5, 3];
    let proxPulso = 0, nPulso = 0;
    const dispara = g => { if (!g) return; g.classList.remove('is-vai'); void g.getBoundingClientRect(); g.classList.add('is-vai'); };
    const pisca = (el, cls, ms) => { if (!el) return; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
    const escolhido = lista => lista.findIndex(b => b.dataset.fxK === sel);
    const pulsa = () => {
      const ge = fios.querySelectorAll('.c1-pulso-e'), gs = fios.querySelectorAll('.c1-pulso-s');
      if (!ge.length || !gs.length) return;
      const fe = escolhido(fontes), fs = escolhido(saidas);
      if (sel && fe < 0 && fs < 0) return;
      const i = fe >= 0 ? fe : ORDEM_E[nPulso % ORDEM_E.length], j = fs >= 0 ? fs : ORDEM_S[nPulso % ORDEM_S.length];
      nPulso++;
      // com um caminho escolhido, só o lado dele anda e acende: escolhida uma fonte, o pulso para no Cubo; escolhida
      // uma saída, ele já sai do Cubo (antes uma fonte ou saída apagada acendia sem pulso visível no fio dela)
      const soE = sel && fe >= 0, soS = sel && fs >= 0;
      if (!soS) { dispara(ge[i]); pisca(fontes[i], 'is-envia', 650); }
      setTimeout(() => {
        if (!rodando) return;
        pisca(fx, 'is-recebe', 520);
        if (soE) return;
        dispara(fios.querySelectorAll('.c1-pulso-s')[j]);
        setTimeout(() => { if (rodando) pisca(saidas[j], 'is-chega', 900); }, VIAGEM_S - 80);
      }, soS ? 0 : VIAGEM_E - 60);
    };
    const passo = agora => {
      if (!rodando) { raf = 0; return; }
      const dt = Math.min(agora - tAnt, 100);
      tAnt = agora;
      let antes = h;
      h += dt / MS_POR_HORA;
      if (h >= 24) { h -= 24; dia++; antes -= 24; }
      CARGAS.forEach(c => { if (antes < c && h >= c) carga(c, agora); });
      pinta(agora);
      if (agora >= proxPulso) {
        // longe da carga: as partículas dela já passaram e a próxima não sai antes do pulso chegar ao Cubo
        const falta = Math.min(...CARGAS.map(c => ((c - h + 24) % 24) * MS_POR_HORA));
        if (agora - tCarga > 2600 && falta > VIAGEM_E) { pulsa(); proxPulso = agora + PULSO; }
        else proxPulso = agora + 200;
      }
      raf = requestAnimationFrame(passo);
    };
    relogio = {
      para() { rodando = false; if (raf) cancelAnimationFrame(raf); raf = 0; estatico(); },
      inicia() {
        if (rodando) return;
        this.para();
        if (reduz()) return;
        h = 4; dia = 0; tCarga = -1e9; rodando = true; tAnt = performance.now();
        // os pulsos só começam depois que os fios terminaram de se desenhar
        proxPulso = tAnt + (sec.classList.contains('is-veio') ? 600 : 1900);
        pinta(tAnt);
        raf = requestAnimationFrame(passo);
      },
    };
  }
  const fxAberto = () => fx && !fx.hidden;

  // entrada da vista "Fontes e saídas": uma vez, quando o quadro está na tela com ela aberta.
  // .is-vem dispara a chegada escalonada e o desenho dos fios; .is-veio deixa tudo no lugar (os fios redesenhados
  // num redimensionamento não se desenham de novo).
  let veio = false;
  const entra = () => {
    if (veio || !visivel || !fxAberto()) return;
    veio = true;
    if (reduz()) { sec.classList.add('is-veio'); return; }
    agenda();
    requestAnimationFrame(() => sec.classList.add('is-vem'));
    setTimeout(() => { sec.classList.add('is-veio'); sec.classList.remove('is-vem'); }, 2000);
  };
  const ajustaRelogio = () => { entra(); if (visivel && fxAberto()) relogio.inicia(); else relogio.para(); };

  // ---------- 2 · por dentro
  const caLista = sec.querySelector('.c1-ca-abas');
  if (caLista) {
    abas(caLista);
    // o cartão inteiro da parte escolhe a parte (o botão dentro dele é a aba de verdade)
    caLista.querySelectorAll('.c1-ca-parte').forEach(p => p.addEventListener('click', e => {
      const b = p.querySelector('[role=tab]');
      if (b && !b.contains(e.target) && b.getAttribute('aria-selected') !== 'true') b.click();
    }));
  }

  // ---------- vistas
  const lista = sec.querySelector('.c1-abas');
  if (lista) {
    let primeira = true;
    abas(lista, () => {
      if (!primeira) sec.classList.remove('is-convite');
      primeira = false;
      if (fxAberto()) agenda();
      ajustaRelogio();
    });
  }

  // ---------- profundidade: fonte, saída e parte inclinam de leve na direção do mouse e o brilho segue o ponteiro
  // (só com mouse de verdade; a transição do CSS amortece)
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduz()) {
    sec.querySelectorAll('.c1-fonte,.c1-saida,.c1-ca-parte').forEach(el => {
      let raf = 0, ev = null;
      const aplica = () => {
        raf = 0;
        const r = el.getBoundingClientRect();
        if (!r.width || !ev) return;
        const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        el.style.setProperty('--ry', ((x - .5) * 5).toFixed(2) + 'deg'); el.style.setProperty('--rx', ((.5 - y) * 6).toFixed(2) + 'deg');
      };
      el.addEventListener('pointermove', e => { ev = e; if (!raf) raf = requestAnimationFrame(aplica); }, { passive: true });
      el.addEventListener('pointerleave', () => { ev = null; ['--gx', '--gy', '--rx', '--ry'].forEach(p => el.style.removeProperty(p)); });
    });
  }

  if ('IntersectionObserver' in window) {
    let carregou = false;
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !carregou) {
        carregou = true;
        sec.querySelectorAll('.c1-ca-tela img').forEach(i => { i.loading = 'eager'; });
      }
    }), { rootMargin: '400px 0px' }).observe(sec);
    new IntersectionObserver(es => es.forEach(e => { visivel = e.isIntersecting; ajustaRelogio(); }), { threshold: .3 }).observe(sec);
  } else sec.classList.add('is-veio');
}

})();
/* ===== c2-materiais.js */
;(()=>{if(!document.querySelector('[data-secao="c2-materiais"]'))return;
// c2 · biblioteca dos materiais (prefixo c2-): filtro por tema e páginas de capas, tudo na mesma tela (lógica do 62-materiais do v4).
// A contagem de cada tema sai da própria lista (nada digitado). "Todos" não mostra contagem total, de propósito.
// v9 (da v8): no site, sem paginação; as capas do tema ficam numa grade que rola dentro do quadro (o CSS cuida da rolagem).
// No modo slide (body.pg-apresentacao: deck e proposta) fica a paginação da v7: quantas capas cabem por página depende
// da altura do cartão, o JS mede e calcula as linhas (sem rolagem dentro do slide, e a impressão sai sem corte).
// Links #tema-<id> (inclusive os da home: materiais.html#tema-...) escolhem o tema. Sem JS, todas as capas aparecem em grade.
const sec = document.querySelector('.c2');
const grade = sec && sec.querySelector('.c2-grade');
if (sec && grade) {
  sec.classList.add('is-js');
  const itens = [...grade.querySelectorAll('.c2-item')];
  const filtros = [...sec.querySelectorAll('.c2-f')];
  const nome = sec.querySelector('.c2-nome'), qtd = sec.querySelector('.c2-qtd');
  const pag = sec.querySelector('.c2-pag'), pagN = sec.querySelector('.c2-pag-n');
  const [ant, prox] = [...sec.querySelectorAll('.c2-pag-b')];
  const celular = matchMedia('(max-width: 900px)');
  const slide = document.body.matches('.pg-apresentacao');
  const reduz = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tema = 'todos', pagina = 0, porPag = 8;

  // v7 · leque fino: cada capa ganha um reflexo (.c2-brilho); com mouse de verdade, a capa inclina na direção dele e o
  // reflexo segue o ponteiro (--rx/--ry/--gx/--gy; a transição do CSS amortece)
  // v10 · os trancados (.c2-fecha, só para clientes) não ganham reflexo nem inclinação: ganham o cadeado sobre a capa
  const abertos = itens.filter(it => !it.classList.contains('c2-fecha'));
  const cadeado = '<i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.6v2.2"/></svg></i><b>Fala com a gente!</b>';
  itens.forEach(it => {
    const g = document.createElement(abertos.includes(it) ? 'i' : 'span');
    g.className = abertos.includes(it) ? 'c2-brilho' : 'c2-cad';
    if (!abertos.includes(it)) g.innerHTML = cadeado;
    g.setAttribute('aria-hidden', 'true');
    it.insertBefore(g, it.querySelector('.c2-t'));
  });
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduz()) {
    abertos.forEach(it => {
      const capa = it.querySelector('img');
      let raf = 0, ev = null, caixa = null;
      const aplica = () => {
        raf = 0;
        // a caixa da capa é lida na entrada do mouse e guardada (a capa inclina, e ler de novo a cada quadro forçava layout)
        const r = caixa || (caixa = (capa || it).getBoundingClientRect());
        if (!r.width || !ev) return;
        const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y = Math.min(1.2, Math.max(0, (ev.clientY - r.top) / r.height));
        it.style.setProperty('--ry', ((x - .5) * 12).toFixed(2) + 'deg');
        it.style.setProperty('--rx', ((.5 - Math.min(1, y)) * 8).toFixed(2) + 'deg');
        it.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        it.style.setProperty('--gy', (Math.min(1, y) * 100).toFixed(1) + '%');
      };
      it.addEventListener('pointermove', e => { ev = e; if (!raf) raf = requestAnimationFrame(aplica); }, { passive: true });
      it.addEventListener('pointerleave', () => { ev = null; caixa = null; ['--rx', '--ry', '--gx', '--gy'].forEach(p => it.style.removeProperty(p)); });
      it.addEventListener('wheel', () => { caixa = null; }, { passive: true });
    });
  }

  // contagem por tema, a partir da lista
  filtros.forEach(b => {
    const s = b.querySelector('small');
    if (s && b.dataset.tema !== 'todos') s.textContent = itens.filter(i => i.dataset.tema === b.dataset.tema).length;
  });

  // quantas capas cabem: colunas da grade × linhas que cabem na altura dela
  const mede = () => {
    if (!slide) return Infinity; // site: uma página só, a grade rola
    const cols = getComputedStyle(grade).gridTemplateColumns.split(' ').filter(Boolean).length || 4;
    // celular: 2 fileiras por página (os temas agora quebram em linhas e ocupam a altura de uma fileira de capas)
    if (celular.matches) return cols * 2;
    // a capa mais alta do tema (título longo quebra em 3 ou 4 linhas e estica a fileira dela): mostra todas por um
    // instante, mede e volta. Medir só a primeira cortava embaixo a fileira com título longo
    const doT = doTema(), antes = doT.map(i => i.hidden);
    doT.forEach(i => { i.hidden = false; });
    const hItem = Math.max(0, ...doT.map(i => i.offsetHeight));
    doT.forEach((i, k) => { i.hidden = antes[k]; });
    const gap = parseFloat(getComputedStyle(grade).rowGap) || 0;
    const hGrade = grade.getBoundingClientRect().height;
    if (!hItem || !hGrade) return cols * 2;
    return cols * Math.max(1, Math.floor((hGrade + gap) / (hItem + gap)));
  };

  const doTema = () => itens.filter(i => tema === 'todos' || i.dataset.tema === tema);
  const mostrar = anima => {
    const lista = doTema(), n = porPag, total = Math.max(1, Math.ceil(lista.length / n));
    pagina = Math.min(Math.max(pagina, 0), total - 1);
    const vis = new Set(n === Infinity ? lista : lista.slice(pagina * n, pagina * n + n));
    let k = 0;
    // no site a entrada escalonada para na 12ª capa (a grade tem o tema inteiro); no slide o vaivém usa o --i de cada capa
    itens.forEach(i => { i.hidden = !vis.has(i); if (!i.hidden) i.style.setProperty('--i', slide ? k++ : Math.min(k++, 12)); });
    const f = filtros.find(b => b.dataset.tema === tema);
    if (nome && f) nome.textContent = f.dataset.nome;
    if (qtd) qtd.textContent = tema === 'todos' ? '' : lista.length + (lista.length === 1 ? ' material' : ' materiais');
    if (pag) pag.hidden = total < 2;
    if (pagN) pagN.textContent = (pagina + 1) + ' de ' + total;
    if (ant) ant.disabled = pagina === 0;
    if (prox) prox.disabled = pagina >= total - 1;
    grade.scrollTop = 0;
    if (anima && !reduz()) { grade.classList.remove('is-troca'); void grade.offsetWidth; grade.classList.add('is-troca'); }
  };
  const recalcula = () => {
    const primeiro = doTema()[pagina * porPag];
    const novo = mede();
    if (novo === porPag) return;
    porPag = novo;
    pagina = primeiro ? Math.floor(doTema().indexOf(primeiro) / porPag) : 0;
    mostrar(false);
  };

  const escolher = (t, anima) => {
    if (!filtros.some(b => b.dataset.tema === t)) return false;
    tema = t; pagina = 0;
    porPag = mede(); // cada tema tem a sua capa mais alta
    filtros.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tema === t)));
    mostrar(anima);
    return true;
  };

  filtros.forEach(b => b.addEventListener('click', () => {
    escolher(b.dataset.tema, true);
    if (history.replaceState) history.replaceState(null, '', b.dataset.tema === 'todos' ? location.pathname + location.search : '#tema-' + b.dataset.tema);
  }));
  [ant, prox].forEach(b => b && b.addEventListener('click', () => { pagina += +b.dataset.dir; mostrar(true); }));

  let pedido = 0;
  const agenda = () => { if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; recalcula(); }); };
  if ('ResizeObserver' in window) new ResizeObserver(agenda).observe(grade);
  else addEventListener('resize', agenda);
  if (celular.addEventListener) celular.addEventListener('change', agenda);

  // #tema-<id> no endereço: escolhe o tema e leva até a biblioteca
  const doHash = rolar => {
    const m = location.hash.match(/^#tema-([\w-]+)$/);
    if (m && escolher(m[1], false) && rolar) sec.scrollIntoView({ behavior: reduz() ? 'auto' : 'smooth', block: 'start' });
  };
  addEventListener('hashchange', () => doHash(true));
  document.querySelectorAll('a[href^="#tema-"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
    doHash(true);
  }));

  porPag = mede();
  mostrar(false);
  agenda();
  if (location.hash) requestAnimationFrame(() => doHash(true));
}

})();
/* ===== q1-topo-sobre.js */
;(()=>{if(!document.querySelector('[data-secao="q1-topo-sobre"]'))return;
// Cabeçalho "ao cubo" da página Quem somos (qs-). 1) entrada coreografada: a classe .pronto entra depois das
// fontes carregarem (senão o título sobe numa fonte e troca no meio); 2) o filme de como a Roomi trabalha, no padrão
// do r1-topo-360.js: 3 etapas em loop (01 Dados, 02 Métodos ágeis, 03 Inteligência artificial), a barrinha de cada uma
// enche e passa pra próxima, a câmera desliza entre elas e a lista se confere item a item (CSS). Para com o mouse em
// cima do cartão, pelo botão, com a aba escondida ou fora da tela (aí o relógio para de vez e volta do ponto onde
// estava); clicar num segmento da barra leva à etapa. ?etapa=1..3 abre parado numa etapa, já no estado final (print).
// Movimento reduzido: parado na etapa 1, tudo à vista. 3) profundidade: o mouse inclina o cartão, move a ilustração
// e o brilho do palco (só com mouse de verdade, amortecido).
const qs = document.querySelector('.qs');
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pedida = Math.min(3, Math.max(0, parseInt(new URLSearchParams(location.search).get('etapa'), 10) || 0));

let soltaPronto; const pronto = new Promise(r => { soltaPronto = r; });
const liga = () => { if (qs.classList.contains('pronto')) return; qs.classList.add('pronto'); soltaPronto(); };
if (calmo || pedida) liga();
else if (document.fonts && document.fonts.ready) document.fonts.ready.then(liga, liga), setTimeout(liga, 1500);
else liga();

// 2. o filme
const tela = qs.querySelector('.qs-tela');
if (tela) {
  const cenas = [...tela.querySelectorAll('.ab-cena')];
  const barras = [...tela.querySelectorAll('.ab-barras i')];
  const cabEl = tela.querySelector('.ab-cab');
  const cab = { n: tela.querySelector('.ab-fase-n'), t: tela.querySelector('.ab-fase-t') };
  const live = qs.querySelector('.qs-live'), liveTxt = live && live.querySelector('span');
  const ROTULO = liveTxt ? liveTxt.textContent : '';
  const botao = qs.querySelector('.qs-pausa');
  const DUR = [5400, 5400, 5400];
  const motivo = { botao: calmo || !!pedida, mouse: false, fora: false };
  const parado = () => motivo.botao || motivo.mouse || motivo.fora;
  // estático = cada etapa aparece de uma vez no estado final (movimento reduzido ou print); some quando alguém dá o play
  let estatico = calmo || !!pedida;
  let atual = -1, t0 = 0, tSai = 0, tVolta = 0, tCorte = 0, comecou = false;

  cenas.forEach((c, k) => c.style.setProperty('--dur', (DUR[k] / 1000) + 's'));
  tela.classList.toggle('qs-ja', estatico);
  const poeP = (k, v) => { if (barras[k]) barras[k].style.setProperty('--p', v); };

  function mostra(i) {
    const ant = atual;
    atual = i; t0 = performance.now();
    const nova = cenas[i];
    // a câmera: a etapa que sai desliza pra esquerda e recua, a que entra vem da direita e assenta
    if (ant >= 0 && ant !== i && !calmo) {
      nova.style.transition = 'none'; nova.classList.remove('sai'); void nova.offsetWidth; nova.style.transition = '';
      cenas[ant].classList.add('sai');
      clearTimeout(tSai); tSai = setTimeout(() => cenas.forEach(c => { if (!c.classList.contains('on')) c.classList.remove('sai'); }), 950);
      tela.classList.add('qs-corte'); clearTimeout(tCorte); tCorte = setTimeout(() => tela.classList.remove('qs-corte'), 300);
      // do fim pro começo (ou voltando de etapa): as barrinhas esvaziam devagar, sem salto
      if (i < ant) { qs.classList.add('qs-volta'); clearTimeout(tVolta); tVolta = setTimeout(() => qs.classList.remove('qs-volta'), 750); }
    }
    cenas.forEach((c, k) => c.classList.toggle('on', k === i));
    cab.n.textContent = String(i + 1).padStart(2, '0');
    cab.t.textContent = nova.dataset.t;
    if (cabEl && ant >= 0 && ant !== i && !calmo) { cabEl.classList.remove('qs-troca'); void cabEl.offsetWidth; cabEl.classList.add('qs-troca'); }
    barras.forEach((b, k) => poeP(k, k < i ? 1 : 0));
  }

  const marca = () => {
    const p = parado() && !motivo.fora;
    tela.classList.toggle('qs-parado', parado());
    if (botao) botao.setAttribute('aria-pressed', motivo.botao ? 'true' : 'false');
    if (!live || !liveTxt) return;
    // parado de saída (movimento reduzido ou print): o rótulo fica, sem "Pausado"
    const deSaida = (calmo || pedida) && motivo.botao && !motivo.mouse;
    live.classList.toggle('pausado', p);
    liveTxt.textContent = !p || deSaida ? ROTULO
      : motivo.mouse && !motivo.botao ? 'Pausado · passe o mouse fora pra seguir' : 'Pausado';
  };

  // parado de saída: a etapa aparece completa já. Rodando: a 1ª etapa só acende quando o filme começa (no HTML ela
  // vem acesa pro sem-JS; acesa antes, a lista se conferia com o palco ainda invisível)
  if (estatico) { mostra(pedida ? pedida - 1 : 0); poeP(atual, 1); }
  else { atual = 0; cenas.forEach(c => c.classList.remove('on')); }
  marca();

  // o relógio: enche a barrinha da etapa e passa pra próxima; parado, guarda o ponto onde estava.
  // Fora da tela, com a aba escondida ou parado pelo botão ele para de vez (nenhum quadro de animação gasto).
  let rafT = 0;
  const pDe = () => parseFloat(barras[atual] && barras[atual].style.getPropertyValue('--p')) || 0;
  const tique = t => {
    rafT = 0;
    if (!parado()) {
      const k = (t - t0) / DUR[atual];
      poeP(atual, Math.min(1, k).toFixed(3));
      if (k >= 1) mostra((atual + 1) % cenas.length);
    } else t0 = t - pDe() * DUR[atual];
    if (!motivo.fora && !motivo.botao) rafT = requestAnimationFrame(tique);
  };
  const retoma = () => { if (comecou && !motivo.fora && !motivo.botao && !rafT) { t0 = performance.now() - pDe() * DUR[atual]; rafT = requestAnimationFrame(tique); } };

  // o que pausa
  let emTela = true;
  const ve = () => { motivo.fora = !emTela || document.hidden; marca(); retoma(); };
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { emTela = e.isIntersecting; ve(); }, { rootMargin: '-2px 0px' }).observe(qs); // -2px: quadro só encostado na borda da tela conta como fora
  document.addEventListener('visibilitychange', ve);
  // só mouse de verdade: no toque o navegador emula um mouseenter sem o mouseleave e o filme ficava preso em pausa
  tela.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; motivo.mouse = true; marca(); });
  tela.addEventListener('pointerleave', e => { if (e.pointerType !== 'mouse') return; motivo.mouse = false; marca(); });
  if (botao) botao.addEventListener('click', () => {
    motivo.botao = !motivo.botao;
    if (!motivo.botao && estatico && !calmo) { estatico = false; tela.classList.remove('qs-ja'); }
    if (!motivo.botao && pDe() >= 1) { poeP(atual, 0); mostra(atual); } // volta a rodar do começo da etapa
    comecou = true; marca(); retoma();
  });
  barras.forEach((b, k) => b.addEventListener('click', () => { mostra(k); retoma(); }));

  // a 1ª etapa roda junto com o palco (que aparece .3 s depois do .pronto), não antes, com o palco ainda invisível
  pronto.then(() => setTimeout(() => {
    comecou = true;
    if (!estatico) { mostra(0); retoma(); }
  }, 350));
}

// 3. profundidade: o mouse inclina o cartão, move a ilustração e o brilho do palco
if (!calmo && matchMedia('(hover:hover) and (pointer:fine)').matches) {
  const palco = qs.querySelector('.qs-palco-in'), glow = qs.querySelector('.qs-glow'), meio = qs.querySelector('.qs-meio');
  if (palco && glow && meio) {
    let alvo = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
    const anima = () => {
      cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
      palco.style.setProperty('--px', cur.x.toFixed(3));
      palco.style.setProperty('--py', cur.y.toFixed(3));
      if (tela) {
        tela.style.setProperty('--ry', (-6 + cur.x * 5).toFixed(2) + 'deg');
        tela.style.setProperty('--rx', (4 - cur.y * 4).toFixed(2) + 'deg');
      }
      glow.style.setProperty('--mx', (78 + cur.x * 22).toFixed(1) + '%');
      glow.style.setProperty('--my', (18 + cur.y * 22).toFixed(1) + '%');
      if (Math.abs(alvo.x - cur.x) > .002 || Math.abs(alvo.y - cur.y) > .002) raf = requestAnimationFrame(anima); else raf = 0;
    };
    // a caixa do palco é lida uma vez e guardada (rolar ou mudar a janela pede de novo): sem ler layout a cada movimento
    let caixa = null; const esquece = () => { caixa = null; };
    addEventListener('scroll', esquece, { passive: true }); addEventListener('resize', esquece, { passive: true });
    meio.addEventListener('pointermove', e => {
      const r = caixa || (caixa = palco.getBoundingClientRect());
      alvo = { x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2)), y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2)) };
      if (!raf) raf = requestAnimationFrame(anima);
    }, { passive: true });
    meio.addEventListener('pointerleave', () => { alvo = { x: 0, y: 0 }; if (!raf) raf = requestAnimationFrame(anima); });
  }
}

})();
/* ===== r1-topo-360.js */
;(()=>{if(!document.querySelector('[data-secao="r1-topo-360"]'))return;
// Cabeçalho "ao cubo" da página Roomi 360. O filme é o da home (01-abertura-cubo.js: 4 cenas), aqui comandado também
// pelas 4 abas de fase da coluna de texto (clique, setas, Home/End). Mais: a entrada coreografada (.pronto depois das
// fontes), a profundidade ao mover o mouse (o filme inclina, a ilustração e o brilho acompanham) e o botão de pausa.
// O filme para com o mouse em cima dele, com o foco de teclado nas abas, fora da tela ou pelo botão.
// v7: dentro de cada fase as peças animam enquanto ela está no ar (a lista que se confere e marca, as minibarras das
// metas que crescem e o cursor que pactua cada uma, o cursor que liga as tarefas, as barras da receita, a linha de 2026
// que se desenha, o +60% que conta e o cursor que aponta setembro); a troca de fase é uma câmera que desliza e aproxima
// (pra trás quando se volta de fase); no fim do ciclo as barrinhas esvaziam devagar e o filme volta à fase 1 sem salto.
// ?fase=1..4 abre parado numa fase, já no estado final (para print). Movimento reduzido: parado na fase 1, tudo à vista.
// No fim do arquivo: o hover com profundidade das capas do quadro das entregas (r2-entregas-360, que não tem JS próprio
// e só existe nesta página).
const r1 = document.querySelector('.r1');
const tela = r1 && r1.querySelector('.r1-tela');
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fino = matchMedia('(hover:hover) and (pointer:fine)').matches;
if (r1 && tela) {
  const q = new URLSearchParams(location.search);
  const pedida = Math.min(4, Math.max(0, parseInt(q.get('fase'), 10) || 0));

  // 1. entrada: espera as fontes (senão o título sobe numa fonte e troca no meio)
  const liga = () => r1.classList.add('pronto');
  if (calmo || pedida) liga();
  else if (document.fonts && document.fonts.ready) { document.fonts.ready.then(liga, liga); setTimeout(liga, 1500); }
  else liga();

  // 2. o filme e as abas
  const abas = [...r1.querySelectorAll('.r1-abas [role=tab]')];
  const progs = abas.map(a => a.querySelector('.r1-prog'));
  const desc = r1.querySelector('.r1-desc');
  const cenas = [...tela.querySelectorAll('.ab-cena')];
  const barras = [...tela.querySelectorAll('.ab-barras i')];
  const cabEl = tela.querySelector('.ab-cab');
  const cab = { n: tela.querySelector('.ab-fase-n'), t: tela.querySelector('.ab-fase-t'), s: tela.querySelector('.ab-fase-s'), q: tela.querySelector('.ab-quem') };
  const live = r1.querySelector('.r1-live'), liveTxt = live && live.querySelector('span');
  const botao = r1.querySelector('.r1-pausa');
  const DUR = [6200, 6000, 6000, 7400];
  const motivo = { botao: calmo || !!pedida, mouse: false, foco: false, fora: false };
  const parado = () => motivo.botao || motivo.mouse || motivo.foco || motivo.fora;
  // estático = cada fase aparece de uma vez no estado final (movimento reduzido ou print); some quando alguém dá o play
  let estatico = calmo || !!pedida;
  let atual = -1, t0 = 0, timers = [], tDesc = 0, tSai = 0, tVolta = 0, tCorte = 0, rafConta = 0, tocou = false;

  cenas.forEach((c, k) => c.style.setProperty('--dur', (DUR[k] / 1000) + 's'));
  tela.querySelectorAll('.ab-graf div').forEach((d, i) => d.style.setProperty('--d', (i * 0.07).toFixed(2)));
  tela.classList.toggle('r1-ja', estatico);

  // as peças de cada cena
  const M = cenas.map(c => c.querySelector('.r1-mouse'));
  const ach1 = cenas[0] && cenas[0].querySelector('.ab-achado');
  const metas = cenas[1] ? [...cenas[1].querySelectorAll('.ab-metas > div')] : [];
  const ach2 = cenas[1] && cenas[1].querySelector('.ab-achado');
  const tarefas = cenas[2] ? [...cenas[2].querySelectorAll('.ab-tarefas li')] : [];
  const graf = cenas[3] && cenas[3].querySelector('.ab-graf');
  const meses = graf ? [...graf.children] : [];
  const num = graf && graf.querySelector('.ab-graf-ult b');
  const numFim = num ? num.textContent : '';
  const svg = cenas[3] && cenas[3].querySelector('.r1-linha');

  const em = (ms, fn) => timers.push(setTimeout(fn, ms));
  // posição de uma peça dentro da cena, pelo layout (não pelo que está na tela: a cena está inclinada e com zoom)
  const pos = (el, base) => { let x = 0, y = 0; for (let n = el; n && n !== base; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y }; };
  const poeXY = (m, x, y) => { m.style.setProperty('--x', x.toFixed(1) + 'px'); m.style.setProperty('--y', y.toFixed(1) + 'px'); };
  // o cursor: começa escondido no canto de baixo, entra andando até a peça, clica e sai pelo mesmo canto
  const mouseIni = k => {
    const m = M[k], c = cenas[k];
    if (!m) return;
    m.classList.remove('vis', 'clic');
    m.style.transition = 'none';
    poeXY(m, c.offsetWidth * .94, c.offsetHeight * 1.04);
    void m.offsetWidth;
    m.style.transition = '';
  };
  const vai = (k, el, fx, fy) => {
    const m = M[k], c = cenas[k];
    if (!m) return;
    if (el && el.offsetParent) { const p = pos(el, c); poeXY(m, p.x + el.offsetWidth * fx, p.y + el.offsetHeight * fy); }
    else poeXY(m, c.offsetWidth * .94, c.offsetHeight * 1.04);
    m.classList.add('vis');
  };
  const clica = (k, fn) => { const m = M[k]; if (m) { m.classList.remove('clic'); void m.offsetWidth; m.classList.add('clic'); } if (fn) fn(); };
  const sai = (k, ms) => { em(ms, () => vai(k, null)); em(ms + 420, () => M[k] && M[k].classList.remove('vis')); };

  // a linha da receita de 2026: passa no topo de cada barra coral, com os próprios valores das barras (--b)
  const valores = meses.map(d => ({ a: parseFloat(d.style.getPropertyValue('--a')) || 0, b: parseFloat(d.style.getPropertyValue('--b')) || 0 }));
  const teto = Math.max(1, ...valores.map(v => Math.max(v.a, v.b)));
  function linha() {
    const c = cenas[3];
    if (!svg || !c || !meses.length || !c.offsetWidth) return;
    const W = c.offsetWidth, H = c.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const pts = meses.map((d, k) => {
      const bar = d.querySelectorAll('i')[1], p = pos(d, c);
      return [p.x + (bar ? bar.offsetLeft + bar.offsetWidth / 2 : d.offsetWidth * .75), p.y + d.offsetHeight * (1 - valores[k].b / teto)];
    });
    svg.firstElementChild.setAttribute('d', pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '));
  }
  // o +60% conta do zero (mantém o que vem antes e depois dos dígitos)
  function conta(el, dur) {
    const m = numFim.match(/(\d+)/);
    if (!m) return;
    const fim = +m[1], pre = numFim.slice(0, m.index), pos2 = numFim.slice(m.index + m[1].length);
    const ini = performance.now();
    const passo = t => {
      const k = Math.min(1, (t - ini) / dur);
      el.textContent = pre + Math.round(fim * (1 - Math.pow(1 - k, 3))) + pos2;
      if (k < 1) rafConta = requestAnimationFrame(passo); else rafConta = 0;
    };
    rafConta = requestAnimationFrame(passo);
  }

  // o roteiro de cada fase enquanto ela está no ar (tempos em ms desde que a fase entrou)
  const roteiro = [
    () => { // 01 Diagnóstico: a lista se confere item a item (CSS) e o cursor confirma a entrega da semana 4
      if (!ach1) return;
      ach1.classList.remove('r1-ok');
      if (estatico) { ach1.classList.add('r1-ok'); return; }
      em(3150, () => vai(0, ach1, .8, .62));
      em(3850, () => clica(0, () => ach1.classList.add('r1-ok')));
      sai(0, 4900);
    },
    () => { // 02 Planejamento: as minibarras crescem (CSS) e o cursor pactua cada meta
      metas.forEach(d => d.classList.remove('r1-ok'));
      if (estatico) { metas.forEach(d => d.classList.add('r1-ok')); return; }
      metas.forEach((d, k) => {
        em(650 + k * 560, () => vai(1, d, .78, .3));
        em(1080 + k * 560, () => clica(1, () => d.classList.add('r1-ok')));
      });
      em(2950, () => vai(1, ach2, .72, .58));
      sai(1, 4000);
    },
    () => { // 03 Engajamento: o cursor liga as tarefas, uma a uma
      tarefas.forEach(li => li.classList.remove('ok', 'curso'));
      if (estatico) { tarefas.forEach((li, k) => li.classList.add(k === 3 ? 'curso' : 'ok')); return; }
      tarefas.forEach((li, i) => {
        em(600 + i * 1000, () => vai(2, li.querySelector('i'), .5, .5));
        em(1160 + i * 1000, () => clica(2, () => li.classList.add(i === 3 ? 'curso' : 'ok')));
      });
      sai(2, 4600);
    },
    () => { // 04 Monitoramento: as barras sobem (CSS), a linha de 2026 se desenha, o +60% conta, os meses acendem e o cursor aponta setembro
      if (!graf) return;
      linha();
      graf.classList.remove('r1-foco');
      meses.forEach(d => d.classList.remove('r1-lido'));
      if (num) num.textContent = numFim;
      if (estatico) return;
      if (num) { num.textContent = numFim.replace(/\d+/, '0'); em(1200, () => conta(num, 1000)); }
      meses.forEach((d, k) => em(2450 + k * 140, () => { meses.forEach(x => x.classList.remove('r1-lido')); d.classList.add('r1-lido'); }));
      const ult = meses[meses.length - 1], barra = ult && ult.querySelectorAll('i')[1];
      if (barra) em(3900, () => vai(3, barra, .5, .08));
      em(4600, () => clica(3, () => graf.classList.add('r1-foco')));
      sai(3, 5700);
      em(6500, () => graf.classList.remove('r1-foco'));
    },
  ];

  const poeP = (k, v) => { if (barras[k]) barras[k].style.setProperty('--p', v); if (progs[k]) progs[k].style.setProperty('--p', v); };

  function mostra(i, foco) {
    timers.forEach(clearTimeout); timers = [];
    if (rafConta) { cancelAnimationFrame(rafConta); rafConta = 0; }
    const ant = atual;
    atual = i; t0 = performance.now();
    const nova = cenas[i];
    // a câmera: a cena que sai desliza pra um lado e recua, a que entra vem do outro e assenta; voltar de fase inverte
    if (ant >= 0 && ant !== i && !calmo) {
      const tras = i < ant && !(ant === cenas.length - 1 && i === 0);
      tela.classList.toggle('r1-tras', tras);
      nova.style.transition = 'none'; nova.classList.remove('sai'); void nova.offsetWidth; nova.style.transition = '';
      cenas[ant].classList.add('sai');
      clearTimeout(tSai); tSai = setTimeout(() => cenas.forEach(c => { if (!c.classList.contains('on')) c.classList.remove('sai'); }), 950);
      tela.classList.add('r1-corte'); clearTimeout(tCorte); tCorte = setTimeout(() => tela.classList.remove('r1-corte'), 300);
      // de volta pra uma fase anterior (ou do fim pro começo): as barrinhas esvaziam devagar, sem salto
      if (i < ant) { r1.classList.add('r1-volta'); clearTimeout(tVolta); tVolta = setTimeout(() => r1.classList.remove('r1-volta'), 750); }
    }
    mouseIni(i);
    cenas.forEach((c, k) => c.classList.toggle('on', k === i));
    abas.forEach((a, k) => { a.setAttribute('aria-selected', k === i ? 'true' : 'false'); a.tabIndex = k === i ? 0 : -1; });
    if (abas[i]) tela.setAttribute('aria-labelledby', abas[i].id);
    cab.n.textContent = String(i + 1).padStart(2, '0');
    cab.t.textContent = nova.dataset.t; cab.s.textContent = nova.dataset.s; cab.q.textContent = nova.dataset.q;
    if (cabEl && ant >= 0 && ant !== i && !calmo) { cabEl.classList.remove('r1-troca'); void cabEl.offsetWidth; cabEl.classList.add('r1-troca'); }
    barras.forEach((b, k) => poeP(k, k < i ? 1 : 0));
    if (desc && abas[i] && desc.textContent !== abas[i].dataset.d) {
      clearTimeout(tDesc);
      const novo = abas[i].dataset.d;
      if (calmo) desc.textContent = novo;
      else { desc.classList.add('troca'); tDesc = setTimeout(() => { desc.textContent = novo; desc.classList.remove('troca'); }, 200); }
    }
    if (roteiro[i]) roteiro[i]();
    if (foco && abas[i]) abas[i].focus();
  }

  const marca = () => {
    const p = parado() && !motivo.fora;
    tela.classList.toggle('r1-parado', parado());
    if (botao) botao.setAttribute('aria-pressed', motivo.botao ? 'true' : 'false');
    if (!live || !liveTxt) return;
    live.classList.toggle('pausado', p);
    liveTxt.textContent = !p ? 'Roomi 360 rodando'
      : (calmo || pedida) && !tocou ? 'Roomi 360'
      : motivo.mouse && !motivo.botao && !motivo.foco ? 'Pausado · passe o mouse fora pra seguir' : 'Pausado';
  };

  mostra(pedida ? pedida - 1 : 0);
  if (motivo.botao) poeP(atual, 1); // parado de saída (movimento reduzido ou print): a fase aparece completa
  marca();

  // o relógio: enche a barrinha da fase e passa pra próxima; parado, guarda o ponto onde estava.
  // Fora da tela ou parado pelo botão (e no movimento reduzido, que começa parado) ele para de vez (nenhum quadro de
  // animação gasto) e volta do ponto onde estava.
  let rafT = 0;
  const pDe = () => parseFloat(barras[atual] && barras[atual].style.getPropertyValue('--p')) || 0;
  const tique = t => {
    rafT = 0;
    if (!parado()) {
      const k = (t - t0) / DUR[atual];
      poeP(atual, Math.min(1, k).toFixed(3));
      if (k >= 1) mostra((atual + 1) % cenas.length);
    } else t0 = t - pDe() * DUR[atual];
    if (!motivo.fora && !motivo.botao) rafT = requestAnimationFrame(tique);
  };
  const retoma = () => { if (!motivo.fora && !motivo.botao && !rafT) { t0 = performance.now() - pDe() * DUR[atual]; rafT = requestAnimationFrame(tique); } };
  retoma();

  // o que pausa
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => {
    motivo.fora = !e.isIntersecting; marca(); retoma();
  }, { rootMargin: '-2px 0px' }).observe(r1); // -2px: quadro só encostado na borda da tela conta como fora
  // só mouse de verdade: no toque o navegador emula um mouseenter sem o mouseleave e o filme ficava preso em pausa
  tela.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; motivo.mouse = true; marca(); });
  tela.addEventListener('pointerleave', e => { if (e.pointerType !== 'mouse') return; motivo.mouse = false; marca(); });
  if (botao) botao.addEventListener('click', () => {
    motivo.botao = !motivo.botao; tocou = true;
    if (!motivo.botao && estatico && !calmo) { estatico = false; tela.classList.remove('r1-ja'); }
    if (!motivo.botao && barras[atual] && parseFloat(barras[atual].style.getPropertyValue('--p')) >= 1) { poeP(atual, 0); mostra(atual); } // volta a rodar do começo da fase
    marca(); retoma();
  });

  // abas: clique, setas, Home e End; foco de teclado nelas segura o filme
  const lista = r1.querySelector('.r1-abas');
  abas.forEach((a, i) => {
    a.addEventListener('click', () => mostra(i));
    a.addEventListener('keydown', e => {
      const n = abas.length;
      const alvo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + n) % n
        : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (alvo < 0) return;
      e.preventDefault();
      mostra(alvo, true);
    });
  });
  if (lista) {
    lista.addEventListener('focusin', e => { let v = false; try { v = e.target.matches(':focus-visible'); } catch (_) { } if (v) { motivo.foco = true; marca(); } });
    lista.addEventListener('focusout', e => { if (!lista.contains(e.relatedTarget)) { motivo.foco = false; marca(); } });
  }
  barras.forEach((b, k) => b.addEventListener('click', () => mostra(k)));
  // a linha depende da largura do filme: refaz quando a janela muda
  let tLinha = 0;
  addEventListener('resize', () => { clearTimeout(tLinha); tLinha = setTimeout(linha, 150); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(linha, () => { });

  // 3. profundidade: o mouse inclina o filme, move a ilustração e o brilho do palco (só com mouse de verdade)
  if (!calmo && fino) {
    const palco = r1.querySelector('.r1-palco-in'), cena = r1.querySelector('.r1-cena'), glow = r1.querySelector('.r1-glow'), area = r1.querySelector('.r1-in');
    if (palco && glow && area) {
      let alvo = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
      const anima = () => {
        cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
        tela.style.setProperty('--ry', (-6 + cur.x * 5).toFixed(2) + 'deg');
        tela.style.setProperty('--rx', (4 - cur.y * 4).toFixed(2) + 'deg');
        cena?.style.setProperty('--cx', (-cur.x * 12).toFixed(1) + 'px');
        cena?.style.setProperty('--cy', (-cur.y * 8).toFixed(1) + 'px');
        glow.style.setProperty('--mx', (78 + cur.x * 22).toFixed(1) + '%');
        glow.style.setProperty('--my', (18 + cur.y * 22).toFixed(1) + '%');
        if (Math.abs(alvo.x - cur.x) > .002 || Math.abs(alvo.y - cur.y) > .002) raf = requestAnimationFrame(anima); else raf = 0;
      };
      // a caixa do palco é lida uma vez e guardada (rolar ou mudar a janela pede de novo): sem ler layout a cada movimento
      let caixa = null; const esquece = () => { caixa = null; };
      addEventListener('scroll', esquece, { passive: true }); addEventListener('resize', esquece, { passive: true });
      const move = e => {
        const r = caixa || (caixa = palco.getBoundingClientRect());
        alvo = { x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2)), y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2)) };
        if (!raf) raf = requestAnimationFrame(anima);
      };
      area.addEventListener('pointermove', move, { passive: true });
      area.addEventListener('pointerleave', () => { alvo = { x: 0, y: 0 }; if (!raf) raf = requestAnimationFrame(anima); });
    }
  }
}

// 4. quadro das entregas (r2-): cada capa inclina na direção do mouse e o brilho segue o ponteiro; o cartão da fase
// também ganha o brilho no ponto do mouse. Só com mouse de verdade e sem movimento reduzido; o resto é CSS.
const r2 = document.querySelector('.r2');
if (r2 && fino && !calmo) {
  let alvoEl = null, ev = null, raf2 = 0;
  const aplica = () => {
    raf2 = 0;
    if (!alvoEl || !ev) return;
    const r = alvoEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
    alvoEl.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    alvoEl.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    if (alvoEl.classList.contains('cp')) {
      alvoEl.style.setProperty('--ty', ((x - .5) * 9).toFixed(2) + 'deg');
      alvoEl.style.setProperty('--tx', ((.5 - y) * 12).toFixed(2) + 'deg');
    }
  };
  r2.querySelectorAll('.r2-capas .cp, .r2-card').forEach(el => {
    el.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (el.classList.contains('r2-card') && e.target.closest('.cp')) return; // em cima de uma capa, o brilho é dela
      alvoEl = el; ev = e;
      if (!raf2) raf2 = requestAnimationFrame(aplica);
    }, { passive: true });
    el.addEventListener('pointerleave', () => { ['--tx', '--ty'].forEach(p => el.style.removeProperty(p)); if (alvoEl === el) alvoEl = null; });
  });
}

})();
/* ===== s1-sobre.js */
;(()=>{if(!document.querySelector('[data-secao="s1-sobre"]'))return;
// Quem somos (s1-), v7: profundidade no hover. Os cartões de "o que acreditamos" e as bios dos sócios inclinam de leve
// pro lado do mouse e acendem um brilho coral onde ele está (--gx/--gy/--qx/--qy, lidos no s1-sobre.css). Só com mouse
// de verdade; movimento reduzido: nada. A entrada (escalonada, ícones se desenhando, traço dos números) é só CSS,
// presa ao .nv-on da camada global (00-nivel.js), que também conta os números.
// O mapa de "Onde estamos" tem a sua própria entrada: quando ele aparece na tela (no celular fica bem abaixo do
// começo do quadro), ganha .s1-viva e os arcos se desenham de Recife para fora (só uma vez). Movimento reduzido ou
// navegador sem IntersectionObserver: já entra aceso (e o CSS tira a transição).
{
  const mapa = document.querySelector('.s1-mapa');
  if (mapa) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) mapa.classList.add('s1-viva');
    else {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { mapa.classList.add('s1-viva'); io.disconnect(); } }), { threshold: .35 });
      io.observe(mapa);
    }
  }
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover:hover) and (pointer:fine)').matches) {
  const inclina = (el, gx, gy) => {
    let e0 = null, f = 0;
    const passo = () => {
      f = 0; if (!e0) return;
      const r = el.getBoundingClientRect(), x = (e0.clientX - r.left) / r.width, y = (e0.clientY - r.top) / r.height;
      el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      el.style.setProperty('--qx', ((.5 - y) * gx).toFixed(2) + 'deg');
      el.style.setProperty('--qy', ((x - .5) * gy).toFixed(2) + 'deg');
    };
    el.addEventListener('pointermove', e => { e0 = e; if (!f) f = requestAnimationFrame(passo); }, { passive: true });
    el.addEventListener('pointerleave', () => { e0 = null; el.style.removeProperty('--qx'); el.style.removeProperty('--qy'); });
  };
  document.querySelectorAll('.s1-pilares li').forEach(li => inclina(li, 6, 6));
  document.querySelectorAll('.s1-p').forEach(p => inclina(p, 3, 3));
}

})();
/* ===== x1-topo-verticais.js */
;(()=>{if(!document.querySelector('[data-secao="x1-topo-verticais"]'))return;
// Cabeçalho "ao cubo" da página Verticais (x1-topo-verticais): a entrada coreografada (.pronto depois das fontes),
// as 3 verticais trocando sozinhas de 5 em 5 s no palco com movimento de câmera (abas com barrinha clicáveis, setas do
// teclado, pausa no hover e no foco, para fora da tela), a profundidade ao mover o mouse e os fatos contando.
// Dentro de cada tela o produto RODA enquanto ela está no ar (motor xdVivo, abaixo; o x2-verticais usa o mesmo):
// funil com pessoas descendo e o medidor de cada etapa subindo, grade tarifária com o cursor ajustando as células,
// plataforma de marca mandando peças para os canais. Sem número novo: só o "30 a 60 dias" que já está na tela conta.
// ?vertical=1..3 para a tela numa vertical (para print). Movimento reduzido: parado na primeira, tudo visível.

// ===== motor das demonstrações vivas (xd-). window.xdVivo(figure) devolve { liga, pausa, zera } ou null.
const xdVivo = (() => {
  const ativos = new Set();
  let raf = 0, tA = 0;
  const roda = t => {
    const dt = Math.min(.05, (t - (tA || t)) / 1000); tA = t;
    ativos.forEach(d => d.passo(dt));
    if (ativos.size) raf = requestAnimationFrame(roda); else { raf = 0; tA = 0; }
  };
  const anda = d => { ativos.add(d); if (!raf) raf = requestAnimationFrame(roda); };
  const sorte = (a, b) => a + Math.random() * (b - a);
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  // posição de layout (sem as transformações da câmera e da perspectiva) relativa a um ancestral posicionado
  const pos = (el, ate) => { let x = 0, y = 0, e = el; while (e && e !== ate) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
  const medidas = new Set();
  addEventListener('resize', () => medidas.forEach(f => f()), { passive: true });
  const pinta = (el, x, y, o, s) => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)${s ? ` scale(${s.toFixed(3)})` : ''}`; el.style.opacity = o.toFixed(3); };
  const cria = (pai, cls, antes) => { const i = document.createElement('i'); i.className = cls; i.setAttribute('aria-hidden', 'true'); antes ? pai.prepend(i) : pai.appendChild(i); return i; };

  // 1. funil: pontos saem do Google Ads (esquerda) e do Meta Ads (direita), descem pelos tubos e pelas etapas,
  //    pelas laterais dos rótulos; uns saem do funil a cada etapa, os que chegam ao fundo acendem a conversão.
  //    Cada etapa tem um medidor que sobe com quem passa e desce devagar (vazamento): sobe ao entrar, loop sem salto.
  const funil = fig => {
    const f = fig.querySelector('.xd-f'), fontes = fig.querySelector('.xd-fontes');
    const etapas = [...f.querySelectorAll(':scope > div')], chips = [...fontes.querySelectorAll('span')];
    const pontos = Array.from({ length: 16 }, () => ({ el: cria(fig, 'xd-p'), on: false }));
    const anel = cria(fig, 'xd-anel');
    const TAU = 3.2, ALVO = .84, MEIO = .34, PASSA = [.62, .64];
    const r0 = 1 / MEIO, HIT = [ALVO / (r0 * TAU), ALVO / (r0 * PASSA[0] * TAU), ALVO / (r0 * PASSA[0] * PASSA[1] * TAU)];
    let m = [0, 0, 0], mDom = [-1, -1, -1], prox = 0, lado = 1, geo = null;
    const mede = () => {
      if (!f.offsetWidth) return (geo = null);
      const F = pos(f, fig), Fo = pos(fontes, fig);
      return (geo = {
        tubo: { x: F.x, w: F.w, y: Fo.y + Fo.h, h: F.y - (Fo.y + Fo.h) },
        chips: chips.map(c => { const r = pos(c, fig); return { x: r.x + r.w / 2, y: r.y + r.h }; }),
        et: etapas.map(d => {
          const r = pos(d, fig), a = (parseFloat(getComputedStyle(d).getPropertyValue('--a')) || 12) / 100, s = d.querySelector('span');
          return { y: r.y, h: r.h, cx: r.x + r.w / 2, hT: r.w / 2, hB: r.w / 2 - a * r.w, lh: s.offsetWidth / 2 + 9 };
        })
      });
    };
    medidas.add(() => { geo = null; });
    // faixa: a lateral do rótulo até a borda inclinada da etapa (u de 0 a 1)
    const faixa = (e, y, s, u) => { const k = Math.min(1, Math.max(0, (y - e.y) / e.h)), hw = e.hT + (e.hB - e.hT) * k; return e.cx + s * (e.lh + u * Math.max(0, hw - e.lh - 7)); };
    const rota = s => {
      const g = geo, c = g.chips[s < 0 ? 0 : 1], T = g.tubo, u = sorte(.15, .95), w = [{ x: c.x, y: c.y, o: 0 }];
      const X = s < 0 ? [25, 25, 42, 46] : [75, 75, 58, 54], Y = [0, 12, 10, 20];
      [.25, .5, .75, 1].forEach(t => w.push({ x: T.x + T.w * bez(...X, t) / 100, y: T.y + T.h * bez(...Y, t) / 20, o: 1 }));
      let fim = false;
      g.et.forEach((e, k) => {
        if (fim) return;
        w.push({ x: faixa(e, e.y, s, u), y: e.y + 1, o: 1, ev: k });
        w.push({ x: faixa(e, e.y + e.h, s, u), y: e.y + e.h, o: 1 });
        if (k < 2 && Math.random() > PASSA[k]) { fim = true; w.push({ x: e.cx + s * (e.hB + 20), y: e.y + e.h + 12, o: 0 }); }
      });
      if (!fim) { const e = g.et[2]; w.push({ x: e.cx + s * 3, y: e.y + e.h + 6, o: 1, ev: 3 }); w.push({ x: e.cx + s * 3, y: e.y + e.h + 8, o: 0, min: .28 }); }
      const v = sorte(105, 145);
      const d = w.slice(1).map((p, i) => Math.max(p.min || (i === 0 ? .22 : .06), Math.hypot(p.x - w[i].x, p.y - w[i].y) / v));
      return { w, d };
    };
    const evento = k => {
      if (k < 3) { m[k] = Math.min(1, m[k] + HIT[k]); return; }
      const e = geo.et[2];
      etapas[2].animate([{ filter: 'brightness(1.16)' }, { filter: 'none' }], { duration: 520, easing: 'ease-out' });
      const tr = `translate(${e.cx.toFixed(1)}px,${(e.y + e.h + 6).toFixed(1)}px)`;
      anel.animate([{ transform: tr + ' scale(.4)', opacity: .8 }, { transform: tr + ' scale(2.2)', opacity: 0 }], { duration: 650, easing: 'ease-out' });
    };
    return {
      passo(dt) {
        if (!geo && !mede()) return;
        prox -= dt;
        if (prox <= 0) {
          prox = sorte(MEIO * .7, MEIO * 1.3); lado = -lado;
          const p = pontos.find(p => !p.on);
          if (p) Object.assign(p, rota(lado), { on: true, i: 0, t: 0 });
        }
        pontos.forEach(p => {
          if (!p.on) return;
          p.t += dt;
          while (p.i < p.d.length && p.t >= p.d[p.i]) { p.t -= p.d[p.i]; p.i++; if (p.w[p.i].ev != null) evento(p.w[p.i].ev); }
          if (p.i >= p.d.length) { p.on = false; p.el.style.opacity = 0; return; }
          const a = p.w[p.i], b = p.w[p.i + 1], k = p.t / p.d[p.i];
          pinta(p.el, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.o + (b.o - a.o) * k);
        });
        m = m.map(v => v * (1 - dt / TAU));
        m.forEach((v, k) => { if (Math.abs(v - mDom[k]) > .004) { mDom[k] = v; etapas[k].style.setProperty('--m', v.toFixed(3)); } });
      },
      zera() {
        pontos.forEach(p => { p.on = false; p.el.style.opacity = 0; });
        m = [0, 0, 0]; mDom = [0, 0, 0]; etapas.forEach(d => d.style.setProperty('--m', 0)); prox = 0; geo = null;
      }
    };
  };

  // 2. grade tarifária: um cursor anda dia a dia; a célula escolhida acende e a intensidade (o "preço") muda, para cima
  //    ou para baixo, sempre perto do desenho original (fim de semana segue mais forte). Ilustrativo, selo "Demonstração".
  const grade = fig => {
    const cel = [...fig.querySelectorAll('.xd-g i[style]')], dias = [...fig.querySelectorAll('.xd-g b')], lin = [...fig.querySelectorAll('.xd-g span')];
    const base = cel.map(c => parseFloat(c.style.getPropertyValue('--n')) || .3), val = base.slice();
    let col = -1, ult = -1, prox = .35;
    // limpa tira o destaque e a seta (.mostra); a forma da seta (.sobe/.desce) fica até a célula ser ajustada de novo,
    // senão a seta vira um quadradinho escuro enquanto some
    const limpa = (tudo) => fig.querySelectorAll(tudo ? '.aj,.mostra,.sobe,.desce' : '.aj,.mostra').forEach(e => e.classList.remove('aj', 'mostra', ...(tudo ? ['sobe', 'desce'] : [])));
    return {
      passo(dt) {
        prox -= dt;
        if (prox > 0 || !cel.length) return;
        prox = .85;
        limpa();
        col = (col + 1) % 7;
        let row = Math.floor(Math.random() * 3);
        if (row === ult) row = (row + 1 + Math.floor(Math.random() * 2)) % 3;
        ult = row;
        const i = row * 7 + col, c = cel[i];
        if (!c) return;
        let v = val[i], n = 0;
        while (Math.abs(v - val[i]) < .1 && n++ < 12) v = Math.min(1, Math.max(.08, base[i] + sorte(-.24, .24)));
        c.classList.remove('sobe', 'desce');
        c.classList.add('aj', 'mostra', v > val[i] ? 'sobe' : 'desce');
        val[i] = v; c.style.setProperty('--xdn', v.toFixed(3));
        if (dias[col]) dias[col].classList.add('aj');
        if (lin[row]) lin[row].classList.add('aj');
      },
      zera() { limpa(true); cel.forEach((c, i) => { val[i] = base[i]; c.style.removeProperty('--xdn'); }); col = -1; prox = .35; }
    };
  };

  // 3. plataforma de marca: peças saem do centro pelas linhas, numa curva leve, e entram nos canais, que acendem
  const marca = fig => {
    const caixa = fig.querySelector('.xd-m'), b = caixa.querySelector('b'), canais = [...caixa.querySelectorAll('span')];
    const pecas = Array.from({ length: 8 }, (_, k) => ({ el: cria(caixa, 'xd-peca xd-peca-' + (k % 3), true), on: false }));
    const tm = canais.map(() => 0);
    let prox = .15, ordem = [], geo = null, n = 0;
    const mede = () => {
      if (!caixa.offsetWidth) return (geo = null);
      return (geo = { o: { x: b.offsetLeft, y: b.offsetTop }, c: canais.map(s => ({ x: s.offsetLeft, y: s.offsetTop })) });
    };
    medidas.add(() => { geo = null; });
    const chega = k => {
      const s = canais[k];
      s.classList.add('chega'); clearTimeout(tm[k]);
      tm[k] = setTimeout(() => s.classList.remove('chega'), 700);
      s.animate([{ scale: '1' }, { scale: '1.08' }, { scale: '1' }], { duration: 420, easing: 'ease-out' });
    };
    return {
      passo(dt) {
        if (!geo && !mede()) return;
        prox -= dt;
        if (prox <= 0) {
          prox = sorte(.3, .44);
          if (!ordem.length) ordem = canais.map((_, i) => i).sort(() => Math.random() - .5);
          const p = pecas.find(p => !p.on);
          if (p) {
            Object.assign(p, { on: true, t: 0, d: sorte(.9, 1.15), k: ordem.pop(), arco: sorte(-14, 14) });
            if (n++ % 2 === 0) b.animate([{ scale: '1' }, { scale: '1.045' }, { scale: '1' }], { duration: 380, easing: 'ease-out' });
          }
        }
        pecas.forEach(p => {
          if (!p.on) return;
          p.t += dt;
          const k = Math.min(1, p.t / p.d), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const o = geo.o, c = geo.c[p.k], dx = c.x - o.x, dy = c.y - o.y, L = Math.hypot(dx, dy) || 1, curva = Math.sin(Math.PI * e) * p.arco;
          const x = o.x + dx * e - dy / L * curva, y = o.y + dy * e + dx / L * curva;
          const op = k < .12 ? k / .12 : k > .86 ? Math.max(0, (1 - k) / .14) : 1;
          pinta(p.el, x, y, op, .6 + .5 * Math.sin(Math.PI * Math.min(1, k * 1.2)));
          if (k >= 1) { p.on = false; p.el.style.opacity = 0; chega(p.k); }
        });
      },
      zera() {
        pecas.forEach(p => { p.on = false; p.el.style.opacity = 0; });
        canais.forEach((s, k) => { clearTimeout(tm[k]); s.classList.remove('chega'); });
        prox = .15; geo = null;
      }
    };
  };

  const tipos = { 'xd-funil': funil, 'xd-grade': grade, 'xd-marca': marca };
  const feitos = new WeakMap();
  return fig => {
    if (!fig) return null;
    if (feitos.has(fig)) return feitos.get(fig);
    const tipo = Object.keys(tipos).find(c => fig.classList.contains(c));
    if (!tipo) return null;
    const d = tipos[tipo](fig);
    fig.classList.add('xd-vivo');
    const api = { liga: () => anda(d), pausa: () => ativos.delete(d), zera: () => { ativos.delete(d); d.zera(); } };
    feitos.set(fig, api);
    return api;
  };
})();

// conta do zero os números que já estão no texto ("30 a 60 dias"), mantendo o resto
const xdConta = (el, dur = 1000) => {
  if (!el) return;
  const orig = el.dataset.orig || (el.dataset.orig = el.textContent);
  if (!/\d/.test(orig)) return;
  const t0 = performance.now();
  const passo = t => {
    const k = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
    el.textContent = orig.replace(/\d+/g, n => Math.round(+n * e));
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
};
window.xdVivo = xdVivo;
window.xdConta = xdConta;

const xt = document.querySelector('.xt');
if (xt) {
  const q = new URLSearchParams(location.search);
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // as 3 verticais no palco
  const abas = [...xt.querySelectorAll('.xt-aba')];
  const cenas = [...xt.querySelectorAll('.xt-cena')];
  const barras = abas.map(a => a.querySelector('i'));
  const live = xt.querySelector('.xt-live'), liveT = live.querySelector('span');
  const palco = xt.querySelector('.xt-palco-in'), tela = xt.querySelector('.xt-tela');
  const demos = cenas.map(c => calmo ? null : xdVivo(c.querySelector('.xd')));
  const pes = cenas.map(c => c.querySelector('.xt-pe b'));
  const zt = cenas.map(() => 0);
  const DUR = 5000;
  let atual = 0, t0 = performance.now(), visivel = true, sobre = false, foco = false, ligou = false;

  // o produto da tela no ar roda; as outras param (e zeram depois que a câmera termina de tirá-las)
  const rodaDemo = () => demos.forEach((d, k) => {
    if (!d) return;
    if (k === atual) { clearTimeout(zt[k]); zt[k] = 0; if (ligou && visivel && !pelaBotao) d.liga(); else d.pausa(); }
    else if (!zt[k]) zt[k] = setTimeout(() => { zt[k] = 0; if (k !== atual) d.zera(); }, 850);
  });

  // 1. entrada: espera as fontes (senão o título sobe numa fonte e troca no meio)
  const contar = () => xt.querySelectorAll('.xt-fatos [data-conta]').forEach((el, i) => {
    const fim = +el.dataset.conta, t1 = performance.now() + 500 + i * 120, dur = 900;
    el.textContent = '0';
    const passo = t => { const k = Math.min(1, Math.max(0, (t - t1) / dur)); el.textContent = Math.round(fim * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  });
  const liga = () => {
    if (ligou) return;
    xt.classList.add('pronto');
    if (calmo) { ligou = true; return; }
    contar();
    // o produto começa a rodar quando o palco termina de chegar
    setTimeout(() => { ligou = true; t0 = performance.now(); rodaDemo(); xdConta(pes[atual]); }, 900);
  };

  const mostra = (i, comFoco) => {
    const ant = atual, troca = i !== ant;
    atual = i; t0 = performance.now();
    // indo para a próxima (inclusive 3 → 1), a nova entra pela direita; voltando, pela esquerda
    const dir = !troca ? 0 : ((i - ant + cenas.length) % cenas.length === 1 ? 1 : -1);
    abas.forEach((a, k) => { const on = k === i; a.setAttribute('aria-selected', on); a.tabIndex = on ? 0 : -1; });
    cenas.forEach((c, k) => {
      const on = k === i;
      if (on && dir && !calmo) { c.style.transition = 'none'; c.style.setProperty('--lado', dir); void c.offsetWidth; c.style.transition = ''; }
      else if (k === ant && dir) c.style.setProperty('--lado', -dir);
      c.classList.toggle('on', on); if ('inert' in c) c.inert = !on; c.setAttribute('aria-hidden', !on);
    });
    barras.forEach((b, k) => b.style.setProperty('--p', k < i ? 1 : 0));
    if (troca && !calmo) {
      tela.animate([{ scale: '1' }, { scale: '.975', offset: .45 }, { scale: '1' }], { duration: 820, easing: 'cubic-bezier(.65,0,.35,1)' });
      if (ligou) xdConta(pes[i]);
    }
    rodaDemo();
    if (comFoco) abas[i].focus();
  };
  // o que pausa (igual nos palcos com filme): mouse em cima, foco dentro, o botão de pausa; fora da tela, parado
  const botao = xt.querySelector('.palco-pausa');
  let pelaBotao = false;
  const parado = () => sobre || foco || pelaBotao;
  const estado = () => {
    const p = parado();
    live.classList.toggle('pausado', p);
    liveT.textContent = !p ? 'Verticais rodando' : sobre && !pelaBotao ? 'Pausado · passe o mouse fora pra seguir' : 'Pausado';
    if (botao) botao.setAttribute('aria-pressed', pelaBotao ? 'true' : 'false');
  };

  abas.forEach((a, i) => {
    a.addEventListener('click', () => mostra(i));
    a.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      const k = d ? (i + d + abas.length) % abas.length : e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 : -1;
      if (k < 0) return;
      e.preventDefault();
      mostra(k, true);
    });
  });

  // o relógio: fora da tela ele para de vez (nenhum quadro de animação gasto) e volta do ponto onde estava
  let rafT = 0;
  const pDe = () => parseFloat(barras[atual].style.getPropertyValue('--p')) || 0;
  const tique = t => {
    rafT = 0;
    if (ligou && visivel && !parado() && !document.hidden) {
      const k = (t - t0) / DUR;
      barras[atual].style.setProperty('--p', Math.min(1, k).toFixed(3));
      if (k >= 1) mostra((atual + 1) % cenas.length);
    } else t0 = t - pDe() * DUR;
    if (visivel && !pelaBotao) rafT = requestAnimationFrame(tique);
  };
  const retoma = () => { if (visivel && !pelaBotao && !rafT) { t0 = performance.now() - pDe() * DUR; rafT = requestAnimationFrame(tique); } };
  const fixa = +q.get('vertical');
  const filme = !fixa && !calmo;
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting; rodaDemo();
    if (filme) retoma();
  }).observe(palco);

  if (!filme) {
    mostra(fixa ? Math.min(3, Math.max(1, fixa)) - 1 : 0);
    barras[atual].style.setProperty('--p', 1);
    liveT.textContent = 'Verticais';
    live.classList.add('pausado');
  } else {
    mostra(0);
    rafT = requestAnimationFrame(tique);
    if (botao) {
      botao.hidden = false;
      botao.addEventListener('click', () => { pelaBotao = !pelaBotao; estado(); rodaDemo(); retoma(); });
    }
    // o mouse pausa só sobre o cartão do produto (como no Roomi 360), não no palco inteiro; o toque não pausa
    // (no celular o mouseenter emulado do toque prendia a pausa até tocar fora)
    tela.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; sobre = true; estado(); });
    tela.addEventListener('pointerleave', e => { if (e.pointerType !== 'mouse') return; sobre = false; estado(); });
    // só o foco de teclado segura (o clique no botão de pausa também dá foco, e não pode prender o filme parado)
    palco.addEventListener('focusin', e => { let v = false; try { v = e.target.matches(':focus-visible'); } catch (_) { } if (v) { foco = true; estado(); } });
    palco.addEventListener('focusout', e => { if (!palco.contains(e.relatedTarget)) { foco = false; estado(); } });
  }

  if (calmo) liga();
  else if (document.fonts && document.fonts.ready) { document.fonts.ready.then(liga, liga); setTimeout(liga, 1500); }
  else liga();

  // 3. profundidade: o mouse inclina a tela, move a ilustração e o brilho do palco (só com mouse de verdade)
  if (!calmo && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const cena = xt.querySelector('.xt-cena-img'), glow = xt.querySelector('.xt-glow');
    let alvo = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
    const anima = () => {
      cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
      tela.style.setProperty('--ry', (-6 + cur.x * 5).toFixed(2) + 'deg');
      tela.style.setProperty('--rx', (4 - cur.y * 4).toFixed(2) + 'deg');
      cena.style.setProperty('--cx', (-cur.x * 12).toFixed(1) + 'px');
      cena.style.setProperty('--cy', (-cur.y * 8).toFixed(1) + 'px');
      glow.style.setProperty('--mx', (78 + cur.x * 22).toFixed(1) + '%');
      glow.style.setProperty('--my', (18 + cur.y * 22).toFixed(1) + '%');
      if (Math.abs(alvo.x - cur.x) > .002 || Math.abs(alvo.y - cur.y) > .002) raf = requestAnimationFrame(anima); else raf = 0;
    };
    const area = xt.querySelector('.xt-in');
    // a caixa do palco é lida uma vez e guardada (rolar ou mudar a janela pede de novo): sem ler layout a cada movimento
    let caixa = null; const esquece = () => { caixa = null; };
    addEventListener('scroll', esquece, { passive: true }); addEventListener('resize', esquece, { passive: true });
    area.addEventListener('pointermove', e => {
      const r = caixa || (caixa = palco.getBoundingClientRect());
      alvo = { x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2)), y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2)) };
      if (!raf) raf = requestAnimationFrame(anima);
    }, { passive: true });
    area.addEventListener('pointerleave', () => { alvo = { x: 0, y: 0 }; if (!raf) raf = requestAnimationFrame(anima); });
  }
}

})();
/* ===== x2-verticais.js */
;(()=>{if(!document.querySelector('[data-secao="x2-verticais"]'))return;
// Quadro "ao cubo" das verticais (x2-verticais): abas das 3 verticais (clique, setas, Home/End), sanfona das frentes
// no celular, o brilho do bloco em tinta seguindo o mouse. A entrada: o título e o kicker vêm da camada global
// (00-nivel); abas, bloco em tinta e cartões chegam escalonados quando o quadro entra na tela (.xv-vista, abaixo)
// e os cartões chegam de novo a cada troca de vertical (CSS).
// Âncoras: os painéis têm id="midia|revenue|branding". Abrir verticais.html#revenue (ou clicar num link #revenue)
// abre a aba certa e rola até o começo do quadro (título e abas à vista).
const xv = document.querySelector('.xv');
if (xv) {
  xv.classList.add('xv-js');
  const abas = [...xv.querySelectorAll('.xv-aba')];
  const paineis = [...xv.querySelectorAll('.xv-painel')];
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const celular = matchMedia('(max-width: 900px)');

  // entrada: as peças chegam quando o quadro entra na tela (movimento reduzido ou sem observador: já visíveis)
  if (calmo || !('IntersectionObserver' in window)) xv.classList.add('xv-vista');
  else {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { xv.classList.add('xv-vista'); io.disconnect(); } }, { threshold: .15 });
    io.observe(xv);
  }

  // a demonstração grande de cada vertical roda de verdade (motor xdVivo do x1-topo-verticais.js) enquanto o painel
  // dela está aberto e o quadro está na tela; a que sai para e zera depois do fade. No celular ela não aparece: não roda.
  const demos = paineis.map(p => !calmo && window.xdVivo ? window.xdVivo(p.querySelector('.xd')) : null);
  const zt = paineis.map(() => 0);
  let naTela = false, contado = '';
  const rodaDemo = () => paineis.forEach((p, k) => {
    const d = demos[k];
    if (!d) return;
    const on = p.classList.contains('on'), demo = p.querySelector('.xv-demo');
    if (on) { clearTimeout(zt[k]); zt[k] = 0; if (naTela && demo && demo.offsetWidth) d.liga(); else d.pausa(); }
    else if (!zt[k]) zt[k] = setTimeout(() => { zt[k] = 0; if (!p.classList.contains('on')) d.zera(); }, 450);
  });
  // o destaque da vertical aberta ("30 a 60 dias") conta do zero quando aparece
  const conta = () => {
    const p = paineis.find(p => p.classList.contains('on'));
    if (calmo || !naTela || !p || contado === p.id || !window.xdConta) return;
    contado = p.id;
    window.xdConta(p.querySelector('.xv-destaque b'));
  };

  let atual = -1;
  const abre = (id, foco) => {
    const aba = abas.find(a => a.dataset.v === id);
    if (!aba) return false;
    const i = abas.indexOf(aba), dir = atual < 0 || i === atual ? 0 : i > atual ? 1 : -1;
    abas.forEach(a => { const on = a === aba; a.setAttribute('aria-selected', on); a.tabIndex = on ? 0 : -1; });
    paineis.forEach((p, k) => {
      const on = p.id === id;
      // câmera: o que entra vem do lado da aba escolhida, o que sai vai para o outro
      if (on && dir && !calmo) { p.style.setProperty('--lado', dir); p.querySelectorAll('.xv-info,.xv-demo').forEach(el => { el.style.transition = 'none'; void el.offsetWidth; el.style.transition = ''; }); }
      else if (k === atual && dir) p.style.setProperty('--lado', -dir);
      p.classList.toggle('on', on); p.setAttribute('aria-hidden', !on); if ('inert' in p) p.inert = !on;
    });
    atual = i;
    xv.classList.toggle('is-marca', id === 'branding');
    if (dir) contado = '';
    rodaDemo(); conta();
    if (foco) aba.focus();
    return true;
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { naTela = e.isIntersecting; rodaDemo(); conta(); }, { threshold: .12 }).observe(xv);
  addEventListener('resize', rodaDemo, { passive: true });

  abas.forEach((a, i) => {
    a.addEventListener('click', () => abre(a.dataset.v));
    a.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      const k = d ? (i + d + abas.length) % abas.length : e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 : -1;
      if (k < 0) return;
      e.preventDefault();
      abre(abas[k].dataset.v, true);
    });
  });

  // sanfona das frentes (o CSS só esconde no celular): uma aberta por vertical. No desktop o botão não é parada do Tab.
  const botoes = [...xv.querySelectorAll('.xv-frente h4 button')];
  const ajusta = () => botoes.forEach(b => {
    if (celular.matches) { b.removeAttribute('tabindex'); b.setAttribute('aria-expanded', b.closest('.xv-frente').classList.contains('aberta')); }
    else { b.tabIndex = -1; b.removeAttribute('aria-expanded'); }
  });
  ajusta();
  celular.addEventListener ? celular.addEventListener('change', ajusta) : celular.addListener(ajusta);
  botoes.forEach(b => b.addEventListener('click', () => {
    if (!celular.matches) return;
    const fr = b.closest('.xv-frente');
    fr.parentElement.querySelectorAll('.xv-frente').forEach(f => {
      const on = f === fr;
      f.classList.toggle('aberta', on);
      f.querySelector('h4 button').setAttribute('aria-expanded', on);
    });
  }));

  // hash: abre a aba e mostra o quadro desde o título
  const doHash = rola => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!abre(id)) return;
    if (rola) requestAnimationFrame(() => xv.scrollIntoView({ block: 'start', behavior: calmo ? 'auto' : 'smooth' }));
  };
  const inicial = decodeURIComponent(location.hash.slice(1));
  if (!abre(inicial)) abre('midia');
  else {
    // o navegador rola até o painel na carga; depois disso, alinha no começo do quadro
    const alinha = () => setTimeout(() => xv.scrollIntoView({ block: 'start' }), 60);
    if (document.readyState === 'complete') alinha(); else addEventListener('load', alinha, { once: true });
  }
  addEventListener('hashchange', () => doHash(true));
  // clique num link para a vertical que já está no hash (hashchange não dispara): abre e rola igual
  document.addEventListener('click', e => {
    const l = e.target.closest && e.target.closest('a[href*="#"]');
    if (!l) return;
    const u = new URL(l.href, location.href);
    if (u.pathname !== location.pathname || u.hash !== location.hash) return;
    if (!abas.some(a => '#' + a.dataset.v === u.hash)) return;
    e.preventDefault();
    doHash(true);
  });

  // o brilho coral do bloco em tinta acompanha o mouse (só com mouse de verdade)
  if (!calmo && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    xv.querySelectorAll('.xv-info').forEach(info => {
      const glow = info.querySelector('.xv-glow');
      let alvo = { x: 92, y: 6 }, cur = { x: 92, y: 6 }, raf = 0;
      const anima = () => {
        cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
        glow.style.setProperty('--mx', cur.x.toFixed(1) + '%');
        glow.style.setProperty('--my', cur.y.toFixed(1) + '%');
        raf = Math.abs(alvo.x - cur.x) > .1 || Math.abs(alvo.y - cur.y) > .1 ? requestAnimationFrame(anima) : 0;
      };
      info.addEventListener('pointermove', e => {
        const r = info.getBoundingClientRect();
        alvo = { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 };
        if (!raf) raf = requestAnimationFrame(anima);
      }, { passive: true });
      info.addEventListener('pointerleave', () => { alvo = { x: 92, y: 6 }; if (!raf) raf = requestAnimationFrame(anima); });
    });

    // profundidade nas frentes: o cartão inclina para o lado do mouse (amortecido) e o brilho segue o ponteiro
    xv.querySelectorAll('.xv-frente').forEach(fr => {
      let alvo = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, raf = 0;
      const MAX = 5;
      const anima = () => {
        cur.x += (alvo.x - cur.x) * .08; cur.y += (alvo.y - cur.y) * .08;
        const ang = Math.hypot(cur.x, cur.y) * MAX;
        fr.style.rotate = ang > .02 ? `${(-cur.y).toFixed(3)} ${cur.x.toFixed(3)} 0 ${ang.toFixed(2)}deg` : '';
        raf = Math.abs(alvo.x - cur.x) > .003 || Math.abs(alvo.y - cur.y) > .003 ? requestAnimationFrame(anima) : 0;
      };
      fr.addEventListener('pointermove', e => {
        const r = fr.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        alvo = { x: Math.max(-1, Math.min(1, (px - .5) * 2)), y: Math.max(-1, Math.min(1, (py - .5) * 2)) };
        fr.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); fr.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        fr.classList.add('inc');
        if (!raf) raf = requestAnimationFrame(anima);
      }, { passive: true });
      fr.addEventListener('pointerleave', () => { alvo = { x: 0, y: 0 }; fr.classList.remove('inc'); if (!raf) raf = requestAnimationFrame(anima); });
    });
  }
}

})();