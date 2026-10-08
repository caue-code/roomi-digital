/* calc · Calculadora de valor (portada do deck institucional, slide 19, js/p2-calculadora.js)
   O visitante preenche os números do hotel; a peça projeta o ganho anual em 3 cenários.
   Nada sai da página: sem fetch, sem storage.

   PREMISSAS — editáveis dentro de cada card de cenário
   Padrões definidos pela Roomi (premissa da simulação), ocupação +p.p. · diária +% · venda direta +p.p.:
     Conservador: 5 · 6 · 10
     Provável:    7 · 7 · 20
     Forte:       8 · 8 · 25
   "Ajustar todos" multiplica as 9 premissas de uma vez (50%–150%, de 10 em 10).
   Contas:
     Receita anual = quartos × 365 × ocupação × diária
     Ocupação projetada = mín(95%, ocupação + p.p. do cenário)
     Mais ocupação  = quartos × 365 × (ocupação projetada − ocupação) × diária de hoje
     Diária maior   = quartos × 365 × ocupação projetada × diária × % do cenário
     Venda que migra pra direta = mín(p.p. do cenário, OTAs + operadoras); sai de OTAs e operadoras
       na proporção da participação de cada um ("outros" não migra)
     Comissão economizada = receita projetada × (p.p. migrado de OTA × comissão OTA
                                                 + p.p. migrado de operadora × comissão operadora)
   Canais: somam 100%; ao mexer num canal, "outros" absorve a diferença; se "outros" chega a 0,
   os demais cedem na proporção (nunca negativo).
   Abre VAZIA: o "Seu hotel" começa sem nenhum número (as premissas dos cenários vêm preenchidas).
   Obrigatórios: quartos, ocupação, diária, os 4 canais (somando 100%) e as 2 comissões. "Confirmar"
   só libera com tudo preenchido; antes disso nenhum valor de resultado aparece. Apagar um obrigatório
   depois volta ao estado não confirmado; "zerar" limpa tudo; "hotel exemplo" preenche os padrões de P2_CAMPOS
   e confirma (site v3: só quando a pessoa clica, com o selo "exemplo" no botão).
   (Os padrões de P2_CAMPOS ficam só como referência da simulação; não preenchem nada.)
   O bloco <calc>…</calc> é cópia literal do deck.
*/
(function () {
  // <calc>
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
  var P2_MIX = ['direta', 'otas', 'oper', 'outros'];
  var P2_OCC_TETO = 95;

  // h: campos do hotel (em %); P: premissas efetivas { cons: {occ, dm, dir}, ... } em p.p./%
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
  // R$ 1,2 mi · R$ 850 mil · R$ 123 mi (acima de 100 mi sem casa decimal)
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

  var s = document.querySelector('.calc');
  if (!s) return;

  // --- estado das premissas (base × multiplicador = o que aparece nos cards) ---
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  var premBase = copia(P2_PREM_PADRAO);
  var mult = 100;

  // --- confirmação: sem ela, nenhum valor de resultado aparece ---
  var confirmado = false;
  var P2_OBRIG = ['quartos', 'occ', 'dm', 'comOta', 'comOp'];

  // --- estado do mix de canais (sempre soma 100) ---
  // Vazio até o primeiro canal digitado; aí parte de 0/0/0/100 e "outros" absorve como sempre.
  var MIX_INICIO = { direta: 0, otas: 0, oper: 0, outros: 100 };
  var mixVazio = true;
  var mixEstado = copia(MIX_INICIO);
  var foto = null; // mix no início da edição (foco): ida e volta devolve o mix
  function mixAtual() { var m = {}; P2_MIX.forEach(function (k) { m[k] = mixEstado[k]; }); return m; }

  function lerTexto(t0) {
    var t = String(t0).replace(/[^\d,.]/g, '');
    if (/,/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    if (!t) return NaN;
    return parseFloat(t);
  }
  function limita(k, v) {
    var c = P2_CAMPOS[k];
    if (isNaN(v)) return c.padrao;
    return Math.min(c.max, Math.max(c.min, v));
  }
  function campo(k) { return s.querySelector('.calc-in[data-k="' + k + '"]'); }
  function barra(k) { return s.querySelector('.calc-range[data-k="' + k + '"]'); }
  // NaN = campo vazio (não cai no padrão: o hotel não tem número de mentira)
  function valor(k) {
    if (P2_MIX.indexOf(k) >= 0) return mixEstado[k];
    var i = campo(k);
    var v = i ? lerTexto(i.value) : NaN;
    return isNaN(v) ? NaN : limita(k, v);
  }
  function completo() {
    if (mixVazio) return false;
    var ok = P2_OBRIG.concat(P2_MIX).every(function (k) { var i = campo(k); return i && !isNaN(lerTexto(i.value)); });
    var soma = 0; P2_MIX.forEach(function (k) { soma += mixEstado[k]; });
    return ok && Math.round(soma) === 100;
  }
  // barra deslizante na ponta esquerda, sem valor (campo vazio)
  function neutro(k) {
    var r = barra(k);
    if (r) { r.value = r.min; pintaRange(r); r.style.setProperty('--p', '0%'); }
  }
  function hotel() {
    var h = {};
    Object.keys(P2_CAMPOS).forEach(function (k) { if (k !== 'mult') h[k] = valor(k); });
    return h;
  }
  function pintaRange(r) {
    var mn = +r.min, mx = +r.max;
    r.style.setProperty('--p', ((+r.value - mn) / (mx - mn) * 100).toFixed(2) + '%');
  }
  function sincroniza(k, v, reescreve) {
    var r = barra(k);
    if (r) { r.value = String(v); pintaRange(r); }
    if (reescreve) { var t = campo(k); if (t) t.value = p2Campo(k, v); }
  }

  // --- canais: "outros" absorve; se zerar, os demais cedem na proporção ---
  function inteiros(m, fixo) {
    // arredonda pra inteiros mantendo a soma 100 (maior resto), sem mexer no campo fixo
    var ks = P2_MIX.filter(function (k) { return k !== fixo; });
    var alvo = 100 - m[fixo];
    var baixo = {}, soma = 0;
    ks.forEach(function (k) { baixo[k] = Math.floor(m[k] + 1e-9); soma += baixo[k]; });
    ks.slice().sort(function (a, b) { return (m[b] - baixo[b]) - (m[a] - baixo[a]); })
      .forEach(function (k) { if (soma < alvo) { baixo[k]++; soma++; } });
    ks.forEach(function (k) { m[k] = baixo[k]; });
    return m;
  }
  function aplicaMix(f, k, v) {
    var m = mixAtual(); P2_MIX.forEach(function (x) { m[x] = f[x]; });
    v = Math.round(Math.min(100, Math.max(0, v)));
    var delta = v - m[k];
    m[k] = v;
    if (k !== 'outros') {
      m.outros -= delta;
      if (m.outros < 0) {
        var falta = -m.outros; m.outros = 0;
        var dois = ['direta', 'otas', 'oper'].filter(function (x) { return x !== k; });
        var soma = m[dois[0]] + m[dois[1]];
        dois.forEach(function (x) { m[x] = soma > 0 ? Math.max(0, m[x] - falta * m[x] / soma) : 0; });
      }
    } else {
      var s3 = m.direta + m.otas + m.oper;
      if (s3 > 0) ['direta', 'otas', 'oper'].forEach(function (x) { m[x] = Math.max(0, m[x] - delta * m[x] / s3); });
      else m.otas = Math.max(0, -delta);
    }
    return inteiros(m, k);
  }
  function gravaMix(m, exceto) {
    P2_MIX.forEach(function (x) {
      mixEstado[x] = m[x];
      var seg = s.querySelector('.calc-seg[data-k="' + x + '"]');
      if (seg) seg.style.width = (mixVazio ? 0 : m[x]) + '%';
      if (x !== exceto) campo(x).value = mixVazio ? '' : p2Campo(x, m[x]);
    });
  }

  // --- premissas por cenário ---
  function premEfetivas() { return p2Efetivas(premBase, mult); }
  function gravaPrem(exceto) {
    var P = premEfetivas();
    [].forEach.call(s.querySelectorAll('.calc-pin'), function (i) {
      if (i === exceto) return;
      i.value = p2Campo('prem', P[i.getAttribute('data-c')][i.getAttribute('data-f')]);
    });
    var m = s.querySelector('[data-f="mult"]');
    if (m) m.textContent = p2Campo('mult', mult) + '%';
  }
  function editaPrem(i, v) {
    var c = i.getAttribute('data-c'), f = i.getAttribute('data-f');
    if (isNaN(v)) return;
    v = Math.min(P2_PREM_LIM[f], Math.max(0, v));
    premBase[c][f] = v * 100 / mult;
  }

  // --- animação curta (~250 ms) dos números ---
  var DUR = 250;
  function reduz() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function anima(el, alvo, fmt) {
    var de = parseFloat(el.getAttribute('data-v'));
    if (isNaN(de)) de = alvo;
    el.setAttribute('data-v', String(alvo));
    if (el._calcRaf) cancelAnimationFrame(el._calcRaf);
    // fora da tela ou com movimento reduzido: vai direto pro valor final
    if (reduz() || !visivel || de === alvo) { fmt(el, alvo); return; }
    var t0 = null;
    function passo(t) {
      if (t0 === null) t0 = t;
      var x = Math.min(1, (t - t0) / DUR);
      var e = 1 - Math.pow(1 - x, 3);
      fmt(el, de + (alvo - de) * e);
      if (x < 1) el._calcRaf = requestAnimationFrame(passo); else el._calcRaf = null;
    }
    el._calcRaf = requestAnimationFrame(passo);
  }
  function fmtGrande(el, v) {
    var p = p2Partes(v);
    var gn = el.querySelector('.calc-gn');
    gn.textContent = p.n;
    el.querySelector('.calc-gu').textContent = p.u;
    // número longo (ex.: 59,1 · 238) encolhe pra caber no card (tamanhos no css: data-tam 3 · 4 · 5)
    var L = p.n.length, curto = L <= 2 || (L === 3 && p.n.indexOf(',') >= 0);
    var tam = curto ? '' : L === 3 ? '3' : L === 4 ? '4' : '5';
    if (tam) gn.setAttribute('data-tam', tam); else gn.removeAttribute('data-tam');
  }
  function fmtBrl(el, v) { el.textContent = p2Brl(v); }
  function fmtBrlAno(el, v) { el.textContent = p2Brl(v) + '/ano'; }
  function fmtPct(el, v) { el.textContent = '+' + p2Num(Math.round(v * 100), 0) + '%'; }

  // Estado não confirmado: nenhum número de resultado na tela (só "—").
  function esvazia() {
    var b = s.querySelector('[data-f="base"]');
    if (b) { if (b._calcRaf) cancelAnimationFrame(b._calcRaf); b.removeAttribute('data-v'); b.textContent = 'R$ —'; }
    [].forEach.call(s.querySelectorAll('.calc-cen'), function (card) {
      var t = card.querySelector('[data-f="total"]'), p = card.querySelector('[data-f="pct"]');
      [t, p].concat([].slice.call(card.querySelectorAll('.calc-lv'))).forEach(function (el) {
        if (el._calcRaf) cancelAnimationFrame(el._calcRaf);
        el.removeAttribute('data-v');
      });
      t.querySelector('.calc-gn').textContent = '—';
      t.querySelector('.calc-gn').removeAttribute('data-tam');
      t.querySelector('.calc-gu').textContent = '';
      p.textContent = '—';
      [].forEach.call(card.querySelectorAll('.calc-lv'), function (el) { el.textContent = '—'; });
      [].forEach.call(card.querySelectorAll('.calc-barra i'), function (i) { i.style.width = '0%'; });
    });
  }
  // Ponto único de atualização: confere obrigatórios, liga/desliga o Confirmar e mostra ou esconde.
  function atualiza() {
    var ok = completo();
    if (!ok) confirmado = false;
    var main = s.querySelector('.calc-main');
    if (main) main.classList.toggle('calc-pend', !confirmado);
    var bt = s.querySelector('[data-acao="confirmar"]');
    if (bt) {
      bt.disabled = !ok || confirmado;
      bt.classList.toggle('calc-feito', confirmado);
      bt.textContent = confirmado ? 'confirmado' : 'Confirmar';
    }
    if (confirmado) recalcula(); else esvazia();
  }

  function recalcula() {
    var r = p2Calc(hotel(), premEfetivas());
    var b = s.querySelector('[data-f="base"]');
    if (b) anima(b, r.base, fmtBrlAno);
    Object.keys(r.cen).forEach(function (k) {
      var c = r.cen[k];
      var card = s.querySelector('.calc-cen[data-c="' + k + '"]');
      if (!card) return;
      anima(card.querySelector('[data-f="total"]'), c.total, fmtGrande);
      anima(card.querySelector('[data-f="pct"]'), c.pct, fmtPct);
      ['occ', 'dm', 'com'].forEach(function (f) {
        var lin = card.querySelector('.calc-lin[data-f="' + f + '"]');
        anima(lin.querySelector('.calc-lv'), c[f], fmtBrl);
        var w = r.max > 0 ? c[f] / r.max * 100 : 0;
        lin.querySelector('.calc-barra i').style.width = w.toFixed(2) + '%';
      });
    });
  }

  // Valor novo no campo k (da barra ou do texto). texto = veio digitado (não reescreve o campo).
  function muda(k, v, texto) {
    if (isNaN(v)) {
      // campo apagado: não inventa número; a barra (se houver) volta ao neutro
      if (P2_MIX.indexOf(k) < 0) neutro(k);
    } else if (P2_MIX.indexOf(k) >= 0) {
      if (!foto) foto = mixAtual();
      mixVazio = false;
      gravaMix(aplicaMix(foto, k, v), texto ? k : null);
    } else {
      sincroniza(k, limita(k, v), !texto);
    }
    atualiza();
  }

  s.addEventListener('input', function (e) {
    var el = e.target;
    if (el.classList.contains('calc-pin')) { editaPrem(el, lerTexto(el.value)); atualiza(); return; }
    var k = el.getAttribute('data-k');
    if (!k || !P2_CAMPOS[k]) return;
    if (el.classList.contains('calc-range')) muda(k, +el.value, false);
    else if (el.classList.contains('calc-in')) muda(k, lerTexto(el.value), true);
  });

  // Ao sair do campo (ou soltar a barra): texto volta formatado e dentro da faixa.
  s.addEventListener('change', function (e) { normaliza(e.target); });
  function normaliza(el) {
    if (el.classList.contains('calc-pin')) { gravaPrem(null); atualiza(); return; }
    var k = el.getAttribute('data-k');
    if (!k) return;
    if (P2_MIX.indexOf(k) >= 0) gravaMix(mixAtual(), null);
    else if (el.classList.contains('calc-in')) { var v = valor(k); if (!isNaN(v)) sincroniza(k, v, true); }
    atualiza();
  }

  s.addEventListener('focusin', function (e) {
    foto = P2_MIX.indexOf(e.target.getAttribute('data-k')) >= 0 ? mixAtual() : null;
  });

  // Setas ↑/↓ nos números editáveis andam um passo; Enter normaliza.
  s.addEventListener('keydown', function (e) {
    var el = e.target;
    if (!(el.classList.contains('calc-in') || el.classList.contains('calc-pin'))) return;
    if (e.key === 'Enter') { normaliza(el); e.preventDefault(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    var sinal = e.key === 'ArrowUp' ? 1 : -1;
    if (el.classList.contains('calc-pin')) {
      var atualP = lerTexto(el.value); if (isNaN(atualP)) atualP = 0;
      editaPrem(el, Math.max(0, atualP + 0.5 * sinal));
      gravaPrem(null);
      atualiza();
      return;
    }
    var k = el.getAttribute('data-k');
    var r = barra(k);
    var passo = +el.getAttribute('data-passo') || (r ? +r.step || 1 : 1);
    var atual = valor(k);
    // campo vazio: a seta começa do mínimo da faixa (nunca de um padrão)
    muda(k, isNaN(atual) ? P2_CAMPOS[k].min : limita(k, atual + passo * sinal), false);
  });

  s.addEventListener('click', function (e) {
    var bt = e.target.closest('[data-acao]');
    if (!bt || !s.contains(bt)) return;
    var acao = bt.getAttribute('data-acao');
    if (acao === 'zerar') {
      P2_OBRIG.forEach(function (k) { var i = campo(k); if (i) i.value = ''; neutro(k); });
      mixVazio = true;
      gravaMix(copia(MIX_INICIO), null);
      foto = null;
      confirmado = false;
    } else if (acao === 'exemplo') {
      // hotel exemplo (só quando a pessoa pede): os padrões de P2_CAMPOS, já confirmado
      P2_OBRIG.forEach(function (k) { var i = campo(k); if (i) i.value = p2Campo(k, P2_CAMPOS[k].padrao); sincroniza(k, P2_CAMPOS[k].padrao, true); });
      var mx = {}; P2_MIX.forEach(function (k) { mx[k] = P2_CAMPOS[k].padrao; });
      mixVazio = false;
      gravaMix(mx, null);
      foto = null;
      confirmado = true;
    } else if (acao === 'confirmar') {
      if (completo()) confirmado = true;
    } else if (acao === 'restaurar') {
      premBase = copia(P2_PREM_PADRAO);
      mult = 100;
      gravaPrem(null);
    } else if (acao === 'menos' || acao === 'mais') {
      mult = limita('mult', mult + (acao === 'mais' ? 10 : -10));
      gravaPrem(null);
    }
    atualiza();
  });

  // Estado estático (vazio, não confirmado) já vem no HTML; aqui só confere barras e botão.
  function inicia() {
    P2_OBRIG.forEach(function (k) { var i = campo(k); if (i && isNaN(lerTexto(i.value))) neutro(k); });
    atualiza();
  }

  // Entra quando aparece na tela (threshold .3): só anima os números enquanto visível.
  // A peça é mais alta que a tela no celular; aí vale ocupar 30% da tela.
  var visivel = true;
  if ('IntersectionObserver' in window) {
    visivel = false;
    new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        var alt = en.rootBounds ? en.rootBounds.height : window.innerHeight;
        visivel = en.isIntersecting && (en.intersectionRatio >= 0.3 || en.intersectionRect.height >= 0.3 * alt);
      });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.5, 1] }).observe(s);
  }
  inicia();
})();
