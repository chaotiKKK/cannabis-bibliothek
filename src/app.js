/* app.js – Cannabis Bibliothek */
(function () {
  'use strict';

  // ---------- Konstanten ----------
  const EFFECTS = [
    { key: 'euphoric', label: 'Euphorie', short: 'Euphorie' },
    { key: 'energetic', label: 'Energetisierend', short: 'Energie' },
    { key: 'relaxed', label: 'Entspannend', short: 'Entspannung' },
    { key: 'creative', label: 'Kreativitätsfördernd', short: 'Kreativität' },
    { key: 'happy', label: 'Glücklich machend', short: 'Glück' },
    { key: 'sleepy', label: 'Schläfrig machend', short: 'Schlaf' },
    { key: 'hungry', label: 'Appetitanregend', short: 'Hunger' },
    { key: 'focused', label: 'Fokussierend', short: 'Fokus' },
    { key: 'talkative', label: 'Gesprächig machend', short: 'Gesprächig' },
    { key: 'giggly', label: 'Kichernd / verspielt', short: 'Kichern' },
    { key: 'uplifted', label: 'Erhebend', short: 'Erhebung' },
    { key: 'couchlock', label: 'Tiefenentspannend', short: 'Tiefenentsp.' },
    { key: 'anxiolytic', label: 'Angstlösend', short: 'Angstlösung' },
    { key: 'painrelief', label: 'Schmerzlindernd', short: 'Schmerz' }
  ];
  const TYPE_COLORS = { Sativa: '#f6b73c', Indica: '#a78bfa', Hybrid: '#34d399' };
  const TYPES = ['Sativa', 'Indica', 'Hybrid'];
  const DIFFICULTIES = ['Einfach', 'Mittel', 'Anspruchsvoll'];
  const COMPARE_COLORS = ['#34d399', '#f6b73c', '#a78bfa'];
  const MAX_COMPARE = 3;
  const FAV_KEY = 'cannabis-bibliothek:favorites';
  const THC_LIMIT = 35;

  const ALL_TERPENES = Array.from(
    new Set(STRAINS.flatMap((s) => Object.keys(s.terpenes || {})))
  ).sort((a, b) => a.localeCompare(b, 'de'));

  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.7l2.9 5.8 6.4.9-4.7 4.5 1.2 6.4L12 17.3l-5.8 3 1.2-6.4-4.7-4.5 6.4-.9z"/></svg>';
  const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg>';
  const EMPTY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path><path d="M8.5 11h5"></path></svg>';

  // ---------- Zustand ----------
  const state = {
    query: '',
    types: new Set(),
    effects: new Set(),
    thcMin: 0,
    thcMax: THC_LIMIT,
    difficulty: '',
    terpene: '',
    sort: 'name',
    favoritesOnly: false,
    favorites: loadFavorites(),
    compare: [],
    compareQuery: '',
    finder: new Set(),
    route: 'bibliothek'
  };

  // ---------- Hilfsfunktionen ----------
  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function fmtNum(value) {
    if (value == null || Number.isNaN(Number(value))) return '–';
    return String(Math.round(Number(value) * 10) / 10).replace('.', ',');
  }

  function fmtPct(value) {
    return fmtNum(value) + ' %';
  }

  function norm(value) {
    return String(value)
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(state.favorites)));
    } catch (error) {
      /* Speicher nicht verfügbar – Favoriten bleiben nur für diese Sitzung */
    }
  }

  const SEARCH_INDEX = new Map(STRAINS.map((s) => [s.id, norm([
    s.name, s.type, s.ratio, s.difficulty, s.height,
    ...(s.flavors || []), ...(s.lineage || []), ...(s.medical || []),
    ...EFFECTS.filter((e) => (s.effects[e.key] || 0) > 0).map((e) => e.label)
  ].join(' '))]));

  function searchText(strain) {
    return SEARCH_INDEX.get(strain.id) || '';
  }

  function topEffects(strain, count) {
    return EFFECTS
      .map((e) => ({ ...e, value: strain.effects[e.key] || 0 }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'de'))
      .slice(0, count || 3);
  }

  function terpeneList(strain) {
    return Object.entries(strain.terpenes || {})
      .map(([name, value]) => ({ name, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value);
  }

  function toggleSet(set, value) {
    if (set.has(value)) set.delete(value);
    else set.add(value);
  }

  function activeFilterCount() {
    let count = 0;
    if (state.query.trim()) count++;
    count += state.types.size;
    count += state.effects.size;
    if (state.thcMin > 0 || state.thcMax < THC_LIMIT) count++;
    if (state.difficulty) count++;
    if (state.terpene) count++;
    if (state.favoritesOnly) count++;
    return count;
  }

  function resetFilters() {
    state.query = '';
    state.types.clear();
    state.effects.clear();
    state.thcMin = 0;
    state.thcMax = THC_LIMIT;
    state.difficulty = '';
    state.terpene = '';
    state.favoritesOnly = false;
  }

  function toast(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('is-visible'), 2300);
  }

  // ---------- Filterung ----------
  function filteredStrains() {
    const query = norm(state.query.trim());
    const list = STRAINS.filter((s) => {
      if (query && !searchText(s).includes(query)) return false;
      if (state.types.size && !state.types.has(s.type)) return false;
      if (state.effects.size) {
        for (const key of state.effects) {
          if ((s.effects[key] || 0) < 3) return false;
        }
      }
      if (s.thc < state.thcMin || s.thc > state.thcMax) return false;
      if (state.difficulty && s.difficulty !== state.difficulty) return false;
      if (state.terpene && !(Number(s.terpenes[state.terpene]) > 0)) return false;
      if (state.favoritesOnly && !state.favorites.has(s.id)) return false;
      return true;
    });

    switch (state.sort) {
      case 'thc-desc': list.sort((a, b) => b.thc - a.thc); break;
      case 'thc-asc': list.sort((a, b) => a.thc - b.thc); break;
      case 'cbd-desc': list.sort((a, b) => b.cbd - a.cbd); break;
      case 'rating-desc': list.sort((a, b) => b.rating - a.rating); break;
      default: list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }
    return list;
  }

  // ---------- Bausteine ----------
  function strainCard(s) {
    const color = TYPE_COLORS[s.type] || '#34d399';
    const inCompare = state.compare.includes(s.id);
    return (
      '<article class="strain-card" data-action="open" data-id="' + s.id + '" style="--c:' + color + '">' +
        '<div class="card-top">' +
          '<span class="type-badge">' + esc(s.type) + '</span>' +
          '<button class="icon-btn ' + (state.favorites.has(s.id) ? 'is-fav' : '') + '" ' +
            'data-action="fav" data-id="' + s.id + '" aria-label="Als Favorit merken" title="Favorit">' +
            STAR + '</button>' +
        '</div>' +
        '<h3 class="card-name">' + esc(s.name) + '</h3>' +
        '<div class="card-ratio">' + esc(s.ratio) + '</div>' +
        '<div class="card-stats">' +
          '<div><b>' + fmtPct(s.thc) + '</b><span>THC</span></div>' +
          '<div><b>' + fmtPct(s.cbd) + '</b><span>CBD</span></div>' +
          '<div><b>' + fmtNum(s.rating) + '</b><span>Rating</span></div>' +
        '</div>' +
        '<div class="effect-mini">' +
          topEffects(s, 3).map((e) => '<span>' + esc(e.short) + '</span>').join('') +
        '</div>' +
        '<div class="card-foot">' +
          '<span class="rating">★ ' + fmtNum(s.rating) + ' <span>/ 5</span></span>' +
          '<button class="btn btn-ghost btn-sm" data-action="cmp-toggle" data-id="' + s.id + '">' +
            (inCompare ? 'Im Vergleich' : 'Vergleichen') +
          '</button>' +
        '</div>' +
      '</article>'
    );
  }

  function emptyState() {
    return (
      '<div class="empty">' + EMPTY_ICON +
        '<strong>Keine Sorten gefunden</strong>' +
        '<span>Passe Suche oder Filter an – oder setze alles zurück.</span>' +
        '<button class="btn btn-ghost btn-sm" data-action="clear-filters" style="margin-top:8px">Filter zurücksetzen</button>' +
      '</div>'
    );
  }

  function resultCards() {
    const list = filteredStrains();
    return list.length ? list.map(strainCard).join('') : emptyState();
  }

  function typeChips() {
    return TYPES.map((type) =>
      '<button class="chip ' + (state.types.has(type) ? 'is-active' : '') + '" ' +
        'data-action="filter-type" data-type="' + type + '">' +
        '<span class="chip-dot" style="background:' + TYPE_COLORS[type] + '"></span>' + type +
      '</button>'
    ).join('');
  }

  function effectChips() {
    return EFFECTS.map((e) =>
      '<button class="chip ' + (state.effects.has(e.key) ? 'is-active' : '') + '" ' +
        'data-action="filter-effect" data-effect="' + e.key + '">' + esc(e.short) + '</button>'
    ).join('');
  }

  function difficultyChips() {
    return DIFFICULTIES.map((d) =>
      '<button class="chip ' + (state.difficulty === d ? 'is-active' : '') + '" ' +
        'data-action="filter-diff" data-diff="' + d + '">' + d + '</button>'
    ).join('');
  }

  function terpeneOptions() {
    return '<option value="">Alle Terpene</option>' + ALL_TERPENES.map((t) =>
      '<option value="' + esc(t) + '"' + (state.terpene === t ? ' selected' : '') + '>' + esc(t) + '</option>'
    ).join('');
  }

  function sortOptions() {
    const options = [
      ['name', 'Name (A–Z)'],
      ['thc-desc', 'THC: hoch zuerst'],
      ['thc-asc', 'THC: niedrig zuerst'],
      ['cbd-desc', 'CBD: hoch zuerst'],
      ['rating-desc', 'Beste Bewertung']
    ];
    return options.map(([value, label]) =>
      '<option value="' + value + '"' + (state.sort === value ? ' selected' : '') + '>' + label + '</option>'
    ).join('');
  }

  function effectRow(effect) {
    const dots = [1, 2, 3, 4, 5].map((i) =>
      '<span class="dot ' + (i <= effect.value ? 'on' : '') + '"></span>'
    ).join('');
    return (
      '<div class="effect-row">' +
        '<span class="effect-name">' + esc(effect.label) + '</span>' +
        '<span class="dots">' + dots + '</span>' +
        '<span class="effect-value">' + effect.value + '/5</span>' +
      '</div>'
    );
  }

  function meter(label, value, max, suffix, cbd) {
    const width = Math.max(2, Math.min(100, (value / max) * 100));
    return (
      '<div class="meter">' +
        '<div class="meter-top"><span>' + esc(label) + '</span><b>' + fmtNum(value) + (suffix || '') + '</b></div>' +
        '<div class="meter-track"><div class="meter-fill ' + (cbd ? 'is-cbd' : '') + '" style="width:' + width.toFixed(1) + '%"></div></div>' +
      '</div>'
    );
  }

  // ---------- Bibliothek ----------
  function renderLibrary() {
    const count = filteredStrains().length;
    const filtersActive = activeFilterCount();
    return (
      '<div class="page">' +
        '<div class="page-head">' +
          '<div class="eyebrow">Strain-Bibliothek</div>' +
          '<h1 class="page-title">Alle Sorten. Alle Wirkungen.</h1>' +
          '<p class="page-sub">' + STRAINS.length + ' kuratierte Sorten mit Wirkungsprofil, Terpenen, ' +
          'Cannabinoiden und Anbaudaten – komplett offline.</p>' +
        '</div>' +

        '<div class="library-toolbar">' +
          '<div class="search-field">' + SEARCH_ICON +
            '<input id="search" type="search" placeholder="Suche nach Sorte, Aroma, Genetik oder Wirkung …" ' +
            'value="' + esc(state.query) + '" autocomplete="off" spellcheck="false">' +
          '</div>' +
          '<button class="chip ' + (state.favoritesOnly ? 'is-active' : '') + '" data-action="toggle-fav-only">' +
            '★ Favoriten (' + state.favorites.size + ')' +
          '</button>' +
          (filtersActive ? '<button class="chip" data-action="clear-filters">Filter zurücksetzen (' + filtersActive + ')</button>' : '') +
        '</div>' +

        '<div class="library-layout">' +
          '<aside class="filters">' +
            '<div class="filter-group">' +
              '<div class="filter-title">Typ</div>' +
              '<div class="chip-wrap">' + typeChips() + '</div>' +
            '</div>' +
            '<div class="filter-group">' +
              '<div class="filter-title">Wirkung <span>mind. 3/5</span></div>' +
              '<div class="chip-wrap">' + effectChips() + '</div>' +
            '</div>' +
            '<div class="filter-group">' +
              '<div class="filter-title">THC-Bereich</div>' +
              '<div class="range-row">' +
                '<span>Minimum</span><b id="thc-min-label">' + state.thcMin + ' %</b>' +
                '<input id="thc-min" type="range" min="0" max="' + THC_LIMIT + '" step="1" value="' + state.thcMin + '">' +
              '</div>' +
              '<div class="range-row">' +
                '<span>Maximum</span><b id="thc-max-label">' + state.thcMax + ' %</b>' +
                '<input id="thc-max" type="range" min="0" max="' + THC_LIMIT + '" step="1" value="' + state.thcMax + '">' +
              '</div>' +
            '</div>' +
            '<div class="filter-group">' +
              '<div class="filter-title">Schwierigkeit</div>' +
              '<div class="chip-wrap">' + difficultyChips() + '</div>' +
            '</div>' +
            '<div class="filter-group">' +
              '<div class="filter-title">Terpen</div>' +
              '<select class="select" id="terpene">' + terpeneOptions() + '</select>' +
            '</div>' +
          '</aside>' +

          '<section>' +
            '<div class="results-bar">' +
              '<span class="result-count" id="result-count"><b>' + count + '</b> von ' + STRAINS.length + ' Sorten</span>' +
              '<div class="results-actions">' +
                '<select class="select" id="sort" aria-label="Sortierung">' + sortOptions() + '</select>' +
              '</div>' +
            '</div>' +
            '<div class="strain-grid" id="strain-grid">' + resultCards() + '</div>' +
          '</section>' +
        '</div>' +
      '</div>'
    );
  }

  function updateLibraryResults() {
    const grid = document.getElementById('strain-grid');
    if (!grid) return;
    const list = filteredStrains();
    grid.innerHTML = list.length ? list.map(strainCard).join('') : emptyState();
    const count = document.getElementById('result-count');
    if (count) count.innerHTML = '<b>' + list.length + '</b> von ' + STRAINS.length + ' Sorten';
  }

  // ---------- Detail ----------
  function renderDetail(id) {
    const s = STRAINS.find((item) => item.id === id);
    if (!s) {
      return (
        '<div class="page"><div class="empty">' + EMPTY_ICON +
          '<strong>Sorte nicht gefunden</strong>' +
          '<button class="btn btn-primary btn-sm" data-action="nav-library" style="margin-top:8px">Zur Bibliothek</button>' +
        '</div></div>'
      );
    }

    const color = TYPE_COLORS[s.type] || '#34d399';
    const allEffects = EFFECTS
      .map((e) => ({ ...e, value: s.effects[e.key] || 0 }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'de'));
    const terpenes = terpeneList(s);
    const isFav = state.favorites.has(s.id);
    const inCompare = state.compare.includes(s.id);

    const hero =
      '<button class="back-link" data-action="back">← Zurück zur Bibliothek</button>' +
      '<div class="detail-head">' +
        '<div>' +
          '<div class="eyebrow">' + esc(s.type) + ' · ' + esc(s.ratio) + '</div>' +
          '<h1 class="detail-title">' + esc(s.name) + '</h1>' +
          '<div class="detail-meta">' +
            '<span class="type-badge" style="--c:' + color + '">' + esc(s.type) + '</span>' +
            '<span class="rating">★ ' + fmtNum(s.rating) + ' <span>/ 5</span></span>' +
            '<span class="muted">THC ' + fmtPct(s.thc) + ' · CBD ' + fmtPct(s.cbd) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="detail-actions">' +
          '<button class="btn ' + (isFav ? 'btn-primary' : 'btn-ghost') + '" data-action="fav" data-id="' + s.id + '">' +
            '★ ' + (isFav ? 'Favorit' : 'Merken') +
          '</button>' +
          '<button class="compare-toggle ' + (inCompare ? 'is-on' : '') + '" data-action="cmp-toggle" data-id="' + s.id + '">' +
            (inCompare ? 'Im Vergleich' : '＋ Vergleich') +
          '</button>' +
        '</div>' +
      '</div>';

    const main =
      '<div class="detail-col">' +
        '<div class="panel">' +
          '<div class="panel-title">Charakter</div>' +
          '<p class="detail-desc" style="margin-top:8px">' + esc(s.description) + '</p>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-head">' +
            '<div class="panel-title">Wirkungsprofil</div>' +
            '<span class="panel-note">0 – 5 Punkte</span>' +
          '</div>' +
          '<div class="chart-box">' +
            Charts.radar({
              labels: EFFECTS.map((e) => e.short),
              series: [{ values: EFFECTS.map((e) => s.effects[e.key] || 0), color: '#34d399' }],
              size: 400
            }) +
          '</div>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-title">Wirkungen im Detail</div>' +
          '<div class="effect-list" style="margin-top:10px">' +
            (allEffects.length ? allEffects.map(effectRow).join('') : '<p class="panel-text">Keine Wirkungsdaten hinterlegt.</p>') +
          '</div>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-title">Aroma &amp; Geschmack</div>' +
          '<div class="tag-row" style="margin-top:10px">' +
            s.flavors.map((f) => '<span class="tag">' + esc(f) + '</span>').join('') +
          '</div>' +
          '<div class="divider"></div>' +
          '<div class="panel-title">Medizinische Anwendungsgebiete</div>' +
          '<div class="tag-row" style="margin-top:10px">' +
            s.medical.map((m) => '<span class="tag is-med">' + esc(m) + '</span>').join('') +
          '</div>' +
          '<p class="hint-line">Erfahrungswerte, keine medizinische Beratung.</p>' +
        '</div>' +
      '</div>';

    const side =
      '<div class="detail-col sticky">' +
        '<div class="panel">' +
          '<div class="panel-title">Cannabinoide</div>' +
          '<div style="margin-top:12px">' +
            meter('THC', s.thc, 30, ' %', false) +
            meter('CBD', s.cbd, 1, ' %', true) +
          '</div>' +
          '<p class="hint-line">THC-Skala 0–30 %, CBD-Skala 0–1 %.</p>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-title">Terpenprofil</div>' +
          '<div style="margin-top:8px">' +
            Charts.bars({
              items: terpenes.map((t) => ({ label: t.name, value: t.value, suffix: ' %', color: '#a78bfa' })),
              width: 296,
              labelWidth: 104,
              rowHeight: 27,
              max: 100
            }) +
          '</div>' +
          '<p class="hint-line">Anteil am Terpenprofil (Summe 100 %).</p>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-title">Steckbrief</div>' +
          '<table class="fact-table" style="margin-top:6px">' +
            '<tr><th>Typ</th><td>' + esc(s.ratio) + '</td></tr>' +
            '<tr><th>Blütezeit</th><td>' + esc(s.flowering) + '</td></tr>' +
            '<tr><th>Ertrag indoor</th><td><b>' + esc(s.yieldIndoor) + '</b></td></tr>' +
            '<tr><th>Ertrag outdoor</th><td><b>' + esc(s.yieldOutdoor) + '</b></td></tr>' +
            '<tr><th>Wuchshöhe</th><td>' + esc(s.height) + '</td></tr>' +
            '<tr><th>Schwierigkeit</th><td>' + esc(s.difficulty) + '</td></tr>' +
            '<tr><th>Bewertung</th><td><b>' + fmtNum(s.rating) + ' / 5</b></td></tr>' +
          '</table>' +
        '</div>' +

        '<div class="panel">' +
          '<div class="panel-title">Abstammung</div>' +
          '<div class="lineage" style="margin-top:10px">' +
            s.lineage.map((parent, i) =>
              (i ? '<span class="lineage-x">×</span>' : '') +
              '<span class="lineage-item">' + esc(parent) + '</span>'
            ).join('') +
          '</div>' +
        '</div>' +
      '</div>';

    return (
      '<div class="page">' + hero +
        '<div class="detail-grid">' + main + side + '</div>' +
      '</div>'
    );
  }

  // ---------- Vergleich ----------
  function pickerHtml() {
    const query = norm(state.compareQuery.trim());
    if (!query) return '';
    const matches = STRAINS
      .filter((s) => !state.compare.includes(s.id) && searchText(s).includes(query))
      .slice(0, 8);
    if (!matches.length) return '<div class="picker-empty">Keine weiteren Treffer</div>';
    return matches.map((s) =>
      '<button class="picker-item" data-action="compare-add" data-id="' + s.id + '">' +
        '<span>' + esc(s.name) + '</span>' +
        '<small>' + esc(s.type) + ' · THC ' + fmtPct(s.thc) + '</small>' +
      '</button>'
    ).join('');
  }

  function addCompare(id) {
    if (state.compare.includes(id)) return;
    if (state.compare.length >= MAX_COMPARE) {
      toast('Maximal ' + MAX_COMPARE + ' Sorten im Vergleich');
      return;
    }
    state.compare.push(id);
    state.compareQuery = '';
    render();
  }

  function removeCompare(id) {
    state.compare = state.compare.filter((entry) => entry !== id);
    render();
  }

  function toggleCompare(id) {
    if (state.compare.includes(id)) removeCompare(id);
    else addCompare(id);
  }

  function renderCompare() {
    const picked = state.compare
      .map((id) => STRAINS.find((s) => s.id === id))
      .filter(Boolean);

    const head =
      '<div class="page-head">' +
        '<div class="eyebrow">Direktvergleich</div>' +
        '<h1 class="page-title">Sorten gegenüberstellen</h1>' +
        '<p class="page-sub">Bis zu ' + MAX_COMPARE + ' Sorten gleichzeitig: Wirkungsprofile überlagert, ' +
        'Eigenschaften in einer Tabelle und Terpene im direkten Vergleich.</p>' +
      '</div>';

    const picker =
      '<div class="compare-top">' +
        '<div class="picker compare-search">' +
          '<div class="search-field">' + SEARCH_ICON +
            '<input id="cmp-search" type="search" placeholder="Sorte hinzufügen …" value="' +
            esc(state.compareQuery) + '" autocomplete="off" spellcheck="false">' +
          '</div>' +
          '<div class="picker-results" id="picker-results"' +
            (state.compareQuery.trim() ? '' : ' hidden') + '>' + pickerHtml() + '</div>' +
        '</div>' +
        '<span class="panel-note" style="padding-top:12px">' + picked.length + ' / ' + MAX_COMPARE + ' ausgewählt</span>' +
      '</div>';

    const chips = picked.length
      ? '<div class="picked-row">' + picked.map((s, i) =>
          '<span class="picked-chip"><i style="background:' + COMPARE_COLORS[i] + '"></i>' +
            esc(s.name) +
            '<button data-action="compare-remove" data-id="' + s.id + '" aria-label="Entfernen">×</button>' +
          '</span>'
        ).join('') + '</div>'
      : '';

    if (!picked.length) {
      return head + picker + chips +
        '<div class="empty">' + EMPTY_ICON +
          '<strong>Noch keine Sorte ausgewählt</strong>' +
          '<span>Suche oben nach einer Sorte oder nutze „Vergleichen“ auf einer Karte.</span>' +
        '</div>';
    }

    const rows = [
      { label: 'Typ', get: (s) => s.ratio },
      { label: 'THC', get: (s) => fmtPct(s.thc), best: (s) => s.thc },
      { label: 'CBD', get: (s) => fmtPct(s.cbd), best: (s) => s.cbd },
      { label: 'Bewertung', get: (s) => fmtNum(s.rating) + ' / 5', best: (s) => s.rating },
      { label: 'Blütezeit', get: (s) => s.flowering },
      { label: 'Ertrag indoor', get: (s) => s.yieldIndoor },
      { label: 'Ertrag outdoor', get: (s) => s.yieldOutdoor },
      { label: 'Wuchshöhe', get: (s) => s.height },
      { label: 'Schwierigkeit', get: (s) => s.difficulty },
      { label: 'Top-Wirkung', get: (s) => (topEffects(s, 1)[0] || {}).short || '–' },
      { label: 'Top-Terpen', get: (s) => (terpeneList(s)[0] || {}).name || '–' }
    ];

    const table =
      '<div class="cmp-scroll"><table class="cmp-table">' +
        '<thead><tr><th>Kriterium</th>' +
          picked.map((s, i) =>
            '<th style="color:' + COMPARE_COLORS[i] + '">' + esc(s.name) + '</th>'
          ).join('') +
        '</tr></thead><tbody>' +
        rows.map((row) => {
          const max = row.best ? Math.max(...picked.map(row.best)) : null;
          return '<tr><td>' + row.label + '</td>' +
            picked.map((s) => {
              const isBest = row.best && picked.length > 1 && row.best(s) === max;
              return '<td class="' + (isBest ? 'best' : '') + '">' + esc(row.get(s)) + '</td>';
            }).join('') +
            '</tr>';
        }).join('') +
        '</tbody></table></div>';

    const radarPanel =
      '<div class="panel compare-chart">' +
        '<div class="panel-title">Wirkungsprofile</div>' +
        '<div class="chart-box">' +
          Charts.radar({
            labels: EFFECTS.map((e) => e.short),
            series: picked.map((s, i) => ({
              values: EFFECTS.map((e) => s.effects[e.key] || 0),
              color: COMPARE_COLORS[i]
            })),
            size: 400
          }) +
        '</div>' +
        Charts.legend(picked.map((s, i) => ({ label: s.name, color: COMPARE_COLORS[i] }))) +
      '</div>';

    const terpPanel =
      '<div class="panel" style="margin-top:16px">' +
        '<div class="panel-title">Terpenprofile</div>' +
        '<div class="compare-list" style="margin-top:12px">' +
          picked.map((s, i) =>
            '<div class="cmp-strain">' +
              '<div class="cmp-strain-head">' +
                '<strong>' + esc(s.name) + '</strong>' +
                '<span class="type-badge" style="--c:' + COMPARE_COLORS[i] + '">' + esc(s.type) + '</span>' +
              '</div>' +
              Charts.bars({
                items: terpeneList(s).map((t) => ({
                  label: t.name, value: t.value, suffix: ' %', color: COMPARE_COLORS[i]
                })),
                width: 540,
                labelWidth: 120,
                rowHeight: 26,
                max: 100
              }) +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>';

    return head + picker + chips +
      '<div class="compare-grid">' + radarPanel +
        '<div class="panel"><div class="panel-title">Direktvergleich</div>' +
          '<div style="margin-top:8px">' + table + '</div>' +
        '</div>' +
      '</div>' + terpPanel;
  }

  // ---------- Statistik ----------
  function renderStats() {
    const total = STRAINS.length;
    const avgThc = STRAINS.reduce((sum, s) => sum + s.thc, 0) / total;
    const avgCbd = STRAINS.reduce((sum, s) => sum + s.cbd, 0) / total;
    const strongest = STRAINS.slice().sort((a, b) => b.thc - a.thc)[0];

    const byType = TYPES.map((type) => ({
      label: type,
      value: STRAINS.filter((s) => s.type === type).length,
      color: TYPE_COLORS[type]
    }));

    const statCards =
      '<div class="stat-grid">' +
        '<div class="stat-card"><div class="stat-label">Sorten</div>' +
          '<div class="stat-value">' + total + '</div>' +
          '<div class="stat-hint">in der Bibliothek</div></div>' +
        '<div class="stat-card"><div class="stat-label">Ø THC</div>' +
          '<div class="stat-value">' + fmtPct(avgThc) + '</div>' +
          '<div class="stat-hint">über alle Sorten</div></div>' +
        '<div class="stat-card"><div class="stat-label">Ø CBD</div>' +
          '<div class="stat-value">' + fmtPct(avgCbd) + '</div>' +
          '<div class="stat-hint">über alle Sorten</div></div>' +
        '<div class="stat-card"><div class="stat-label">Stärkste Sorte</div>' +
          '<div class="stat-value">' + fmtPct(strongest.thc) + '</div>' +
          '<div class="stat-hint">' + esc(strongest.name) + '</div></div>' +
      '</div>';

    const donut =
      '<div class="chart-card">' +
        '<div class="panel-title">Typverteilung</div>' +
        '<div class="chart-sub">Sativa, Indica und Hybrid im Verhältnis</div>' +
        '<div class="donut-row">' +
          '<div class="chart-box">' +
            Charts.donut({ items: byType, size: 200, thickness: 26, centerLabel: 'Sorten', centerValue: total }) +
          '</div>' +
          Charts.legend(byType.map((t) => ({
            label: t.label, color: t.color,
            value: t.value + ' · ' + Math.round((t.value / total) * 100) + ' %'
          }))) +
        '</div>' +
      '</div>';

    const effectCounts = EFFECTS
      .map((e) => ({
        ...e,
        count: STRAINS.filter((s) => (s.effects[e.key] || 0) >= 4).length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const maxEffect = Math.max.apply(null, effectCounts.map((e) => e.count));

    const effectPanel =
      '<div class="chart-card">' +
        '<div class="panel-title">Häufigste Wirkungen</div>' +
        '<div class="chart-sub">Anzahl Sorten mit mindestens 4/5 Punkten</div>' +
        '<div class="bar-list">' +
          effectCounts.map((e, i) =>
            '<div class="bar-list-row"><span>' + esc(e.short) + '</span>' +
              '<div class="bar-track"><div class="bar-fill" style="width:' +
              ((e.count / maxEffect) * 100).toFixed(1) + '%;background:' +
              (i < 3 ? '#34d399' : 'rgba(52,211,153,0.55)') + '"></div></div>' +
              '<b>' + e.count + '</b></div>'
          ).join('') +
        '</div>' +
      '</div>';

    const cbdMax = Math.max(0.5, Math.ceil(Math.max(...STRAINS.map((s) => s.cbd)) * 10) / 10);
    const scatterPanel =
      '<div class="chart-card wide">' +
        '<div class="panel-title">THC vs. CBD</div>' +
        '<div class="chart-sub">Jeder Punkt ist eine Sorte – je weiter rechts, desto stärker</div>' +
        Charts.scatter({
          points: STRAINS.map((s) => ({
            x: s.thc, y: s.cbd, label: s.name, color: TYPE_COLORS[s.type]
          })),
          width: 640,
          height: 320,
          xLabel: 'THC in %',
          yLabel: 'CBD in %',
          xMin: 15, xMax: 30, yMin: 0, yMax: cbdMax
        }) +
        Charts.legend(byType.map((t) => ({ label: t.label, color: t.color }))) +
      '</div>';

    const terpStats = ALL_TERPENES.map((name) => {
      const values = STRAINS.map((s) => Number(s.terpenes[name]) || 0).filter((v) => v > 0);
      return {
        name,
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        count: values.length
      };
    }).sort((a, b) => b.avg - a.avg);
    const maxTerp = Math.max.apply(null, terpStats.map((t) => t.avg));

    const terpPanel =
      '<div class="chart-card">' +
        '<div class="panel-title">Terpen-Ranking</div>' +
        '<div class="chart-sub">Durchschnittlicher Anteil am Terpenprofil (Summe 100 %)</div>' +
        '<div class="bar-list">' +
          terpStats.map((t) =>
            '<div class="bar-list-row"><span>' + esc(t.name) + '</span>' +
              '<div class="bar-track"><div class="bar-fill" style="width:' +
              ((t.avg / maxTerp) * 100).toFixed(1) + '%;background:linear-gradient(90deg,#7c6bd6,#a78bfa)"></div></div>' +
              '<b>' + fmtPct(t.avg) + '</b></div>'
          ).join('') +
        '</div>' +
      '</div>';

    const diffColors = { Einfach: '#34d399', Mittel: '#f6b73c', Anspruchsvoll: '#f87171' };
    const diffCounts = DIFFICULTIES.map((d) => ({
      label: d,
      value: STRAINS.filter((s) => s.difficulty === d).length
    }));
    const maxDiff = Math.max.apply(null, diffCounts.map((d) => d.value));

    const diffPanel =
      '<div class="chart-card">' +
        '<div class="panel-title">Schwierigkeit</div>' +
        '<div class="chart-sub">Wie anspruchsvoll ist der Anbau?</div>' +
        '<div class="bar-list">' +
          diffCounts.map((d) =>
            '<div class="bar-list-row"><span>' + d.label + '</span>' +
              '<div class="bar-track"><div class="bar-fill" style="width:' +
              ((d.value / maxDiff) * 100).toFixed(1) + '%;background:' + diffColors[d.label] + '"></div></div>' +
              '<b>' + d.value + '</b></div>'
          ).join('') +
        '</div>' +
      '</div>';

    return (
      '<div class="page">' +
        '<div class="page-head">' +
          '<div class="eyebrow">Statistik</div>' +
          '<h1 class="page-title">Die Datenbank in Zahlen</h1>' +
          '<p class="page-sub">Verteilungen, Extremwerte und Muster über alle ' + total + ' Sorten hinweg.</p>' +
        '</div>' +
        statCards +
        '<div class="chart-grid">' + donut + effectPanel + scatterPanel + terpPanel + diffPanel + '</div>' +
      '</div>'
    );
  }

  // ---------- Wirkungs-Finder ----------
  function finderScore(strain) {
    if (!state.finder.size) return 0;
    let sum = 0;
    for (const key of state.finder) sum += strain.effects[key] || 0;
    return Math.round((sum / (state.finder.size * 5)) * 100);
  }

  function finderResults() {
    return STRAINS
      .map((s) => ({ strain: s, score: finderScore(s) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.strain.thc - a.strain.thc)
      .slice(0, 12);
  }

  function renderFinder() {
    const presets = [
      { label: 'Entspannen', effects: 'relaxed,anxiolytic,couchlock' },
      { label: 'Energie', effects: 'energetic,focused,uplifted' },
      { label: 'Kreativität', effects: 'creative,happy,talkative' },
      { label: 'Schlafen', effects: 'sleepy,relaxed,couchlock' },
      { label: 'Schmerzlinderung', effects: 'painrelief,relaxed,couchlock' }
    ];
    const selected = Array.from(state.finder);
    const results = finderResults();

    const head =
      '<div class="page-head">' +
        '<div class="eyebrow">Wirkungs-Finder</div>' +
        '<h1 class="page-title">Welche Wirkung suchst du?</h1>' +
        '<p class="page-sub">Wähle eine oder mehrere Wirkungen – die App berechnet, welche Sorten am besten passen.</p>' +
      '</div>';

    const panel =
      '<div class="finder-panel">' +
        '<div class="filter-title">Wirkungen auswählen</div>' +
        '<div class="finder-effects">' +
          EFFECTS.map((e) =>
            '<button class="chip ' + (state.finder.has(e.key) ? 'is-active' : '') + '" ' +
              'data-action="finder-effect" data-effect="' + e.key + '">' + esc(e.label) + '</button>'
          ).join('') +
        '</div>' +
        '<div class="finder-bar">' +
          '<span><b>' + selected.length + '</b> Wirkung' + (selected.length === 1 ? '' : 'en') + ' ausgewählt</span>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            presets.map((p) =>
              '<button class="chip" data-action="finder-preset" data-effects="' + p.effects + '">' + p.label + '</button>'
            ).join('') +
            (selected.length ? '<button class="chip" data-action="finder-clear">Zurücksetzen</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';

    if (!selected.length) {
      return head + panel +
        '<div class="empty">' + EMPTY_ICON +
          '<strong>Noch keine Wirkung gewählt</strong>' +
          '<span>Oben eine Wirkung anklicken oder eine der Voreinstellungen nutzen.</span>' +
        '</div>';
    }

    const list = results.length
      ? results.map((entry, index) => {
          const s = entry.strain;
          const matched = selected
            .map((key) => ({ key, value: s.effects[key] || 0 }))
            .filter((x) => x.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3)
            .map((x) => (EFFECTS.find((e) => e.key === x.key) || {}).short)
            .join(' · ');
          return (
            '<div class="result-row" data-action="open" data-id="' + s.id + '">' +
              '<div class="result-rank">' + String(index + 1).padStart(2, '0') + '</div>' +
              '<div>' +
                '<div class="result-name">' + esc(s.name) + '</div>' +
                '<div class="result-sub">' + esc(s.type) + ' · THC ' + fmtPct(s.thc) +
                  (matched ? ' · ' + esc(matched) : '') + '</div>' +
              '</div>' +
              '<div class="result-match">' +
                '<div class="bar-track"><div class="bar-fill" style="width:' + entry.score +
                  '%;background:linear-gradient(90deg,#22b57e,#34d399)"></div></div>' +
                '<b>' + entry.score + '%</b>' +
              '</div>' +
              '<div class="result-cta">Details →</div>' +
            '</div>'
          );
        }).join('')
      : '<div class="empty">' + EMPTY_ICON + '<strong>Keine passende Sorte</strong>' +
        '<span>Wähle weniger oder andere Wirkungen.</span></div>';

    return head + panel +
      '<div class="results-bar"><span class="result-count"><b>' + results.length + '</b> Treffer, sortiert nach Passgenauigkeit</span></div>' +
      '<div class="result-list">' + list + '</div>';
  }

  // ---------- Routing ----------
  function parseHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const parts = raw.split('/').filter(Boolean);
    return { route: parts[0] || 'bibliothek', param: parts.slice(1).join('/') };
  }

  function setActiveNav(route) {
    const key = route === 'sorte' ? 'bibliothek' : route;
    document.querySelectorAll('[data-nav]').forEach((link) => {
      link.classList.toggle('is-active', link.dataset.nav === key);
    });
  }

  let lastRoute = null;

  function render() {
    const { route, param } = parseHash();
    state.route = route;
    const view = document.getElementById('view');
    const content = document.querySelector('.content');
    const previousScroll = content ? content.scrollTop : 0;
    const sameRoute = route === lastRoute;

    let html;
    switch (route) {
      case 'sorte': html = renderDetail(param); break;
      case 'vergleich': html = renderCompare(); break;
      case 'statistik': html = renderStats(); break;
      case 'finder': html = renderFinder(); break;
      default: html = renderLibrary();
    }

    view.innerHTML = html;
    setActiveNav(route);
    if (content) content.scrollTop = sameRoute ? previousScroll : 0;
    lastRoute = route;
  }

  // ---------- Ereignisse ----------
  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.id;

    switch (action) {
      case 'open':
        location.hash = '#/sorte/' + id;
        break;
      case 'fav':
        toggleSet(state.favorites, id);
        saveFavorites();
        render();
        break;
      case 'cmp-toggle':
        toggleCompare(id);
        break;
      case 'filter-type':
        toggleSet(state.types, el.dataset.type);
        render();
        break;
      case 'filter-effect':
        toggleSet(state.effects, el.dataset.effect);
        render();
        break;
      case 'filter-diff':
        state.difficulty = state.difficulty === el.dataset.diff ? '' : el.dataset.diff;
        render();
        break;
      case 'toggle-fav-only':
        state.favoritesOnly = !state.favoritesOnly;
        render();
        break;
      case 'clear-filters':
        resetFilters();
        render();
        break;
      case 'nav-library':
        location.hash = '#/bibliothek';
        break;
      case 'back':
        if (state.route === 'sorte' && history.length > 1) history.back();
        else location.hash = '#/bibliothek';
        break;
      case 'compare-add':
        addCompare(id);
        break;
      case 'compare-remove':
        removeCompare(id);
        break;
      case 'finder-effect':
        toggleSet(state.finder, el.dataset.effect);
        render();
        break;
      case 'finder-preset':
        state.finder = new Set(el.dataset.effects.split(','));
        render();
        break;
      case 'finder-clear':
        state.finder.clear();
        render();
        break;
      default:
        break;
    }
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.id === 'search') {
      state.query = target.value;
      updateLibraryResults();
    } else if (target.id === 'cmp-search') {
      state.compareQuery = target.value;
      const box = document.getElementById('picker-results');
      if (box) {
        box.innerHTML = pickerHtml();
        box.hidden = !state.compareQuery.trim();
      }
    } else if (target.id === 'thc-min') {
      const label = document.getElementById('thc-min-label');
      if (label) label.textContent = target.value + ' %';
    } else if (target.id === 'thc-max') {
      const label = document.getElementById('thc-max-label');
      if (label) label.textContent = target.value + ' %';
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.id === 'thc-min') {
      state.thcMin = Math.min(Number(target.value), state.thcMax);
      render();
    } else if (target.id === 'thc-max') {
      state.thcMax = Math.max(Number(target.value), state.thcMin);
      render();
    } else if (target.id === 'sort') {
      state.sort = target.value;
      render();
    } else if (target.id === 'terpene') {
      state.terpene = target.value;
      render();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && state.route === 'bibliothek') {
      const active = document.activeElement;
      if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
      event.preventDefault();
      const search = document.getElementById('search');
      if (search) search.focus();
    }
  });

  window.addEventListener('hashchange', render);

  // ---------- Start ----------
  if (!location.hash) location.hash = '#/bibliothek';
  render();

})();
