/* Kwanzi Card Shop site. Reads data.json (summary) and binders/<name>.json (one collection). */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cls = t => String(t).replace(/\s+/g, '-');
  const when = t => new Date(t * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const GAME = { pokemon: 'Pokémon', mtg: 'Magic', lorcana: 'Lorcana' };
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);

  function stamp(d) { const s = $('#stamp'); if (s) s.textContent = 'last update ' + when(d.generated) + (d.live ? ' · shop is open' : ' · shop is closed'); }

  function cardTile(c) {
    return `<div class="card ${cls(c.tier)}"><img loading="lazy" src="${esc(c.image_url)}" alt=""><div class="name">${esc(c.name)}</div>` +
           `<div class="meta"><span class="tier ${cls(c.tier)}">${esc(c.tier)}</span><span>${c.count > 1 ? 'x' + c.count : ''} ${GAME[c.game] || c.game}</span></div></div>`;
  }

  function pullRows(ps) {
    if (!ps.length) return '<p class="empty">no packs opened yet.</p>';
    return `<div class="tw"><table><thead><tr><th>When</th><th>Who</th><th>Pulled</th><th>Game</th><th>Tier</th></tr></thead><tbody>` +
      ps.map(p => `<tr><td class="mono">${when(p.at)}</td><td>${p.binder ? `<a href="binder.html?name=${encodeURIComponent(p.name)}">${esc(p.name)}</a>` : esc(p.name)}</td>` +
        `<td><img class="thumb" loading="lazy" src="${esc(p.image_url)}" alt="">${esc(p.card)}${p.kept ? '' : ' <span class="tier common">not kept</span>'}</td><td>${GAME[p.game] || p.game}</td><td><span class="tier ${cls(p.tier)}">${esc(p.tier)}</span></td></tr>`).join('') +
      '</tbody></table></div>';
  }

  if (page === 'home') {
    fetch('data.json?_=' + Date.now()).then(r => r.json()).then(d => {
      stamp(d);
      $('#tiles').innerHTML = [['Packs opened', d.total_pulls], ['Binders', d.binders.length]]
        .map(([k, v]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
      $('#recent').innerHTML = pullRows(d.recent);
      $('#binders').innerHTML = d.binders.length ? `<div class="tw"><table><thead><tr><th>Collector</th><th class="num">Cards</th><th>Rarest</th></tr></thead><tbody>` +
        d.binders.map(b => `<tr><td><a href="binder.html?name=${encodeURIComponent(b.name)}">${esc(b.name)}</a></td><td class="num">${b.cards}</td><td>${b.rarest ? esc(b.rarest.name) + ' <span class="tier ' + cls(b.rarest.tier) + '">' + esc(b.rarest.tier) + '</span>' : ''}</td></tr>`).join('') + '</tbody></table></div>'
        : '<p class="empty">nobody owns a binder yet. the cards they pull just float away. it\'s sad.</p>';
    });
  }

  // "my binder" nav: go straight to a remembered name
  (function () {
    const link = document.getElementById('mybinder'); if (!link) return;
    let saved = ''; try { saved = localStorage.getItem('kcs_name') || ''; } catch (e) {}
    if (saved) link.href = 'binder.html?name=' + encodeURIComponent(saved);
  })();

  if (page === 'binder') {
    const name = params.get('name') || '';
    if (!name) {
      const ask = $('#ask'); ask.hidden = false; $('#lookup').hidden = true;
      let saved = ''; try { saved = localStorage.getItem('kcs_name') || ''; } catch (e) {}
      if (saved) { location.replace('binder.html?name=' + encodeURIComponent(saved)); return; }
      $('#askform').addEventListener('submit', e => { e.preventDefault(); const v = $('#askname').value.trim(); if (v) location.href = 'binder.html?name=' + encodeURIComponent(v) + '&me=1'; });
      return;
    }
    // the name is only remembered when it came from the my-binder box, not from a link someone shared
    if (params.get('me') === '1') { try { localStorage.setItem('kcs_name', name); } catch (e) {} }
    $('#lookupform').addEventListener('submit', e => { e.preventDefault(); const v = $('#lookupname').value.trim(); if (v) location.href = 'binder.html?name=' + encodeURIComponent(v); });
    $('#notme').addEventListener('click', () => { try { localStorage.removeItem('kcs_name'); } catch (e) {} location.href = 'binder.html'; });
    fetch('binders/' + encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')) + '.json?_=' + Date.now()).then(r => { if (!r.ok) throw 0; return r.json(); }).then(b => {
      document.title = b.name + "'s binder · Kwanzi Card Shop";
      $('#title').innerHTML = `${esc(b.name)}<b>'s binder</b>`;
      $('#tiles').innerHTML = [['Cards', b.total], ['Unique', b.cards.length], ['Packs opened', b.pulls], ['Rarest', b.cards[0] ? b.cards[0].tier : '']]
        .map(([k, v]) => `<div class="tile"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join('');
      const games = [...new Set(b.cards.map(c => c.game))];
      let filter = 'all';
      const f = $('#filters');
      f.innerHTML = ['all', ...games].map(g => `<button data-g="${g}" class="${g === 'all' ? 'on' : ''}">${g === 'all' ? 'everything' : (GAME[g] || g)}</button>`).join('');
      f.addEventListener('click', e => { const bt = e.target.closest('button'); if (!bt) return; filter = bt.dataset.g; [...f.children].forEach(x => x.classList.toggle('on', x === bt)); draw(); });
      function draw() { const cs = b.cards.filter(c => filter === 'all' || c.game === filter); $('#grid').innerHTML = cs.length ? cs.map(cardTile).join('') : '<p class="empty">nothing here yet.</p>'; }
      draw();
    }).catch(() => { try { localStorage.removeItem('kcs_name'); } catch (e) {} $('#main').innerHTML = `<p class="empty">no binder for ${esc(name)}. binders are ₭₪100,000 in the kwanzshi shop, and cards pulled without one are not kept. those are the rules. i didn't make them. (i did.)</p>`; });
  }

  if (page === 'odds') {
    fetch('data.json?_=' + Date.now()).then(r => r.json()).then(d => {
      stamp(d);
      $('#odds').innerHTML = `<div class="tw"><table><thead><tr><th>Tier</th><th class="num">Odds</th><th class="num">About one in</th></tr></thead><tbody>` +
        d.tiers.map(t => `<tr><td><span class="tier ${cls(t.name)}">${esc(t.name)}</span></td><td class="num">${t.odds}%</td><td class="num">${Math.round(100 / t.odds).toLocaleString()}</td></tr>`).join('') + '</tbody></table></div>';
    });
  }
})();
