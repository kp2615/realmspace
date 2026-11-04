// RealmSpace interface. Plain JavaScript, no build step.
(function () {
  'use strict';

  // ---------- Storage ----------
  // Inside the desktop app, window.realm saves to a file on disk.
  // Opened directly in a browser (for quick design checks), it falls back to localStorage.
  const store = window.realm || {
    load: async () => {
      try { return JSON.parse(localStorage.getItem('realmspace') || 'null'); } catch { return null; }
    },
    save: async (data) => { localStorage.setItem('realmspace', JSON.stringify(data)); return true; },
    revealFile: null,
  };

  // ---------- Vocabulary ----------
  const TYPES = {
    quest: { one: 'Quest', many: 'Quests' },
    session: { one: 'Session', many: 'Sessions' },
    character: { one: 'Character', many: 'Characters' },
    location: { one: 'Location', many: 'Locations' },
  };
  const VIEWS = ['quest', 'session', 'character', 'location'];
  const STATUSES = [
    { key: 'rumor', label: 'Rumors', hint: 'Hooks the party has heard about' },
    { key: 'active', label: 'In progress', hint: 'What the party is chasing now' },
    { key: 'done', label: 'Completed', hint: '' },
    { key: 'failed', label: 'Failed', hint: '' },
  ];
  const KINDS = [
    { key: 'party', label: 'The party' },
    { key: 'npc', label: 'Everyone else' },
  ];

  // ---------- State ----------
  const state = { data: null, view: 'quest', selected: null, query: '' };
  const $ = (sel, root = document) => root.querySelector(sel);
  const app = document.getElementById('app');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const items = () => state.data.items;
  const byId = (id) => items().find((it) => it.id === id);
  const ofType = (type) => items().filter((it) => it.type === type);
  const linked = (item, type) => item.links.map(byId).filter((it) => it && (!type || it.type === type));

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.save(state.data), 300);
  }
  function touch(item) { item.updated = Date.now(); save(); }

  function formatDate(iso) {
    if (!iso) return 'No date';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // ---------- Creating, linking, deleting ----------
  function createItem(type, extra = {}) {
    const base = { id: uid(), type, title: '', notes: '', links: [], created: Date.now(), updated: Date.now() };
    if (type === 'quest') base.status = 'rumor';
    if (type === 'character') { base.kind = 'npc'; base.role = ''; base.player = ''; }
    if (type === 'location') base.region = '';
    if (type === 'session') {
      const last = Math.max(0, ...ofType('session').map((s) => Number(s.number) || 0));
      base.number = last + 1;
      base.date = new Date().toISOString().slice(0, 10);
    }
    const item = Object.assign(base, extra);
    items().push(item);
    save();
    return item;
  }

  function link(a, b) {
    if (a.id === b.id || a.links.includes(b.id)) return;
    a.links.push(b.id); b.links.push(a.id);
    touch(a); touch(b);
  }
  function unlink(a, b) {
    a.links = a.links.filter((id) => id !== b.id);
    b.links = b.links.filter((id) => id !== a.id);
    touch(a); touch(b);
  }
  function remove(item) {
    items().forEach((it) => { it.links = it.links.filter((id) => id !== item.id); });
    state.data.items = items().filter((it) => it.id !== item.id);
    save();
  }

  function displayTitle(item) {
    if (item.title.trim()) return item.title;
    return item.type === 'session' ? `Session ${item.number}` : `Untitled ${TYPES[item.type].one.toLowerCase()}`;
  }

  // ---------- Welcome ----------
  function renderWelcome() {
    app.innerHTML = `
      <div class="welcome">
        <div class="welcome-card">
          <p class="wordmark">RealmSpace</p>
          <h1>Keep your whole campaign in one place.</h1>
          <p class="welcome-lede">Track quests on a board, log what happened each session, and connect the people and places your players keep asking about.</p>
          <form class="welcome-form">
            <label for="campaign-name">Campaign name</label>
            <input id="campaign-name" placeholder="The Curse of the Hollow King" autocomplete="off">
            <button class="btn btn-primary" type="submit">Start campaign</button>
          </form>
          <button class="btn-link" type="button" data-sample>Explore a sample campaign instead</button>
        </div>
      </div>`;
    const input = $('#campaign-name');
    input.focus();
    $('.welcome-form').addEventListener('submit', (e) => {
      e.preventDefault();
      state.data = { version: 1, campaign: { name: input.value.trim() || 'My campaign' }, items: [] };
      save();
      renderShell();
    });
    $('[data-sample]').addEventListener('click', () => {
      state.data = window.makeSampleCampaign();
      save();
      renderShell();
    });
  }

  // ---------- Shell ----------
  function renderShell() {
    app.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <p class="wordmark">RealmSpace</p>
          <input class="campaign-name" aria-label="Campaign name" value="${esc(state.data.campaign.name)}">
          <div class="search">
            <input type="search" placeholder="Search the campaign" aria-label="Search the campaign" value="${esc(state.query)}">
          </div>
          <nav class="nav" aria-label="Sections"></nav>
          <div class="sidebar-foot">
            ${store.revealFile ? '<button class="btn-quiet" data-reveal type="button">Show campaign file</button>' : ''}
            <button class="btn-quiet" data-new type="button">New campaign…</button>
          </div>
        </aside>
        <main class="main" tabindex="-1"></main>
        <aside class="drawer" aria-label="Details" hidden></aside>
      </div>`;

    const nameInput = $('.campaign-name');
    nameInput.addEventListener('input', () => { state.data.campaign.name = nameInput.value; save(); });
    nameInput.addEventListener('blur', () => {
      if (!nameInput.value.trim()) { nameInput.value = state.data.campaign.name = 'My campaign'; save(); }
    });

    $('.search input').addEventListener('input', (e) => { state.query = e.target.value; renderMain(); });

    $('[data-new]').addEventListener('click', () => {
      if (!confirm('Start a new campaign? The current one will be replaced and can’t be recovered.')) return;
      state.data = null; state.selected = null; state.query = '';
      renderWelcome();
    });
    const reveal = $('[data-reveal]');
    if (reveal) reveal.addEventListener('click', () => store.revealFile());

    renderNav();
    renderMain();
    renderDrawer();
  }

  function renderNav() {
    const nav = $('.nav');
    nav.innerHTML = VIEWS.map((v) => `
      <button type="button" class="nav-item${state.view === v && !state.query ? ' is-current' : ''}" data-view="${v}"
        ${state.view === v && !state.query ? 'aria-current="page"' : ''}>
        <span>${TYPES[v].many}</span><span class="nav-count">${ofType(v).length}</span>
      </button>`).join('');
    nav.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      state.view = b.dataset.view;
      state.query = '';
      $('.search input').value = '';
      renderNav();
      renderMain();
    }));
  }

  // ---------- Main views ----------
  function renderMain() {
    const main = $('.main');
    if (state.query.trim()) main.innerHTML = searchView();
    else main.innerHTML = { quest: questView, session: sessionView, character: characterView, location: locationView }[state.view]();
    wireMain(main);
    renderNav();
  }

  function linkedNames(item) {
    const people = linked(item, 'character').map((c) => displayTitle(c));
    const places = linked(item, 'location').map((l) => displayTitle(l));
    const all = [...people, ...places];
    if (!all.length) return '';
    const shown = all.slice(0, 3).map((n) => `<span class="tag">${esc(n)}</span>`).join('');
    const more = all.length > 3 ? `<span class="tag tag-more">+${all.length - 3}</span>` : '';
    return `<span class="tags">${shown}${more}</span>`;
  }

  function cardAttrs(item, extraClass = '') {
    const selected = state.selected === item.id ? ' is-selected' : '';
    return `class="card ${extraClass}${selected}" data-open="${item.id}" tabindex="0" role="button" aria-label="Open ${esc(displayTitle(item))}"`;
  }

  function questView() {
    const columns = STATUSES.map((s) => {
      const quests = ofType('quest').filter((q) => q.status === s.key)
        .sort((a, b) => b.updated - a.updated);
      const cards = quests.map((q) => `
        <div ${cardAttrs(q, 'quest-card status-' + s.key)} draggable="true" data-drag="${q.id}">
          <span class="card-title">${esc(displayTitle(q))}</span>
          ${linkedNames(q)}
        </div>`).join('');
      return `
        <section class="column status-${s.key}" data-drop="${s.key}" aria-label="${s.label}">
          <header class="column-head">
            <h2>${s.label}</h2><span class="column-count">${quests.length}</span>
          </header>
          <div class="column-cards">${cards || '<p class="column-empty">Drag a quest here</p>'}</div>
          <button type="button" class="btn-add" data-add="quest" data-status="${s.key}">Add quest</button>
        </section>`;
    }).join('');
    return `
      <header class="view-head">
        <h1>Quests</h1>
        <p>Drag a card between columns to change where the party stands.</p>
      </header>
      <div class="board">${columns}</div>`;
  }

  function sessionView() {
    const sessions = ofType('session').sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0));
    const rows = sessions.map((s) => `
      <li>
        <div ${cardAttrs(s, 'session-row')}>
          <span class="session-number">${esc(s.number)}</span>
          <span class="session-body">
            <span class="card-title">${esc(s.title.trim() || 'Untitled session')}</span>
            <span class="session-date">${esc(formatDate(s.date))}</span>
            ${s.notes ? `<span class="session-excerpt">${esc(s.notes)}</span>` : ''}
          </span>
        </div>
      </li>`).join('');
    return `
      <header class="view-head view-head-row">
        <div>
          <h1>Sessions</h1>
          <p>A running log of what happened at the table, newest first.</p>
        </div>
        <button type="button" class="btn btn-primary" data-add="session">Log a session</button>
      </header>
      ${rows ? `<ol class="session-list">${rows}</ol>` : empty('No sessions logged yet.', 'Log your first session to start the campaign’s history.', 'session', 'Log a session')}`;
  }

  function characterView() {
    const groups = KINDS.map((k) => {
      const people = ofType('character').filter((c) => c.kind === k.key)
        .sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
      const cards = people.map((c) => `
        <div ${cardAttrs(c, 'person-card')}>
          <span class="card-title">${esc(displayTitle(c))}</span>
          ${c.role ? `<span class="card-sub">${esc(c.role)}</span>` : ''}
          ${k.key === 'party' && c.player ? `<span class="card-player">Played by ${esc(c.player)}</span>` : ''}
        </div>`).join('');
      return `
        <section class="group">
          <header class="group-head">
            <h2>${k.label}</h2>
            <button type="button" class="btn-add" data-add="character" data-kind="${k.key}">Add ${k.key === 'party' ? 'party member' : 'character'}</button>
          </header>
          ${cards ? `<div class="grid">${cards}</div>` : `<p class="group-empty">${k.key === 'party' ? 'Add the player characters at your table.' : 'Add the innkeepers, villains, and strangers your players meet.'}</p>`}
        </section>`;
    }).join('');
    return `
      <header class="view-head">
        <h1>Characters</h1>
        <p>Everyone in the story, from the party to the barkeep they keep tipping.</p>
      </header>
      ${groups}`;
  }

  function locationView() {
    const places = ofType('location');
    const regions = {};
    places.forEach((p) => { const r = p.region.trim() || 'Unsorted'; (regions[r] = regions[r] || []).push(p); });
    const names = Object.keys(regions).sort((a, b) => (a === 'Unsorted') - (b === 'Unsorted') || a.localeCompare(b));
    const groups = names.map((r) => `
      <section class="group">
        <header class="group-head"><h2>${esc(r)}</h2></header>
        <div class="grid">
          ${regions[r].sort((a, b) => displayTitle(a).localeCompare(displayTitle(b))).map((p) => `
            <div ${cardAttrs(p, 'place-card')}>
              <span class="card-title">${esc(displayTitle(p))}</span>
              ${p.notes ? `<span class="card-excerpt">${esc(p.notes)}</span>` : ''}
            </div>`).join('')}
        </div>
      </section>`).join('');
    return `
      <header class="view-head view-head-row">
        <div>
          <h1>Locations</h1>
          <p>Places the party has been or heard of, grouped by region.</p>
        </div>
        <button type="button" class="btn btn-primary" data-add="location">Add location</button>
      </header>
      ${groups || empty('No locations yet.', 'Add the town where your campaign begins.', 'location', 'Add location')}`;
  }

  function searchView() {
    const q = state.query.trim().toLowerCase();
    const hits = items().filter((it) => [it.title, it.notes, it.role, it.region, it.player]
      .some((f) => (f || '').toLowerCase().includes(q)));
    const groups = VIEWS.map((v) => {
      const list = hits.filter((h) => h.type === v);
      if (!list.length) return '';
      return `
        <section class="group">
          <header class="group-head"><h2>${TYPES[v].many}</h2></header>
          <div class="grid">${list.map((it) => `
            <div ${cardAttrs(it, 'result-card')}>
              <span class="card-title">${esc(displayTitle(it))}</span>
              ${it.notes ? `<span class="card-excerpt">${esc(it.notes)}</span>` : ''}
            </div>`).join('')}</div>
        </section>`;
    }).join('');
    return `
      <header class="view-head">
        <h1>Results for “${esc(state.query.trim())}”</h1>
        <p>${hits.length} ${hits.length === 1 ? 'match' : 'matches'} across the campaign.</p>
      </header>
      ${groups || '<p class="group-empty">Nothing matches. Try a name, a place, or a word from your notes.</p>'}`;
  }

  function empty(title, body, type, action) {
    return `
      <div class="empty">
        <p class="empty-title">${title}</p>
        <p>${body}</p>
        <button type="button" class="btn btn-primary" data-add="${type}">${action}</button>
      </div>`;
  }

  function wireMain(main) {
    main.querySelectorAll('[data-open]').forEach((el) => {
      el.addEventListener('click', () => select(el.dataset.open));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(el.dataset.open); }
      });
    });
    main.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      const extra = {};
      if (b.dataset.status) extra.status = b.dataset.status;
      if (b.dataset.kind) extra.kind = b.dataset.kind;
      const item = createItem(b.dataset.add, extra);
      select(item.id, { focusTitle: true });
    }));

    // Drag and drop on the quest board
    main.querySelectorAll('[data-drag]').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.drag);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('is-dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
    });
    main.querySelectorAll('[data-drop]').forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('is-over'); });
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('is-over');
        const quest = byId(e.dataTransfer.getData('text/plain'));
        if (!quest || quest.status === col.dataset.drop) return;
        quest.status = col.dataset.drop;
        touch(quest);
        renderMain();
        if (state.selected === quest.id) renderDrawer();
      });
    });
  }

  // ---------- Detail drawer ----------
  function select(id, opts = {}) {
    state.selected = id;
    renderMain();
    renderDrawer();
    const title = $('.drawer .drawer-title');
    if (title && opts.focusTitle) title.focus();
  }

  function closeDrawer() {
    const id = state.selected;
    state.selected = null;
    renderDrawer();
    renderMain();
    const card = id && $(`.main [data-open="${id}"]`);
    if (card) card.focus();
  }

  function field(label, html) {
    return `<label class="field"><span class="field-label">${label}</span>${html}</label>`;
  }

  function typeFields(item) {
    switch (item.type) {
      case 'quest':
        return field('Status', `<select data-field="status">${STATUSES.map((s) =>
          `<option value="${s.key}"${item.status === s.key ? ' selected' : ''}>${s.label}</option>`).join('')}</select>`);
      case 'session':
        return `<div class="field-row">
          ${field('Session number', `<input type="number" min="0" data-field="number" value="${esc(item.number)}">`)}
          ${field('Played on', `<input type="date" data-field="date" value="${esc(item.date)}">`)}
        </div>`;
      case 'character':
        return `<div class="field-row">
          ${field('Group', `<select data-field="kind">${KINDS.map((k) =>
            `<option value="${k.key}"${item.kind === k.key ? ' selected' : ''}>${k.label}</option>`).join('')}</select>`)}
          ${field('Role', `<input data-field="role" placeholder="Innkeeper, villain, rival…" value="${esc(item.role)}">`)}
        </div>
        ${item.kind === 'party' ? field('Played by', `<input data-field="player" placeholder="Player’s name" value="${esc(item.player)}">`) : ''}`;
      case 'location': {
        const regions = [...new Set(ofType('location').map((l) => l.region.trim()).filter(Boolean))];
        return field('Region', `<input data-field="region" list="region-list" placeholder="Where is it?" value="${esc(item.region)}">
          <datalist id="region-list">${regions.map((r) => `<option value="${esc(r)}">`).join('')}</datalist>`);
      }
      default: return '';
    }
  }

  function connections(item) {
    const groups = VIEWS.map((v) => {
      const list = linked(item, v);
      if (!list.length) return '';
      return `<div class="conn-group">
        <p class="conn-label">${TYPES[v].many}</p>
        <ul class="conn-list">${list.map((l) => `
          <li class="conn">
            <button type="button" class="conn-open" data-goto="${l.id}">${esc(displayTitle(l))}</button>
            <button type="button" class="conn-remove" data-unlink="${l.id}" aria-label="Remove connection to ${esc(displayTitle(l))}">×</button>
          </li>`).join('')}</ul>
      </div>`;
    }).join('');

    const candidates = VIEWS.map((v) => {
      const opts = ofType(v).filter((o) => o.id !== item.id && !item.links.includes(o.id))
        .sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
      if (!opts.length) return '';
      return `<optgroup label="${TYPES[v].many}">${opts.map((o) => `<option value="${o.id}">${esc(displayTitle(o))}</option>`).join('')}</optgroup>`;
    }).join('');

    return `
      <section class="connections">
        <h3>Connections</h3>
        ${groups || '<p class="conn-empty">Connect this to the people, places, quests, and sessions it involves.</p>'}
        ${candidates ? `<select class="conn-add" aria-label="Add a connection"><option value="">Connect to…</option>${candidates}</select>` : ''}
      </section>`;
  }

  function renderDrawer() {
    const drawer = $('.drawer');
    if (!drawer) return;
    const item = state.selected && byId(state.selected);
    if (!item) { drawer.hidden = true; drawer.innerHTML = ''; return; }
    drawer.hidden = false;

    const notesLabel = item.type === 'session' ? 'What happened' : 'Notes';
    const titlePlaceholder = {
      quest: 'Name the quest', session: 'Give the session a title', character: 'Name', location: 'Name the place',
    }[item.type];

    drawer.innerHTML = `
      <header class="drawer-head">
        <p class="drawer-type">${TYPES[item.type].one}</p>
        <button type="button" class="btn-close" data-close aria-label="Close details">×</button>
      </header>
      <textarea class="drawer-title" rows="1" data-field="title" placeholder="${titlePlaceholder}" aria-label="Title">${esc(item.title)}</textarea>
      ${typeFields(item)}
      ${field(notesLabel, `<textarea class="notes" data-field="notes" rows="8" placeholder="Write anything you want to remember.">${esc(item.notes)}</textarea>`)}
      ${connections(item)}
      <footer class="drawer-foot">
        <button type="button" class="btn-danger" data-delete>Delete ${TYPES[item.type].one.toLowerCase()}</button>
      </footer>`;

    drawer.querySelectorAll('textarea').forEach(autosize);
    drawer.querySelectorAll('[data-field]').forEach((el) => {
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        const key = el.dataset.field;
        item[key] = key === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
        if (el.tagName === 'TEXTAREA') autosize(el);
        touch(item);
        renderMain();
        if (key === 'kind') renderDrawer(); // show or hide "Played by"
      });
    });
    $('.drawer-title', drawer).addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });

    $('[data-close]', drawer).addEventListener('click', closeDrawer);
    drawer.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => {
      const target = byId(b.dataset.goto);
      if (target && !state.query) state.view = target.type;
      select(b.dataset.goto);
    }));
    drawer.querySelectorAll('[data-unlink]').forEach((b) => b.addEventListener('click', () => {
      unlink(item, byId(b.dataset.unlink));
      renderDrawer(); renderMain();
    }));
    const add = $('.conn-add', drawer);
    if (add) add.addEventListener('change', () => {
      const other = byId(add.value);
      if (other) { link(item, other); renderDrawer(); renderMain(); $('.drawer .conn-add')?.focus(); }
    });
    $('[data-delete]', drawer).addEventListener('click', () => {
      if (!confirm(`Delete “${displayTitle(item)}”? This can’t be undone.`)) return;
      remove(item);
      state.selected = null;
      renderDrawer(); renderMain();
    });
  }

  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selected && !e.defaultPrevented) closeDrawer();
  });

  // ---------- Start ----------
  store.load().then((data) => {
    if (data && Array.isArray(data.items)) { state.data = data; renderShell(); }
    else renderWelcome();
  });
})();
