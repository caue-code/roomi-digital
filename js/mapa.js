/* Roomi · peça "mapa": logo do cliente <-> pinos do mapa.
   Mouse em cima do logo acende os pinos e mostra o cartão; mouse no pino mostra a dica;
   clique (ou toque) no logo fixa; toque no pino mostra a dica. */
(function(){
  var raiz = document.querySelector('.mapa');
  if(!raiz) return;
  var lado = raiz.querySelector('.mapa-lado');
  var cartao = raiz.querySelector('.mapa-cartao');
  var dica = raiz.querySelector('.mapa-dica');
  var logos = [].slice.call(raiz.querySelectorAll('.mapa-logo'));
  var pinos = [].slice.call(raiz.querySelectorAll('.mapa-pino'));
  var fixo = null;      // logo fixado pelo clique
  var pinoAtivo = null; // pino tocado (toque) ou com o mouse em cima

  raiz.classList.add('mapa--js');

  function limpa(){
    raiz.classList.remove('foco');
    logos.forEach(function(l){ l.classList.remove('on'); });
    pinos.forEach(function(p){ p.classList.remove('on'); });
    cartao.classList.remove('on');
    dica.classList.remove('on');
  }

  function foca(ids){
    limpa();
    if(!ids.length) return;
    raiz.classList.add('foco');
    logos.forEach(function(l){ if(ids.indexOf(l.getAttribute('data-cliente')) >= 0) l.classList.add('on'); });
    pinos.forEach(function(p){
      var donos = (p.getAttribute('data-clientes') || '').split(' ');
      if(ids.some(function(id){ return donos.indexOf(id) >= 0; })) p.classList.add('on');
    });
  }

  function mostraLogo(logo){
    foca([logo.getAttribute('data-cliente')]);
    cartao.querySelector('.mapa-cartao-nome').textContent = logo.getAttribute('data-nome') || '';
    cartao.querySelector('.mapa-cartao-meta').textContent = logo.getAttribute('data-hoteis') || '';
    cartao.querySelector('.mapa-cartao-frase').textContent = logo.getAttribute('data-frase') || '';
    cartao.classList.add('on');
  }

  function mostraPino(pino){
    foca((pino.getAttribute('data-clientes') || '').split(' '));
    var partes = (pino.getAttribute('data-tip') || '').split('|');
    dica.textContent = '';
    var b = document.createElement('b'); b.textContent = partes[0]; dica.appendChild(b);
    partes.slice(1).forEach(function(linha){
      var k = linha.indexOf(': ');
      var g = document.createElement('span'); g.className = 'mapa-dica-g';
      g.textContent = k >= 0 ? linha.slice(0, k) : linha;
      dica.appendChild(g);
      if(k >= 0) dica.appendChild(document.createTextNode(linha.slice(k + 2)));
    });
    dica.classList.add('on');
    posiciona(pino);
  }

  /* põe a dica ao lado do pino, sem sair do contêiner do mapa */
  function posiciona(pino){
    var L = lado.getBoundingClientRect(), r = pino.getBoundingClientRect();
    var w = dica.offsetWidth, h = dica.offsetHeight;
    var cx = r.left + r.width / 2 - L.left, cy = r.top + r.height / 2 - L.top;
    var x = cx - w - 14;                       // preferência: à esquerda do pino
    if(x < 0) x = cx + 14;                     // sem espaço: à direita
    if(x + w > L.width) x = L.width - w;       // ainda sem espaço: encosta na borda
    x = Math.max(0, x);
    var y = cy - h / 2;
    y = Math.max(0, Math.min(L.height - h, y));
    dica.style.left = Math.round(x) + 'px';
    dica.style.top = Math.round(y) + 'px';
  }

  function volta(){
    pinoAtivo = null;
    if(fixo) mostraLogo(fixo); else limpa();
  }

  function marcaFixo(){
    logos.forEach(function(l){ l.classList.toggle('fixo', l === fixo); l.setAttribute('aria-pressed', l === fixo ? 'true' : 'false'); });
  }

  /* mouse (o toque não passa por aqui: vai pelo clique) */
  raiz.addEventListener('pointerover', function(e){
    if(e.pointerType !== 'mouse') return;
    var logo = e.target.closest('.mapa-logo'), pino = e.target.closest('.mapa-pino');
    if(logo){ pinoAtivo = null; mostraLogo(logo); }
    else if(pino && pino !== pinoAtivo){ pinoAtivo = pino; mostraPino(pino); }
  });
  raiz.addEventListener('pointerout', function(e){
    if(e.pointerType !== 'mouse') return;
    var para = e.relatedTarget;
    if(para && raiz.contains(para) && (para.closest('.mapa-logo') || para.closest('.mapa-pino'))) return;
    volta();
  });

  /* clique / toque */
  raiz.addEventListener('click', function(e){
    var logo = e.target.closest('.mapa-logo'), pino = e.target.closest('.mapa-pino');
    if(logo){
      fixo = (fixo === logo) ? null : logo;
      marcaFixo();
      pinoAtivo = null;
      if(fixo) mostraLogo(fixo);
      else if(matchMedia('(hover:hover)').matches) mostraLogo(logo); // mouse ainda em cima
      else limpa();
      return;
    }
    if(pino){
      if(pinoAtivo === pino && dica.classList.contains('on') && !matchMedia('(hover:hover)').matches){ volta(); return; }
      pinoAtivo = pino; mostraPino(pino);
      return;
    }
    if(!matchMedia('(hover:hover)').matches) volta();
  });

  /* teclado: foco no logo = mouse em cima; Esc solta */
  raiz.addEventListener('focusin', function(e){
    var logo = e.target.closest('.mapa-logo');
    if(logo && logo.matches(':focus-visible')) mostraLogo(logo);
  });
  raiz.addEventListener('focusout', function(e){
    if(!raiz.contains(e.relatedTarget)) volta();
  });
  raiz.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ fixo = null; marcaFixo(); volta(); }
  });

  /* toque fora da peça solta a dica do pino */
  document.addEventListener('click', function(e){
    if(!raiz.contains(e.target) && pinoAtivo) volta();
  });

  /* entra quando aparece na tela; para quando sai */
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduz || !('IntersectionObserver' in window)){
    raiz.classList.add('mapa--viva', 'mapa--ativa');
  } else {
    /* observa o mapa (não a peça inteira: no celular ela é mais alta que a tela).
       Na 1ª entrada os pinos caem (mapa--viva, fica); fora da tela o pulso para (mapa--ativa). */
    new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if(en.isIntersecting) raiz.classList.add('mapa--viva', 'mapa--ativa');
        else { raiz.classList.remove('mapa--ativa'); if(pinoAtivo) volta(); }
      });
    }, { threshold: .3 }).observe(lado);
  }

  marcaFixo();
  window.addEventListener('resize', function(){ if(pinoAtivo && dica.classList.contains('on')) posiciona(pinoAtivo); });
})();
