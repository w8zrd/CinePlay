/* ─── CONFIG ─────────────────────────────── */
const TMDB_KEY  = 'f19bed2c1f8c6c9df52845b6669e0f27';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p';

/* ─── UTILITIES ──────────────────────────── */
const $ = id => document.getElementById(id);

const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const tmdb = async (path, params = {}) => {
  const qs = new URLSearchParams({ api_key: TMDB_KEY, ...params });
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
};

const posterUrl   = (p, s = 'w342') => p ? `${TMDB_IMG}/${s}${p}` : '';
const backdropUrl = p => p ? `${TMDB_IMG}/w1280${p}` : '';
const playUrl     = id => `https://playimdb.com/title/${id}/`;

const fmtRuntime = m => {
  if (!m) return '';
  const h = Math.floor(m / 60), mn = m % 60;
  return h ? `${h}h ${mn}m` : `${mn}m`;
};

const starRating = v => {
  const n = Math.round(v / 2);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
};

/* ─── GENRE MAPS ─────────────────────────── */
const GENRES = {
  movie: [
    { id: 28,    name: 'Action'      }, { id: 12,    name: 'Adventure'   },
    { id: 16,    name: 'Animation'   }, { id: 35,    name: 'Comedy'      },
    { id: 80,    name: 'Crime'       }, { id: 99,    name: 'Documentary' },
    { id: 18,    name: 'Drama'       }, { id: 10751, name: 'Family'      },
    { id: 14,    name: 'Fantasy'     }, { id: 36,    name: 'History'     },
    { id: 27,    name: 'Horror'      }, { id: 10402, name: 'Music'       },
    { id: 9648,  name: 'Mystery'     }, { id: 10749, name: 'Romance'     },
    { id: 878,   name: 'Sci-Fi'      }, { id: 53,    name: 'Thriller'    },
    { id: 10752, name: 'War'         }, { id: 37,    name: 'Western'     },
  ],
  tv: [
    { id: 10759, name: 'Action & Adventure' }, { id: 16,    name: 'Animation'     },
    { id: 35,    name: 'Comedy'       }, { id: 80,    name: 'Crime'           },
    { id: 99,    name: 'Documentary'  }, { id: 18,    name: 'Drama'           },
    { id: 10751, name: 'Family'       }, { id: 10762, name: 'Kids'            },
    { id: 9648,  name: 'Mystery'      }, { id: 10765, name: 'Sci-Fi & Fantasy'},
    { id: 10768, name: 'War & Politics'}, { id: 37,   name: 'Western'         },
  ],
};

/* ─── APP STATE ──────────────────────────── */
const S = {
  mode:       'movie',
  tab:        'popular',
  genreId:    null,
  year:       null,
  rating:     null,
  page:       1,
  totalPages: 1,
  query:      '',
};

// Pending filter (applied only on "Apply")
const FP = { genreId: null, year: null, rating: null };

/* ─── RECENTLY VIEWED ────────────────────── */
const RKEY = 'cp_recent_v2';

const getRecent = () => {
  try { return JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch { return []; }
};

const saveRecent = items => {
  try { localStorage.setItem(RKEY, JSON.stringify(items)); } catch {}
};

const addRecent = item => {
  const arr = getRecent().filter(i => i.id !== item.id);
  arr.unshift(item);
  saveRecent(arr.slice(0, 20));
  renderRecent();
};

const renderRecent = () => {
  const arr = getRecent();
  const sec = $('recent-section');
  if (!sec) return;

  if (!arr.length) {
    sec.style.display = 'none';
    return;
  }

  sec.style.display = '';
  $('recent-grid').innerHTML = arr.map(i => {
    const img = i.poster
      ? `<img src="${esc(i.poster)}" alt="${esc(i.title)}" loading="lazy"/>`
      : `<div class="mini-noposter">🎬</div>`;
    return `<div class="mini-card" data-id="${i.id}" data-type="${esc(i.type)}" tabindex="0" role="button" aria-label="${esc(i.title)}">${img}<div class="mini-title">${esc(i.title)}</div></div>`;
  }).join('');
};

/* ─── FILTER CHIPS ───────────────────────── */
const buildChips = () => {
  const yr = new Date().getFullYear();

  $('genre-chips').innerHTML = GENRES[S.mode]
    .map(g => `<button class="chip${FP.genreId === g.id ? ' active' : ''}" data-genre="${g.id}">${esc(g.name)}</button>`)
    .join('');

  const yearOptions = [null, yr, yr - 1, yr - 2, yr - 3, yr - 4];
  const yearLabels  = ['All', 'This Year', yr - 1, yr - 2, yr - 3, yr - 4];
  $('year-chips').innerHTML = yearOptions
    .map((y, i) => `<button class="chip${FP.year === y ? ' active' : ''}" data-year="${y}">${yearLabels[i]}</button>`)
    .join('');

  const ratingOptions = [null, 9, 8, 7, 6];
  const ratingLabels  = ['All', '9+ ★', '8+ ★', '7+ ★', '6+ ★'];
  $('rating-chips').innerHTML = ratingOptions
    .map((r, i) => `<button class="chip${FP.rating === r ? ' active' : ''}" data-rating="${r}">${ratingLabels[i]}</button>`)
    .join('');

  // Reflect active filter state on button
  $('filter-btn').classList.toggle('active', !!(S.genreId || S.year || S.rating));
};

/* ─── FILTER SHEET ───────────────────────── */
const openSheet = () => {
  // Sync pending state with current applied state
  FP.genreId = S.genreId;
  FP.year    = S.year;
  FP.rating  = S.rating;
  buildChips();
  $('filter-overlay').style.display = 'block';
  $('filter-sheet').style.display   = 'block';
  document.body.style.overflow      = 'hidden';
};

const closeSheet = () => {
  $('filter-overlay').style.display = 'none';
  $('filter-sheet').style.display   = 'none';
  document.body.style.overflow      = '';
};

/* ─── SEARCH ─────────────────────────────── */
const openSearch = () => {
  $('search-bar').style.display = 'block';
  // Slight delay so animation plays before focus
  requestAnimationFrame(() => $('search-input').focus());
};

const closeSearch = () => {
  $('search-bar').style.display = 'none';
  $('search-input').value = '';
};

/* ─── UI STATE ───────────────────────────── */
const showState = which => {
  $('spinner').style.display     = which === 'spinner' ? 'block' : 'none';
  $('empty-state').style.display = which === 'empty'   ? 'block' : 'none';
  $('err-state').style.display   = which === 'err'     ? 'block' : 'none';
};

/* ─── SECTION TITLE ──────────────────────── */
const updateTitle = () => {
  const modeLabel = S.mode === 'movie' ? 'Movies' : 'TV Shows';
  const tabLabels = {
    popular:   'Popular',
    trending:  'Trending',
    top_rated: 'Top Rated',
    upcoming:  S.mode === 'movie' ? 'Upcoming' : 'On The Air',
    search:    'Search Results',
  };
  $('section-title').textContent = `${tabLabels[S.tab] || ''} ${modeLabel}`;
};

/* ─── RENDER GRID ────────────────────────── */
const renderGrid = items => {
  if (!items.length) {
    $('grid').innerHTML = '';
    showState('empty');
    $('pagination').style.display = 'none';
    $('section-count').textContent = '';
    return;
  }

  showState(null);
  $('section-count').textContent = `${items.length} titles`;

  $('grid').innerHTML = items.map(m => {
    const title  = m.title || m.name || '';
    const year   = (m.release_date || m.first_air_date || '').slice(0, 4);
    const poster = posterUrl(m.poster_path);
    const rating = m.vote_average > 0
      ? `<div class="card-rating">★ ${m.vote_average.toFixed(1)}</div>` : '';
    const badge  = S.mode === 'tv' ? '<div class="card-type">TV</div>' : '';
    const img    = poster
      ? `<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy"/>`
      : '<div class="card-noposter">No Poster</div>';

    return `<div class="card" tabindex="0" role="button" aria-label="${esc(title)}" data-id="${m.id}" data-type="${S.mode}">
      <div class="card-poster">${img}${rating}${badge}<div class="card-overlay"><div class="card-play">▶</div></div></div>
      <div class="card-info"><div class="card-title">${esc(title)}</div><div class="card-year">${year}</div></div>
    </div>`;
  }).join('');

  $('pagination').style.display = 'flex';
  $('page-info').textContent    = `${S.page} / ${S.totalPages.toLocaleString()}`;
  $('btn-prev').disabled        = S.page <= 1;
  $('btn-next').disabled        = S.page >= S.totalPages;
};

/* ─── FETCH CONTENT ──────────────────────── */
const fetchContent = async () => {
  showState('spinner');
  $('grid').innerHTML           = '';
  $('pagination').style.display = 'none';
  updateTitle();

  const isMovie = S.mode === 'movie';
  const params  = { page: S.page, language: 'en-US' };

  if (S.genreId) params.with_genres = S.genreId;
  if (S.year)    params[isMovie ? 'primary_release_year' : 'first_air_date_year'] = S.year;
  if (S.rating)  params['vote_average.gte'] = S.rating;

  try {
    let data;
    const base = isMovie ? '/movie' : '/tv';

    if (S.tab === 'search' && S.query) {
      data = await tmdb(`/search/${isMovie ? 'movie' : 'tv'}`, {
        ...params, query: S.query, include_adult: false,
      });
    } else if (S.tab === 'trending') {
      data = await tmdb(`/trending/${isMovie ? 'movie' : 'tv'}/week`, params);
    } else if (S.tab === 'top_rated') {
      data = await tmdb(`${base}/top_rated`, params);
    } else if (S.tab === 'upcoming' && isMovie) {
      data = await tmdb(`${base}/upcoming`, params);
    } else if (S.tab === 'upcoming' && !isMovie) {
      data = await tmdb(`${base}/on_the_air`, params);
    } else if (S.genreId || S.year || S.rating) {
      data = await tmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
        ...params, sort_by: 'popularity.desc',
      });
    } else {
      data = await tmdb(`${base}/popular`, params);
    }

    S.totalPages = Math.min(data.total_pages || 1, 500);
    renderGrid(data.results || []);
  } catch {
    showState('err');
  }
};

/* ─── MODAL ──────────────────────────────── */
const openModal = async (id, type) => {
  const isMovie = type === 'movie';

  // Reset
  $('modal-backdrop').src                 = '';
  $('modal-poster').src                   = '';
  $('modal-poster').style.display         = 'none';
  $('modal-cast-wrap').style.display      = 'none';
  $('modal-loading').style.display        = 'flex';
  $('modal-body').style.visibility        = 'hidden';
  $('modal-overlay').style.display        = 'flex';
  document.body.style.overflow            = 'hidden';

  ['modal-title', 'modal-orig', 'modal-overview'].forEach(id => $(id).textContent = '');
  ['modal-pills', 'modal-meta', 'modal-cast', 'modal-cta'].forEach(id => $(id).innerHTML = '');

  try {
    const d = await tmdb(`/${isMovie ? 'movie' : 'tv'}/${id}`, {
      append_to_response: 'credits',
    });

    // Backdrop
    if (d.backdrop_path) $('modal-backdrop').src = backdropUrl(d.backdrop_path);

    // Poster
    const pUrl = posterUrl(d.poster_path);
    if (pUrl) {
      $('modal-poster').src     = pUrl;
      $('modal-poster').alt     = d.title || d.name || '';
      $('modal-poster').style.display = '';
    }

    // Title
    $('modal-title').textContent = d.title || d.name || '';
    const orig = d.original_title || d.original_name || '';
    if (orig && orig !== (d.title || d.name)) $('modal-orig').textContent = orig;

    // Pills
    let pills = '';
    if (d.vote_average > 0)
      pills += `<span class="pill pill-r">${starRating(d.vote_average)} ${d.vote_average.toFixed(1)}</span>`;
    const dateStr = d.release_date || d.first_air_date || '';
    if (dateStr) pills += `<span class="pill">${dateStr.slice(0, 4)}</span>`;
    if (!isMovie && d.number_of_seasons)
      pills += `<span class="pill">${d.number_of_seasons} Season${d.number_of_seasons > 1 ? 's' : ''}</span>`;
    const rt = isMovie ? fmtRuntime(d.runtime) : fmtRuntime(d.episode_run_time?.[0]);
    if (rt) pills += `<span class="pill">${rt}</span>`;
    (d.genres || []).slice(0, 3).forEach(g => { pills += `<span class="pill">${esc(g.name)}</span>`; });
    $('modal-pills').innerHTML = pills;

    // Overview
    if (d.overview) $('modal-overview').textContent = d.overview;

    // Meta
    const crew = d.credits?.crew || [];
    const dir  = crew.find(c => c.job === 'Director');
    const cre  = (d.created_by || [])[0];
    const meta = [];
    if (dir)                         meta.push(['Director', dir.name]);
    if (!isMovie && cre)             meta.push(['Creator',  cre.name]);
    if (d.status)                    meta.push(['Status',   d.status]);
    if (isMovie && d.budget  > 0)    meta.push(['Budget',  `$${(d.budget  / 1e6).toFixed(0)}M`]);
    if (isMovie && d.revenue > 0)    meta.push(['Revenue', `$${(d.revenue / 1e6).toFixed(0)}M`]);
    if (!isMovie && d.networks?.length) meta.push(['Network', d.networks[0].name]);
    $('modal-meta').innerHTML = meta
      .map(([l, v]) => `<div><div class="meta-lbl">${l}</div><div class="meta-val">${esc(String(v))}</div></div>`)
      .join('');

    // Cast
    const cast = (d.credits?.cast || []).slice(0, 6);
    if (cast.length) {
      $('modal-cast-wrap').style.display = '';
      $('modal-cast').innerHTML = cast.map(c => {
        const av = c.profile_path
          ? `<img class="cast-av" src="${TMDB_IMG}/w45${c.profile_path}" alt="${esc(c.name)}" loading="lazy"/>`
          : `<div class="cast-av-ph">👤</div>`;
        return `<div class="cast-chip">${av}<div><div class="cast-name">${esc(c.name)}</div><div class="cast-char">${esc(c.character)}</div></div></div>`;
      }).join('');
    }

    // IMDb ID → CTA
    let imdbId = d.imdb_id;
    if (!isMovie && !imdbId) {
      try {
        const ext = await tmdb(`/tv/${id}/external_ids`);
        imdbId = ext.imdb_id;
      } catch { /* silent */ }
    }

    if (imdbId) {
      $('modal-cta').innerHTML =
        `<a class="btn-watch" href="${playUrl(imdbId)}" target="_blank" rel="noopener noreferrer">▶&nbsp; Watch Now</a>` +
        `<a class="btn-imdb"  href="https://www.imdb.com/title/${imdbId}/" target="_blank" rel="noopener noreferrer">IMDb ↗</a>`;
    } else {
      $('modal-cta').innerHTML = `<span class="btn-watch" style="opacity:.3;cursor:default;pointer-events:none">▶&nbsp; Watch Now</span>`;
    }

    // Track
    addRecent({
      id,
      type,
      title:  d.title || d.name || '',
      poster: posterUrl(d.poster_path, 'w185'),
    });

  } catch {
    $('modal-cta').innerHTML = '<p style="color:#e55;margin-top:14px;font-size:13px">Could not load details. Please try again.</p>';
  } finally {
    $('modal-loading').style.display   = 'none';
    $('modal-body').style.visibility   = 'visible';
  }
};

const closeModal = () => {
  $('modal-overlay').style.display  = 'none';
  $('modal-loading').style.display  = 'none';
  $('modal-body').style.visibility  = 'visible';
  document.body.style.overflow      = '';
};

/* ─── MODE SWITCH ────────────────────────── */
const switchMode = mode => {
  if (S.mode === mode) return;
  S.mode    = mode;
  S.tab     = 'popular';
  S.genreId = null;
  S.year    = null;
  S.rating  = null;
  S.page    = 1;
  S.query   = '';
  FP.genreId = null;
  FP.year    = null;
  FP.rating  = null;

  closeSearch();
  closeSheet();

  document.querySelectorAll('.mode-btn')
    .forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.querySelectorAll('.tab-btn')
    .forEach(b => b.classList.toggle('active', b.dataset.tab === 'popular'));

  buildChips();
  fetchContent();
};

/* ─── INIT ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Mode buttons */
  document.querySelectorAll('.mode-btn').forEach(btn =>
    btn.addEventListener('click', () => switchMode(btn.dataset.mode))
  );

  /* Tab buttons */
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      if (S.tab === btn.dataset.tab && S.mode !== 'search') return;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.tab   = btn.dataset.tab;
      S.page  = 1;
      S.query = '';
      fetchContent();
    })
  );

  /* Search */
  $('search-toggle').addEventListener('click', openSearch);
  $('search-close').addEventListener('click', closeSearch);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('search-bar').style.display !== 'none') closeSearch();
  });
  $('search-form').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('search-input').value.trim();
    if (!q) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    S.tab   = 'search';
    S.query = q;
    S.page  = 1;
    closeSearch();
    fetchContent();
  });

  /* Filter sheet open */
  $('filter-btn').addEventListener('click', e => { e.stopPropagation(); openSheet(); });
  $('filter-overlay').addEventListener('click', closeSheet);
  $('filter-close').addEventListener('click', closeSheet);

  /* Chip selection (genre / year / rating) */
  const chipContainers = ['genre-chips', 'year-chips', 'rating-chips'];
  chipContainers.forEach(containerId => {
    $(containerId).addEventListener('click', e => {
      e.stopPropagation();
      const btn = e.target.closest('.chip');
      if (!btn) return;

      if ('genre' in btn.dataset) {
        const gid = parseInt(btn.dataset.genre, 10);
        FP.genreId = FP.genreId === gid ? null : gid;
      } else if ('year' in btn.dataset) {
        const y = btn.dataset.year === 'null' ? null : parseInt(btn.dataset.year, 10);
        FP.year = FP.year === y ? null : y;
      } else if ('rating' in btn.dataset) {
        const r = btn.dataset.rating === 'null' ? null : parseInt(btn.dataset.rating, 10);
        FP.rating = FP.rating === r ? null : r;
      }

      buildChips();
    });
  });

  /* Apply filters */
  $('filter-apply').addEventListener('click', e => {
    e.stopPropagation();
    S.genreId = FP.genreId;
    S.year    = FP.year;
    S.rating  = FP.rating;
    S.page    = 1;
    closeSheet();
    buildChips();
    fetchContent();
  });

  /* Clear filters */
  $('filter-clear').addEventListener('click', e => {
    e.stopPropagation();
    FP.genreId = null;
    FP.year    = null;
    FP.rating  = null;
    buildChips();
  });

  /* Pagination */
  $('btn-prev').addEventListener('click', () => {
    if (S.page <= 1) return;
    S.page--;
    fetchContent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('btn-next').addEventListener('click', () => {
    if (S.page >= S.totalPages) return;
    S.page++;
    fetchContent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Grid clicks */
  $('grid').addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) openModal(card.dataset.id, card.dataset.type);
  });
  $('grid').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.card');
      if (card) { e.preventDefault(); openModal(card.dataset.id, card.dataset.type); }
    }
  });

  /* Recently viewed clicks */
  $('recent-grid').addEventListener('click', e => {
    const card = e.target.closest('.mini-card');
    if (card) openModal(card.dataset.id, card.dataset.type);
  });
  $('recent-grid').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.mini-card');
      if (card) { e.preventDefault(); openModal(card.dataset.id, card.dataset.type); }
    }
  });

  /* Clear recently viewed */
  $('clear-recent').addEventListener('click', () => {
    try { localStorage.removeItem(RKEY); } catch { /* silent */ }
    renderRecent();
  });

  /* Retry button */
  $('retry-btn')?.addEventListener('click', fetchContent);

  /* Modal close */
  $('modal-close').addEventListener('click', closeModal);
  $('modal-overlay').addEventListener('click', e => {
    if (e.target === $('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('modal-overlay').style.display === 'flex') closeModal();
  });

  /* ── BOOT ── */
  buildChips();
  renderRecent();
  fetchContent(); // fire immediately — no hero delay
});
