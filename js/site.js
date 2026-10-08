/* Roomi · site v3 · o único script do site (fora as 4 peças).
   Abas genéricas ([data-abas]), menu do celular, link ativo do menu e as barras dos resultados.
   Sem JS: todos os painéis aparecem (o CSS só esconde com .js). */
(function(){
  var $$ = function(sel, el){ return [].slice.call((el || document).querySelectorAll(sel)); };

  /* ——— abas ——— */
  function liga(grupo){
    var lista = grupo.querySelector('[role=tablist]');
    if (!lista || lista.closest('[data-abas]') !== grupo) return;
    var abas = $$('[role=tab]', lista);
    function vai(alvo, foco){
      abas.forEach(function(a){
        var on = a === alvo;
        a.setAttribute('aria-selected', on ? 'true' : 'false');
        a.tabIndex = on ? 0 : -1;
        var p = document.getElementById(a.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (foco) alvo.focus();
    }
    abas.forEach(function(a, i){
      a.addEventListener('click', function(){ vai(a); });
      a.addEventListener('keydown', function(e){
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        vai(abas[(i + d + abas.length) % abas.length], true);
      });
    });
    vai(abas.filter(function(a){ return a.getAttribute('aria-selected') === 'true'; })[0] || abas[0]);
  }
  $$('[data-abas]').forEach(liga);

  // botão que leva a outra aba do mesmo grupo
  $$('[data-ir-aba]').forEach(function(b){
    b.addEventListener('click', function(){
      var t = document.getElementById(b.getAttribute('data-ir-aba'));
      if (t) { t.click(); t.focus({ preventScroll: true }); }
    });
  });

  /* ——— menu do celular ——— */
  var bt = document.querySelector('.topo-bt'), nav = document.getElementById('topo-nav');
  if (bt && nav) {
    var fecha = function(){ nav.classList.remove('aberto'); bt.setAttribute('aria-expanded', 'false'); };
    bt.addEventListener('click', function(){
      var abre = !nav.classList.contains('aberto');
      nav.classList.toggle('aberto', abre);
      bt.setAttribute('aria-expanded', abre ? 'true' : 'false');
    });
    $$('a', nav).forEach(function(a){ a.addEventListener('click', fecha); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') fecha(); });
  }

  if (!('IntersectionObserver' in window)) return;

  /* ——— link ativo do menu ——— */
  var links = $$('a[href^="#"]', nav);
  var porId = {};
  links.forEach(function(a){ porId[a.getAttribute('href').slice(1)] = a; });
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if (!e.isIntersecting) return;
      links.forEach(function(a){ a.classList.remove('on'); });
      var a = porId[e.target.id];
      if (a) a.classList.add('on');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach(function(s){ io.observe(s); });

  /* ——— barras dos resultados: crescem uma vez ——— */
  var vis = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('vis'); vis.unobserve(e.target); } });
  }, { threshold: .3 });
  $$('[data-vis]').forEach(function(el){ vis.observe(el); });
})();
