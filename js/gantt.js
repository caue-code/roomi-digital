/* Roomi · peça "Serviço Padrão, os primeiros 6 meses" (Gantt), portada do gt5 do deck.
   Quando a peça aparece na tela, as barras crescem fase a fase (~1,6 s). Depois um cursor "Semana N"
   corre as 24 semanas em loop (1 s por semana): a fase sob ele acende a faixa, as barras sob ele ganham
   destaque e os pontos das reuniões e os marcos pulsam quando ele passa. Para quando a peça sai da tela.
   Com movimento reduzido, no celular (sem grade), no print e sem JS fica o Gantt estático completo. */
(function(){
  var s = document.querySelector('.gantt');
  if (!s) return;

  var MS_POR_SEMANA = 1000;
  var INTRO = 1600;                 // ms do crescimento das barras antes do cursor sair
  var SEMANAS = 24;

  var raf = 0, rodando = false, visivel = false, t = 0, tAnt = 0, tIni = 0, semAnt = 0;
  var mqCalmo = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqCel = window.matchMedia ? window.matchMedia('(max-width: 720px)') : null;

  function semGrade(){ return (mqCalmo && mqCalmo.matches) || (mqCel && mqCel.matches); }
  function todos(q){ return [].slice.call(s.querySelectorAll(q)); }
  function num(n, a){ return +n.getAttribute(a); }

  // posiciona o cursor em tt (semanas corridas, 0–24) e acende o que estiver sob ele
  function pinta(tt, pulsar){
    var cur = s.querySelector('.gantt-cursor'), fio = s.querySelector('.gantt-cursor-fio'), chip = s.querySelector('.gantt-chip');
    if (!cur || !fio || !chip) return;
    var w = Math.min(SEMANAS, Math.floor(tt) + 1);
    var gw = cur.offsetWidth, x = tt / SEMANAS * gw;
    fio.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
    if (w !== semAnt) {
      chip.textContent = 'Semana ' + w;
      todos('.gantt-sem').forEach(function(n, i){ n.classList.toggle('gantt-agora', i + 1 === w); });
      todos('.gantt-g [data-gantt-ini]').forEach(function(n){
        var on = num(n, 'data-gantt-ini') <= w && w <= num(n, 'data-gantt-fim');
        n.classList.toggle(n.classList.contains('gantt-fase') ? 'gantt-aceso' : 'gantt-on', on);
      });
      if (pulsar) {
        todos('.gantt-pt[data-gantt-w="' + w + '"],.gantt-marco[data-gantt-w="' + w + '"]').forEach(function(p){
          p.classList.remove('gantt-pulsa'); void p.offsetWidth; p.classList.add('gantt-pulsa');
        });
      }
      semAnt = w;
    }
    // o chip acompanha o cursor sem sair do Gantt pelas bordas
    var cw = chip.offsetWidth;
    chip.style.transform = 'translateX(' + Math.max(0, Math.min(gw - cw, x - cw / 2)).toFixed(1) + 'px)';
  }

  function apaga(){
    todos('.gantt-aceso,.gantt-on,.gantt-agora,.gantt-pulsa').forEach(function(n){ n.classList.remove('gantt-aceso', 'gantt-on', 'gantt-agora', 'gantt-pulsa'); });
    semAnt = 0;
  }

  function passo(agora){
    if (!rodando) { raf = 0; return; }
    if (agora - tIni >= INTRO) {
      if (s.classList.contains('gantt-entra')) { s.classList.remove('gantt-entra'); s.classList.add('gantt-viva'); tAnt = agora; pinta(t, true); }
      var dt = Math.min(agora - tAnt, 100);
      tAnt = agora;
      t += dt / MS_POR_SEMANA;
      if (t >= SEMANAS) t -= SEMANAS;
      pinta(t, true);
    }
    raf = requestAnimationFrame(passo);
  }

  function iniciar(){
    parar();
    if (semGrade()) return;
    t = 0; semAnt = 0;
    rodando = true;
    tIni = tAnt = performance.now();
    s.classList.remove('gantt-entra'); void s.offsetWidth;
    s.classList.add('gantt-entra');
    raf = requestAnimationFrame(passo);
  }

  function parar(){
    rodando = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    s.classList.remove('gantt-entra', 'gantt-viva');
    apaga();
  }

  if (!('IntersectionObserver' in window)) return;   // sem observador: fica o Gantt estático
  new IntersectionObserver(function(ents){
    ents.forEach(function(e){
      visivel = e.isIntersecting;
      if (visivel) { if (!rodando) iniciar(); }
      else if (rodando) parar();
    });
  }, { threshold: 0.3 }).observe(s);

  // mudou o movimento reduzido ou a largura (celular <-> grade): recomeça ou para conforme o caso
  function reavalia(){ if (visivel && !semGrade()) { if (!rodando) iniciar(); } else if (rodando) parar(); }
  [mqCalmo, mqCel].forEach(function(mq){
    if (!mq) return;
    if (mq.addEventListener) mq.addEventListener('change', reavalia); else if (mq.addListener) mq.addListener(reavalia);
  });

  window.addEventListener('beforeprint', function(){ if (rodando) parar(); });
  window.addEventListener('afterprint', function(){ setTimeout(reavalia, 0); });
})();
