// ══ CONFIG ══════════════════════════════════════════
const TMDB_KEY  = 'f19bed2c1f8c6c9df52845b6669e0f27';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p';

// ══ HELPERS ═════════════════════════════════════════
const $  = (id) => document.getElementById(id);
const tmdb = async (path, params={}) => {
  const qs = new URLSearchParams({api_key: TMDB_KEY, ...params});
  const r  = await fetch(`${TMDB_BASE}${path}?${qs}`);
  if (!r.ok) throw new Error(r.status);
  return r.json();
};
const playUrl     = (imdbId) => `https://playimdb.com/title/${imdbId}/`;
const posterUrl   = (p, s='w342') => p ? `${TMDB_IMG}/${s}${p}` : '';
const backdropUrl = (p) => p ? `${TMDB_IMG}/w1280${p}` : '';
const fmtRuntime  = (m) => { if(!m) return ''; const h=Math.floor(m/60),mn=m%60; return h ? `${h}h ${mn}m` : `${mn}m`; };
const stars       = (v) => { const n=Math.round(v/2); return '★'.repeat(n)+'☆'.repeat(5-n); };
const esc         = (s) => (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ══ GENRES ══════════════════════════════════════════
const MOVIE_GENRES = [
  {id:28,name:'Action'},{id:12,name:'Adventure'},{id:16,name:'Animation'},
  {id:35,name:'Comedy'},{id:80,name:'Crime'},{id:99,name:'Documentary'},
  {id:18,name:'Drama'},{id:10751,name:'Family'},{id:14,name:'Fantasy'},
  {id:36,name:'History'},{id:27,name:'Horror'},{id:10402,name:'Music'},
  {id:9648,name:'Mystery'},{id:10749,name:'Romance'},{id:878,name:'Sci-Fi'},
  {id:53,name:'Thriller'},{id:10752,name:'War'},{id:37,name:'Western'}
];
const TV_GENRES = [
  {id:10759,name:'Action & Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},
  {id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},
  {id:10751,name:'Family'},{id:10762,name:'Kids'},{id:9648,name:'Mystery'},
  {id:10763,name:'News'},{id:10764,name:'Reality'},{id:10765,name:'Sci-Fi & Fantasy'},
  {id:10766,name:'Soap'},{id:10767,name:'Talk'},{id:10768,name:'War & Politics'},{id:37,name:'Western'}
];

// ══ STATE ════════════════════════════════════════════
let state = {
  mode:        'movie',   // 'movie' | 'tv'
  tab:         'popular', // popular | top_rated | upcoming | trending | search
  genreId:     null,
  yearFilter:  null,
  ratingMin:   null,
  page:        1,
  totalPages:  1,
  query:       '',
};

// ══ SHOW / HIDE STATES ══════════════════════════════
const showOnly = (which) => {
  ['spinner','empty-state','err-state'].forEach(id => $(id).classList.remove('show'));
  if (which) $(which).classList.add('show');
};

// ══ BUILD GENRE FILTERS ══════════════════════════════
const buildGenreFilters = () => {
  const genres = state.mode === 'movie' ? MOVIE_GENRES : TV_GENRES;
  const wrap = $('genre-filters');
  wrap.innerHTML = genres.map(g =>
    `<button class="filter-btn${state.genreId===g.id?' active':''}" data-genre="${g.id}" data-name="${g.name}">${g.name}</button>`
  ).join('');
};

// ══ BUILD YEAR FILTERS ═══════════════════════════════
const buildYearFilters = () => {
  const year = new Date().getFullYear();
  const years = [null, year, year-1, year-2, year-3, year-4];
  const labels = ['All Years', 'This Year', year-1, year-2, year-3, year-4];
  $('year-filters').innerHTML = years.map((y,i) =>
    `<button class="filter-btn${state.yearFilter===y?' active':''}" data-year="${y}">${labels[i]}</button>`
  ).join('');
};

// ══ BUILD RATING FILTERS ════════════════════════════
const buildRatingFilters = () => {
  const ratings = [null, 9, 8, 7, 6];
  const labels  = ['All Ratings', '9+ ★', '8+ ★', '7+ ★', '6+ ★'];
  $('rating-filters').innerHTML = ratings.map((r,i) =>
    `<button class="filter-btn${state.ratingMin===r?' active':''}" data-rating="${r}">${labels[i]}</button>`
  ).join('');
};

// ══ RENDER GRID ═════════════════════════════════════
const renderGrid = (items) => {
  if (!items.length) {
    $('grid').innerHTML = '';
    showOnly('empty-state');
    $('pagination').classList.remove('show');
    $('section-count').textContent = '';
    return;
  }
  showOnly(null);
  $('section-count').textContent = `(${items.length} shown)`;

  $('grid').innerHTML = items.map(m => {
    const title  = m.title || m.name || '';
    const date   = m.release_date || m.first_air_date || '';
    const year   = date.slice(0,4);
    const poster = posterUrl(m.poster_path);
    const rating = m.vote_average > 0
      ? `<div class="card-rating">★ ${m.vote_average.toFixed(1)}</div>` : '';
    const typeBadge = state.mode === 'tv'
      ? `<div class="card-type">TV</div>` : '';
    const img = poster
      ? `<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy"/>`
      : `<div class="card-no-poster">🎬<span>No Poster</span></div>`;
    return `<div class="card" tabindex="0" role="button" aria-label="${esc(title)}" data-id="${m.id}" data-type="${state.mode}">
      <div class="card-poster">${img}${rating}${typeBadge}<div class="card-overlay"><div class="play-btn">▶</div></div></div>
      <div class="card-info"><div class="card-title">${esc(title)}</div><div class="card-meta"><span class="card-year">${year}</span></div></div>
    </div>`;
  }).join('');

  $('pagination').classList.add('show');
  $('page-info').textContent = `Page ${state.page} of ${state.totalPages.toLocaleString()}`;
  $('btn-prev').disabled = state.page <= 1;
  $('btn-next').disabled = state.page >= state.totalPages;
};

// ══ FETCH ════════════════════════════════════════════
const fetchContent = async () => {
  showOnly('spinner');
  $('grid').innerHTML = '';
  $('pagination').classList.remove('show');

  const isMovie = state.mode === 'movie';
  const params  = { page: state.page, language: 'en-US' };

  if (state.genreId)   params.with_genres       = state.genreId;
  if (state.yearFilter) {
    if (isMovie) params.primary_release_year = state.yearFilter;
    else         params.first_air_date_year  = state.yearFilter;
  }
  if (state.ratingMin) params['vote_average.gte'] = state.ratingMin;

  try {
    let data;
    const base = isMovie ? '/movie' : '/tv';
    if (state.tab === 'search' && state.query) {
      data = await tmdb(`/search/${isMovie ? 'movie' : 'tv'}`, { ...params, query: state.query, include_adult: false });
    } else if (state.tab === 'trending') {
      data = await tmdb(`/trending/${isMovie ? 'movie' : 'tv'}/week`, params);
    } else if (state.tab === 'top_rated') {
      data = await tmdb(`${base}/top_rated`, params);
    } else if (state.tab === 'upcoming' && isMovie) {
      data = await tmdb(`${base}/upcoming`, params);
    } else if (state.tab === 'upcoming' && !isMovie) {
      data = await tmdb(`${base}/on_the_air`, params);
    } else if (state.genreId || state.yearFilter || state.ratingMin) {
      data = await tmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, { ...params, sort_by: 'popularity.desc' });
    } else {
      data = await tmdb(`${base}/popular`, params);
    }
    state.totalPages = Math.min(data.total_pages || 1, 500);
    renderGrid(data.results || []);
  } catch(e) {
    showOnly('err-state');
  }
};

// ══ MODAL ════════════════════════════════════════════
const openModal = async (id, type) => {
  const isMovie = type === 'movie';
  // reset
  ['modal-backdrop','modal-poster'].forEach(i => { if($(i)) $(i).src=''; });
  ['modal-title','modal-orig-title','modal-overview'].forEach(i => $(i).textContent='');
  ['modal-pills','modal-meta','modal-cast','modal-cta'].forEach(i => $(i).innerHTML='');
  $('modal-cast-label').style.display = 'none';
  $('modal-loading').classList.add('show');
  $('modal-body').style.visibility = 'hidden';
  $('modal-overlay').classList.add('show');
  document.body.style.overflow = 'hidden';

  try {
    const endpoint = isMovie ? `/movie/${id}` : `/tv/${id}`;
    const d = await tmdb(endpoint, { append_to_response: 'credits' });

    if (d.backdrop_path) $('modal-backdrop').src = backdropUrl(d.backdrop_path);

    const poster = posterUrl(d.poster_path);
    if (poster) { $('modal-poster').src = poster; $('modal-poster').alt = d.title||d.name; $('modal-poster').style.display=''; }
    else $('modal-poster').style.display='none';

    $('modal-title').textContent = d.title || d.name || '';
    const orig = d.original_title || d.original_name || '';
    if (orig && orig !== (d.title||d.name)) $('modal-orig-title').textContent = orig;

    // pills
    let pills = '';
    if (d.vote_average > 0) pills += `<span class="pill pill-rating">${stars(d.vote_average)} ${d.vote_average.toFixed(1)}</span>`;
    const dateStr = d.release_date || d.first_air_date || '';
    if (dateStr) pills += `<span class="pill">${dateStr.slice(0,4)}</span>`;
    if (!isMovie && d.number_of_seasons) pills += `<span class="pill">${d.number_of_seasons} Season${d.number_of_seasons>1?'s':''}</span>`;
    const rt = isMovie ? fmtRuntime(d.runtime) : (d.episode_run_time?.[0] ? fmtRuntime(d.episode_run_time[0]) : '');
    if (rt) pills += `<span class="pill">${rt}</span>`;
    (d.genres||[]).slice(0,3).forEach(g => { pills += `<span class="pill">${esc(g.name)}</span>`; });
    if (!isMovie) pills += `<span class="pill" style="background:rgba(245,197,24,.15);color:var(--gold);font-weight:700">TV Show</span>`;
    $('modal-pills').innerHTML = pills;

    if (d.overview) $('modal-overview').textContent = d.overview;

    // meta
    const meta = [];
    const crew = d.credits?.crew || [];
    const dir  = crew.find(c => c.job === 'Director');
    const cre  = crew.find(c => c.job === 'Creator') || (d.created_by||[])[0];
    if (dir) meta.push(['Director', dir.name]);
    if (!isMovie && cre) meta.push(['Creator', cre.name]);
    if (d.status) meta.push(['Status', d.status]);
    if (isMovie && d.budget > 0) meta.push(['Budget', `$${(d.budget/1e6).toFixed(0)}M`]);
    if (isMovie && d.revenue > 0) meta.push(['Revenue', `$${(d.revenue/1e6).toFixed(0)}M`]);
    if (!isMovie && d.networks?.length) meta.push(['Network', d.networks[0].name]);
    $('modal-meta').innerHTML = meta.map(([l,v]) =>
      `<div><div class="meta-label">${l}</div><div class="meta-value">${esc(v)}</div></div>`
    ).join('');

    // cast
    const cast = (d.credits?.cast||[]).slice(0,6);
    if (cast.length) {
      $('modal-cast-label').style.display = '';
      $('modal-cast').innerHTML = cast.map(c => {
        const av = c.profile_path
          ? `<img class="cast-avatar" src="${TMDB_IMG}/w45${c.profile_path}" alt="${esc(c.name)}" loading="lazy"/>`
          : `<div class="cast-avatar" style="display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>`;
        return `<div class="cast-chip">${av}<div><div class="cast-name">${esc(c.name)}</div><div class="cast-char">${esc(c.character)}</div></div></div>`;
      }).join('');
    }

    // CTA
    const imdbId = d.imdb_id || (d.external_ids?.imdb_id);
    if (imdbId) {
      $('modal-cta').innerHTML =
        `<a class="btn-watch" href="${playUrl(imdbId)}" target="_blank" rel="noopener noreferrer">▶&nbsp; Watch Now</a>
         <a class="btn-imdb" href="https://www.imdb.com/title/${imdbId}/" target="_blank" rel="noopener noreferrer">IMDb ↗</a>`;
    } else {
      // For TV shows, fetch external IDs
      if (!isMovie) {
        try {
          const ext = await tmdb(`/tv/${id}/external_ids`);
          if (ext.imdb_id) {
            $('modal-cta').innerHTML =
              `<a class="btn-watch" href="${playUrl(ext.imdb_id)}" target="_blank" rel="noopener noreferrer">▶&nbsp; Watch Now</a>
               <a class="btn-imdb" href="https://www.imdb.com/title/${ext.imdb_id}/" target="_blank" rel="noopener noreferrer">IMDb ↗</a>`;
          } else {
            $('modal-cta').innerHTML = `<span class="btn-watch" style="opacity:.4;cursor:default">▶&nbsp; Watch Now</span>`;
          }
        } catch {
          $('modal-cta').innerHTML = `<span class="btn-watch" style="opacity:.4;cursor:default">▶&nbsp; Watch Now</span>`;
        }
      } else {
        $('modal-cta').innerHTML = `<span class="btn-watch" style="opacity:.4;cursor:default">▶&nbsp; Watch Now</span>`;
      }
    }
  } catch {
    $('modal-cta').innerHTML = '<p style="color:#e55;margin-top:16px">Could not load details. Please try again.</p>';
  } finally {
    $('modal-loading').classList.remove('show');
    $('modal-body').style.visibility = '';
  }
};

const closeModal = () => {
  $('modal-overlay').classList.remove('show');
  document.body.style.overflow = '';
};

// ══ INIT ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // MODE SWITCH (Movies / TV)
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode     = btn.dataset.mode;
      state.tab      = 'popular';
      state.genreId  = null;
      state.yearFilter = null;
      state.ratingMin  = null;
      state.page     = 1;
      state.query    = '';
      if ($('search-input')) $('search-input').value = '';
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="popular"]')?.classList.add('active');
      // hide upcoming for TV (show on_the_air instead)
      const upcomingBtn = document.querySelector('.tab-btn[data-tab="upcoming"]');
      if (upcomingBtn) upcomingBtn.textContent = state.mode === 'tv' ? '📡 On The Air' : '🎟 Upcoming';
      buildGenreFilters();
      buildYearFilters();
      buildRatingFilters();
      fetchContent();
    });
  });

  // TABS
  document.getElementById('tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.tab   = btn.dataset.tab;
    state.page  = 1;
    state.query = '';
    if ($('search-input')) $('search-input').value = '';
    fetchContent();
  });

  // GENRE FILTER
  document.getElementById('genre-filters')?.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const gid = parseInt(btn.dataset.genre);
    state.genreId = state.genreId === gid ? null : gid;
    state.page = 1;
    buildGenreFilters();
    fetchContent();
  });

  // YEAR FILTER
  document.getElementById('year-filters')?.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const y = btn.dataset.year === 'null' ? null : parseInt(btn.dataset.year);
    state.yearFilter = state.yearFilter === y ? null : y;
    state.page = 1;
    buildYearFilters();
    fetchContent();
  });

  // RATING FILTER
  document.getElementById('rating-filters')?.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const r = btn.dataset.rating === 'null' ? null : parseInt(btn.dataset.rating);
    state.ratingMin = state.ratingMin === r ? null : r;
    state.page = 1;
    buildRatingFilters();
    fetchContent();
  });

  // SEARCH
  document.getElementById('search-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const q = $('search-input').value.trim();
    if (!q) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    state.tab   = 'search';
    state.query = q;
    state.page  = 1;
    fetchContent();
  });

  // PAGINATION
  $('btn-prev')?.addEventListener('click', () => {
    if (state.page > 1) { state.page--; fetchContent(); window.scrollTo({top:0,behavior:'smooth'}); }
  });
  $('btn-next')?.addEventListener('click', () => {
    if (state.page < state.totalPages) { state.page++; fetchContent(); window.scrollTo({top:0,behavior:'smooth'}); }
  });

  // OPEN MODAL
  document.getElementById('grid')?.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) openModal(card.dataset.id, card.dataset.type);
  });
  document.getElementById('grid')?.addEventListener('keydown', e => {
    if (e.key==='Enter'||e.key===' ') {
      const card = e.target.closest('.card');
      if (card) { e.preventDefault(); openModal(card.dataset.id, card.dataset.type); }
    }
  });

  // CLOSE MODAL
  $('modal-close')?.addEventListener('click', closeModal);
  $('modal-overlay')?.addEventListener('click', e => { if(e.target===$('modal-overlay')) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

  // BOOT
  buildGenreFilters();
  buildYearFilters();
  buildRatingFilters();
  fetchContent();
});

// ══ FEATURED HERO BANNER ════════════════════════════
let heroMovies    = [];
let heroIndex     = 0;
let heroTimer     = null;
let heroImdbCache = {};

const heroEl = {
  section:  () => document.getElementById('featured-hero'),
  backdrop: () => document.getElementById('hero-backdrop'),
  content:  () => document.getElementById('hero-content'),
  title:    () => document.getElementById('hero-title'),
  meta:     () => document.getElementById('hero-meta'),
  overview: () => document.getElementById('hero-overview'),
  watchBtn: () => document.getElementById('hero-watch'),
  infoBtn:  () => document.getElementById('hero-info'),
  dots:     () => document.getElementById('hero-dots'),
};

const showHeroMovie = async (index) => {
  const m = heroMovies[index];
  if (!m) return;

  const backdrop = m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : '';
  const el = heroEl;

  // fade out
  if (el.backdrop()) el.backdrop().style.opacity = '0';
  if (el.content()) el.content().style.opacity  = '0';

  await new Promise(r => setTimeout(r, 400));

  if (el.title())    el.title().textContent    = m.title || m.name || '';
  if (el.overview()) el.overview().textContent = m.overview || '';

  // meta pills
  const year = (m.release_date || m.first_air_date || '').slice(0,4);
  const rating = m.vote_average > 0 ? `★ ${m.vote_average.toFixed(1)}` : '';
  if (el.meta()) {
    el.meta().innerHTML = [
      year    ? `<span style="background:rgba(255,255,255,.1);color:#ccc;border-radius:20px;font-size:13px;padding:3px 12px">${year}</span>` : '',
      rating  ? `<span style="color:#f5c518;font-weight:700;font-size:14px">${rating}</span>` : '',
      m.adult === false ? `<span style="background:rgba(255,255,255,.08);color:#aaa;border-radius:4px;font-size:11px;font-weight:700;padding:2px 8px;border:1px solid rgba(255,255,255,.15)">HD</span>` : '',
    ].join('');
  }

  // set backdrop
  if (backdrop && el.backdrop()) {
    el.backdrop().style.backgroundImage = `url('${backdrop}')`;
  }

  // dots
  if (el.dots()) {
    el.dots().innerHTML = heroMovies.slice(0,8).map((_,i) =>
      `<div style="width:${i===index?'22px':'6px'};height:6px;border-radius:3px;background:${i===index?'#f5c518':'rgba(255,255,255,.3)'};transition:all .3s;cursor:pointer;" data-dot="${i}"></div>`
    ).join('');
  }

  // fade in
  await new Promise(r => setTimeout(r, 50));
  if (el.backdrop()) el.backdrop().style.opacity = '1';
  if (el.content()) el.content().style.opacity  = '1';

  // watch button — fetch imdb id
  const watchBtn = el.watchBtn();
  if (watchBtn) {
    watchBtn.onclick = async () => {
      if (heroImdbCache[m.id]) {
        window.open(playUrl(heroImdbCache[m.id]), '_blank');
        return;
      }
      watchBtn.textContent = '⏳ Loading…';
      try {
        const d = await tmdb(`/movie/${m.id}`);
        if (d.imdb_id) {
          heroImdbCache[m.id] = d.imdb_id;
          window.open(playUrl(d.imdb_id), '_blank');
        }
      } catch {}
      watchBtn.innerHTML = '▶&nbsp; Watch Now';
    };
  }

  // info button
  const infoBtn = el.infoBtn();
  if (infoBtn) {
    infoBtn.onclick = () => openModal(m.id, 'movie');
  }
};

const startHeroRotation = () => {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    heroIndex = (heroIndex + 1) % Math.min(heroMovies.length, 8);
    showHeroMovie(heroIndex);
  }, 7000);
};

const initHero = async () => {
  try {
    const data = await tmdb('/trending/movie/day');
    heroMovies = (data.results || []).filter(m => m.backdrop_path).slice(0, 8);
    if (!heroMovies.length) return;

    // dot clicks
    document.getElementById('hero-dots')?.addEventListener('click', e => {
      const dot = e.target.closest('[data-dot]');
      if (!dot) return;
      heroIndex = parseInt(dot.dataset.dot);
      showHeroMovie(heroIndex);
      startHeroRotation();
    });

    // section click → open modal
    document.getElementById('featured-hero')?.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      openModal(heroMovies[heroIndex].id, 'movie');
    });

    showHeroMovie(0);
    startHeroRotation();
  } catch(e) {
    // hero fails silently — rest of page still works
    const sec = document.getElementById('featured-hero');
    if (sec) sec.style.display = 'none';
  }
};

// call initHero on DOMContentLoaded (append to existing listener)
document.addEventListener('DOMContentLoaded', () => {
  initHero();
});
