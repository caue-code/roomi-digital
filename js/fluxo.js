/* Roomi · site · peça "Como o Cubo trabalha" (prefixo fluxo), portada do p7b-cubo-trabalha.js do deck.
   Enquanto a peça está visível (IntersectionObserver, threshold .3), os dias passam num relógio rápido
   (24 h ≈ 13,4 s). Às 06:00 e às 14:00 acontece a carga: o JS põe .fluxo-carga na raiz e o CSS faz os
   pontos correrem das fontes até o Cubo, o Cubo pulsar e as saídas receberem. Fora da tela, para.
   Com movimento reduzido, no print e sem JS fica o estado estático (seg · 06:00 · carga da manhã).
   Desktop: mede a largura e põe --escala (palco 1720 de largura). Clique numa fonte/saída realça o
   caminho e mostra a legenda; clique de novo ou no vazio limpa. */
(function(){
  var raiz = document.querySelector('.fluxo');
  if (!raiz) return;

  var LARGURA_PALCO = 1720;
  var MS_POR_HORA = 560;
  var HORA_INICIAL = 4;            // entra às 04:00 de segunda: a 1ª carga vem logo
  var JANELA_CARGA = 2200;         // ms em que o rótulo fica "carga da manhã/tarde"
  var CARGAS = [6, 14];
  var DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

  var raf = 0, rodando = false, visivel = false, h = 0, dia = 0, tAnt = 0, tCarga = -1e9, ultimaCarga = 6;
  var q = function(sel){ return raiz.querySelector(sel); };
  var elDia = q('.fluxo-dia'), elHora = q('.fluxo-hora'), elRot = q('.fluxo-rot');
  var elPh = q('.fluxo-ponteiro-h'), elPm = q('.fluxo-ponteiro-m');
  var mmCalmo = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function calmo(){ return !!(mmCalmo && mmCalmo.matches); }
  function dois(n){ return (n < 10 ? '0' : '') + n; }

  /* ——— escala do palco ——— */
  function escala(){
    var w = raiz.clientWidth;
    if (w > 0) raiz.style.setProperty('--escala', (w / LARGURA_PALCO).toFixed(5));
  }
  escala();
  if (window.ResizeObserver) new ResizeObserver(escala).observe(raiz);
  else window.addEventListener('resize', escala);

  /* ——— relógio ——— */
  function pinta(agora){
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    if (elDia) elDia.textContent = DIAS[dia % 7];
    if (elHora) elHora.textContent = dois(hh) + ':' + dois(mm);
    if (elRot) {
      var emCarga = agora - tCarga < JANELA_CARGA;
      elRot.classList.toggle('fluxo-agora', emCarga);
      if (emCarga) elRot.textContent = ultimaCarga === 6 ? 'carga da manhã' : 'carga da tarde';
      else elRot.textContent = 'próxima carga ' + (h >= 6 && h < 14 ? '14:00' : '06:00');
    }
    if (elPh) elPh.style.transform = 'rotate(' + ((h % 12) * 30) + 'deg)';
    if (elPm) elPm.style.transform = 'rotate(' + ((h % 1) * 360) + 'deg)';
  }

  function estatico(){
    raiz.classList.remove('fluxo-carga');
    if (elDia) elDia.textContent = 'seg';
    if (elHora) elHora.textContent = '06:00';
    if (elRot) { elRot.textContent = 'carga da manhã'; elRot.classList.remove('fluxo-agora'); }
    if (elPh) elPh.style.transform = '';
    if (elPm) elPm.style.transform = '';
  }

  function carga(qual, agora){
    ultimaCarga = qual;
    tCarga = agora;
    raiz.classList.remove('fluxo-carga');
    void raiz.offsetWidth; // reinicia as animações CSS da carga
    raiz.classList.add('fluxo-carga');
  }

  function passo(agora){
    if (!rodando) { raf = 0; return; }
    var dt = Math.min(agora - tAnt, 100); // aba em segundo plano: não pula meio dia
    tAnt = agora;
    var antes = h;
    h += dt / MS_POR_HORA;
    if (h >= 24) { h -= 24; dia++; antes -= 24; }
    for (var i = 0; i < CARGAS.length; i++) {
      if (antes < CARGAS[i] && h >= CARGAS[i]) carga(CARGAS[i], agora);
    }
    pinta(agora);
    raf = requestAnimationFrame(passo);
  }

  function parar(){
    rodando = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    estatico();
  }

  function iniciar(){
    parar();
    if (calmo()) return;
    h = HORA_INICIAL; dia = 0; tCarga = -1e9;
    rodando = true;
    tAnt = performance.now();
    pinta(tAnt);
    raf = requestAnimationFrame(passo);
  }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function(entradas){
      entradas.forEach(function(e){
        visivel = e.isIntersecting;
        if (visivel) { if (!rodando) iniciar(); }
        else if (rodando) parar();
      });
    }, { threshold: .3 }).observe(raiz);
  }
  if (mmCalmo) {
    var trocou = function(){ if (calmo()) parar(); else if (visivel) iniciar(); };
    if (mmCalmo.addEventListener) mmCalmo.addEventListener('change', trocou);
    else if (mmCalmo.addListener) mmCalmo.addListener(trocou);
  }
  window.addEventListener('beforeprint', parar);
  window.addEventListener('afterprint', function(){ if (visivel) iniciar(); });

  /* ——— seleção e legenda ——— */
  function legenda(alvo){
    var l = q('.fluxo-legenda');
    if (!l) return;
    var txt = l.querySelector('span');
    txt.textContent = '';
    if (!alvo) { l.classList.remove('fluxo-cheia'); return; }
    l.classList.add('fluxo-cheia');
    var b = document.createElement('b');
    b.textContent = alvo.getAttribute('data-fluxo-nome');
    txt.appendChild(b);
    var frase = ' — ' + alvo.getAttribute('data-fluxo-leg');
    if (alvo.hasAttribute('data-fluxo-pede')) frase += ' · ' + alvo.getAttribute('data-fluxo-pede');
    txt.appendChild(document.createTextNode(frase));
  }

  function limpar(){
    raiz.classList.remove('fluxo-foco');
    raiz.removeAttribute('data-fluxo-sel');
    [].forEach.call(raiz.querySelectorAll('.fluxo-on'), function(n){
      n.classList.remove('fluxo-on');
      if (n.hasAttribute('aria-pressed')) n.setAttribute('aria-pressed', 'false');
    });
    legenda(null);
  }

  function selecionar(k){
    if (raiz.getAttribute('data-fluxo-sel') === k) { limpar(); return; }
    limpar();
    raiz.classList.add('fluxo-foco');
    raiz.setAttribute('data-fluxo-sel', k);
    var alvo = null;
    [].forEach.call(raiz.querySelectorAll('[data-fluxo-k]'), function(n){
      if (n.getAttribute('data-fluxo-k') === k) {
        n.classList.add('fluxo-on');
        if (n.hasAttribute('aria-pressed')) n.setAttribute('aria-pressed', 'true');
        if (n.hasAttribute('data-fluxo-nome')) alvo = n;
      }
    });
    legenda(alvo);
  }

  raiz.addEventListener('click', function(e){
    var k = e.target && e.target.closest ? e.target.closest('[data-fluxo-k]') : null;
    if (k && raiz.contains(k)) selecionar(k.getAttribute('data-fluxo-k'));
    else limpar();
  });
})();
