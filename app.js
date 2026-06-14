// ══ CONFIG ══════════════════════════════════
const TMDB_KEY  = 'f19bed2c1f8c6c9df52845b6669e0f27';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p';

// ══ HELPERS ═════════════════════════════════
const $   = (id) => document.getElementById(id);
const esc = (s)  => (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const tmdb = async (path, params={}) => {
  const qs = new URLSearchParams({api_key: TMDB_KEY, ...params});
  const r  = await fetch(`${TMDB_BASE}${path}?${qs}`);
  if (!r.ok) throw new Error(r.status);
  return r.json();
};
const playUrl     = (id)   => `https://playimdb.com/title/${id}/`;
const posterUrl   = (p,s)  => p ? `${TMDB_IMG}/${s||'w342'}${p}` : '';
const backdropUrl = (p)    => p ? `${TMDB_IMG}/w1280${p}` : '';
const fmtRuntime  = (m)    => { if(!m) return ''; const h=Math.floor(m/60),mn=m%60; return h?`${h}h ${mn}m`:`${mn}m`; };
const stars       = (v)    => { const n=Math.round(v/2); return '★'.repeat(n)+'☆'.repeat(5-n); };

// ══ GENRES ══════════════════════════════════
const GENRES = {
  movie: [{id:28,name:'Action'},{id:12,name:'Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},{id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},{id:10751,name:'Family'},{id:14,name:'Fantasy'},{id:36,name:'History'},{id:27,name:'Horror'},{id:10402,name:'Music'},{id:9648,name:'Mystery'},{id:10749,name:'Romance'},{id:878,name:'Sci-Fi'},{id:53,name:'Thriller'},{id:10752,name:'War'},{id:37,name:'Western'}],
  tv:    [{id:10759,name:'Action & Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},{id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},{id:10751,name:'Family'},{id:10762,name:'Kids'},{id:9648,name:'Mystery'},{id:10765,name:'Sci-Fi & Fantasy'},{id:10766,name:'Soap'},{id:10767,name:'Talk'},{id:10768,name:'War & Politics'},{id:37,name:'Western'}]
};

// ══ STATE ════════════════════════════════════
const S = { mode:'movie', tab:'popular', genreId:null, yearFilter:null, ratingMin:null, page:1, totalPages:1, query:'' };

// ══ STATES ══════════════════════════════════
const showOnly = (which) => {
  ['spinner','empty-state','err-state'].forEach(id => $(id).classList.remove('show'));
  if (which) $(which).classList.add('show');
};

// ══ FILTERS ═════════════════════════════════
const buildFilters = () => {
  const genres = GENRES[S.mode];
  $('genre-filters').innerHTML = `<div class="filter-chips">${genres.map(g=>`<button class="filter-btn${S.genreId===g.id?' active':''}" data-genre="${g.id}">${esc(g.name)}</button>`).join('')}</div>`;

  const yr = new Date().getFullYear();
  const yLabels=['All',String(yr),String(yr-1),String(yr-2),String(yr-3),String(yr-4)];
  $('year-filters').innerHTML = `<div class="filter-chips">${[null,yr,yr-1,yr-2,yr-3,yr-4].map((y,i)=>`<button class="filter-btn${S.yearFilter===y?' active':''}" data-year="${y}">${yLabels[i]}</button>`).join('')}</div>`;

  $('rating-filters').innerHTML = `<div class="filter-chips">${[null,9,8,7,6].map((r,i)=>`<button class="filter-btn${S.ratingMin===r?' active':''}" data-rating="${r}">${['All','9+ ★','8+ ★','7+ ★','6+ ★'][i]}</button>`).join('')}</div>`;

  const hasFilter = S.genreId || S.yearFilter || S.ratingMin;
  $('clear-filters').style.display = hasFilter ? '' : 'none';
};

// ══ RENDER ═══════════════════════════════════
const renderGrid = (items) => {
  if (!items.length) { $('grid').innerHTML=''; showOnly('empty-state'); $('pagination').classList.remove('show'); $('section-count').textContent=''; return; }
  showOnly(null);
  $('section-count').textContent = `(${items.length} shown)`;
  $('grid').innerHTML = items.map(m => {
    const title  = m.title || m.name || '';
    const year   = (m.release_date||m.first_air_date||'').slice(0,4);
    const poster = posterUrl(m.poster_path);
    const rating = m.vote_average>0 ? `<div class="card-rating">★ ${m.vote_average.toFixed(1)}</div>` : '';
    const badge  = S.mode==='tv' ? `<div class="card-type">TV</div>` : '';
    const img    = poster ? `<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy"/>` : `<div class="card-no-poster">🎬</div>`;
    return `<div class="card" tabindex="0" role="button" data-id="${m.id}" data-type="${S.mode}">
      <div class="card-poster">${img}${rating}${badge}<div class="card-overlay"><div class="play-btn">▶</div></div></div>
      <div class="card-info"><div class="card-title">${esc(title)}</div><div class="card-year">${year}</div></div>
    </div>`;
  }).join('');
  $('pagination').classList.add('show');
  $('page-info').textContent = `Page ${S.page} of ${S.totalPages.toLocaleString()}`;
  $('btn-prev').disabled = S.page<=1;
  $('btn-next').disabled = S.page>=S.totalPages;
};

// ══ FETCH ════════════════════════════════════
const fetchContent = async () => {
  showOnly('spinner'); $('grid').innerHTML=''; $('pagination').classList.remove('show');
  const isMovie = S.mode==='movie';
  const params  = { page:S.page, language:'en-US' };
  if (S.genreId)    params.with_genres           = S.genreId;
  if (S.yearFilter) params[isMovie?'primary_release_year':'first_air_date_year'] = S.yearFilter;
  if (S.ratingMin)  params['vote_average.gte']   = S.ratingMin;

  // update section title
  const modeLabel = isMovie ? 'Movies' : 'TV Shows';
  const tabLabels = {popular:'Popular',trending:'Trending',top_rated:'Top Rated',upcoming:isMovie?'Upcoming':'On The Air',search:'Search Results'};
  $('section-title').textContent = (tabLabels[S.tab]||'') + ' ' + modeLabel;

  try {
    let data;
    const base = isMovie ? '/movie' : '/tv';
    if      (S.tab==='search'&&S.query)  data = await tmdb(`/search/${isMovie?'movie':'tv'}`, {...params,query:S.query,include_adult:false});
    else if (S.tab==='trending')         data = await tmdb(`/trending/${isMovie?'movie':'tv'}/week`, params);
    else if (S.tab==='top_rated')        data = await tmdb(`${base}/top_rated`, params);
    else if (S.tab==='upcoming'&&isMovie)data = await tmdb(`${base}/upcoming`, params);
    else if (S.tab==='upcoming'&&!isMovie)data= await tmdb(`${base}/on_the_air`, params);
    else if (S.genreId||S.yearFilter||S.ratingMin) data = await tmdb(`/discover/${isMovie?'movie':'tv'}`, {...params,sort_by:'popularity.desc'});
    else                                 data = await tmdb(`${base}/popular`, params);
    S.totalPages = Math.min(data.total_pages||1,500);
    renderGrid(data.results||[]);
  } catch { showOnly('err-state'); }
};

// ══ MODAL ════════════════════════════════════
const openModal = async (id, type) => {
  const isMovie = type==='movie';
  $('modal-backdrop').src=''; $('modal-poster').src='';
  ['modal-title','modal-orig-title','modal-overview'].forEach(i=>$(i).textContent='');
  ['modal-pills','modal-meta','modal-cast','modal-cta'].forEach(i=>$(i).innerHTML='');
  $('modal-cast-label').style.display='none';
  $('modal-loading').classList.add('show');
  $('modal-body').style.visibility='hidden';
  $('modal-overlay').classList.add('show');
  document.body.style.overflow='hidden';

  try {
    const d = await tmdb(`/${isMovie?'movie':'tv'}/${id}`, {append_to_response:'credits'});
    if (d.backdrop_path) $('modal-backdrop').src = backdropUrl(d.backdrop_path);
    const poster = posterUrl(d.poster_path);
    if (poster) { $('modal-poster').src=poster; $('modal-poster').alt=d.title||d.name; $('modal-poster').style.display=''; }
    else $('modal-poster').style.display='none';

    $('modal-title').textContent = d.title||d.name||'';
    const orig = d.original_title||d.original_name||'';
    if (orig&&orig!==(d.title||d.name)) $('modal-orig-title').textContent=orig;

    let pills='';
    if (d.vote_average>0) pills+=`<span class="pill pill-rating">${stars(d.vote_average)} ${d.vote_average.toFixed(1)}</span>`;
    const dateStr=d.release_date||d.first_air_date||'';
    if (dateStr) pills+=`<span class="pill">${dateStr.slice(0,4)}</span>`;
    if (!isMovie&&d.number_of_seasons) pills+=`<span class="pill">${d.number_of_seasons} Season${d.number_of_seasons>1?'s':''}</span>`;
    const rt=isMovie?fmtRuntime(d.runtime):(d.episode_run_time?.[0]?fmtRuntime(d.episode_run_time[0]):'');
    if (rt) pills+=`<span class="pill">${rt}</span>`;
    (d.genres||[]).slice(0,3).forEach(g=>{pills+=`<span class="pill">${esc(g.name)}</span>`;});
    $('modal-pills').innerHTML=pills;

    if (d.overview) $('modal-overview').textContent=d.overview;

    const crew=d.credits?.crew||[];
    const dir=crew.find(c=>c.job==='Director');
    const cre=(d.created_by||[])[0];
    const meta=[];
    if (dir) meta.push(['Director',dir.name]);
    if (!isMovie&&cre) meta.push(['Creator',cre.name]);
    if (d.status) meta.push(['Status',d.status]);
    if (isMovie&&d.budget>0) meta.push(['Budget',`$${(d.budget/1e6).toFixed(0)}M`]);
    if (isMovie&&d.revenue>0) meta.push(['Revenue',`$${(d.revenue/1e6).toFixed(0)}M`]);
    if (!isMovie&&d.networks?.length) meta.push(['Network',d.networks[0].name]);
    $('modal-meta').innerHTML=meta.map(([l,v])=>`<div><div class="meta-label">${l}</div><div class="meta-value">${esc(v)}</div></div>`).join('');

    const cast=(d.credits?.cast||[]).slice(0,6);
    if (cast.length) {
      $('modal-cast-label').style.display='';
      $('modal-cast').innerHTML=cast.map(c=>{
        const av=c.profile_path?`<img class="cast-avatar" src="${TMDB_IMG}/w45${c.profile_path}" alt="${esc(c.name)}" loading="lazy"/>`:`<div class="cast-avatar" style="display:flex;align-items:center;justify-content:center;font-size:13px">👤</div>`;
        return `<div class="cast-chip">${av}<div><div class="cast-name">${esc(c.name)}</div><div class="cast-char">${esc(c.character)}</div></div></div>`;
      }).join('');
    }

    let imdbId = d.imdb_id;
    if (!isMovie&&!imdbId) { try { const ext=await tmdb(`/tv/${id}/external_ids`); imdbId=ext.imdb_id; } catch{} }
    if (imdbId) {
      $('modal-cta').innerHTML=`<a class="btn-watch" href="${playUrl(imdbId)}" target="_blank" rel="noopener noreferrer">▶&nbsp; Watch Now</a><a class="btn-imdb" href="https://www.imdb.com/title/${imdbId}/" target="_blank" rel="noopener noreferrer">IMDb ↗</a>`;
    } else {
      $('modal-cta').innerHTML=`<span class="btn-watch" style="opacity:.4;cursor:default">▶&nbsp; Watch Now</span>`;
    }
  } catch {
    $('modal-cta').innerHTML='<p style="color:#e55;margin-top:16px">Could not load details. Please try again.</p>';
  } finally {
    $('modal-loading').classList.remove('show');
    $('modal-body').style.visibility='';
  }
};

const closeModal = () => { $('modal-overlay').classList.remove('show'); document.body.style.overflow=''; };

// ══ HERO ═════════════════════════════════════
let heroMovies=[], heroIndex=0, heroTimer=null, heroTouch={x:0,y:0};

const showHero = async (idx) => {
  const m = heroMovies[idx];
  if (!m) return;
  heroIndex = idx;

  // slide
  $('hero-slides').style.transform = `translateX(-${idx*100}%)`;

  // content
  $('hero-title').textContent = m.title||m.name||'';
  $('hero-overview').textContent = m.overview||'';
  const year=(m.release_date||m.first_air_date||'').slice(0,4);
  $('hero-meta').innerHTML=[
    year?`<span class="hero-pill">${year}</span>`:'',
    m.vote_average>0?`<span class="hero-rating">★ ${m.vote_average.toFixed(1)}</span>`:'',
    `<span class="hero-pill">HD</span>`,
  ].join('');

  // dots
  $('hero-dots').innerHTML=heroMovies.slice(0,8).map((_,i)=>
    `<button class="hero-dot${i===idx?' active':''}" data-dot="${i}" aria-label="Slide ${i+1}"></button>`
  ).join('');

  // watch btn
  $('hero-watch').onclick = async () => {
    try {
      const d=await tmdb(`/movie/${m.id}`);
      if (d.imdb_id) window.open(playUrl(d.imdb_id),'_blank');
    } catch{}
  };
  $('hero-info').onclick = () => openModal(m.id,'movie');
};

const nextHero = () => showHero((heroIndex+1) % Math.min(heroMovies.length,8));
const prevHero = () => showHero((heroIndex-1+Math.min(heroMovies.length,8)) % Math.min(heroMovies.length,8));

const startHeroTimer = () => { clearInterval(heroTimer); heroTimer=setInterval(nextHero,6000); };

const initHero = async () => {
  try {
    const data = await tmdb('/trending/movie/day');
    heroMovies = (data.results||[]).filter(m=>m.backdrop_path).slice(0,8);
    if (!heroMovies.length) { $('featured-hero').style.display='none'; return; }

    // build slides
    $('hero-slides').innerHTML = heroMovies.map(m=>
      `<div class="hero-slide" style="background-image:url('${backdropUrl(m.backdrop_path)}')"></div>`
    ).join('');
    $('hero-slides').style.width = `${heroMovies.length*100}%`;
    $('hero-slides').querySelectorAll('.hero-slide').forEach(s=>{ s.style.width=`${100/heroMovies.length}%`; });

    showHero(0);
    startHeroTimer();

    // dot clicks
    $('hero-dots').addEventListener('click', e=>{
      const btn=e.target.closest('[data-dot]');
      if (!btn) return;
      showHero(parseInt(btn.dataset.dot));
      startHeroTimer();
    });

    // arrow buttons
    $('hero-prev').addEventListener('click', ()=>{ prevHero(); startHeroTimer(); });
    $('hero-next').addEventListener('click', ()=>{ nextHero(); startHeroTimer(); });

    // touch swipe
    const hero=$('featured-hero');
    hero.addEventListener('touchstart', e=>{ heroTouch.x=e.touches[0].clientX; heroTouch.y=e.touches[0].clientY; },{passive:true});
    hero.addEventListener('touchend', e=>{
      const dx=e.changedTouches[0].clientX-heroTouch.x;
      const dy=Math.abs(e.changedTouches[0].clientY-heroTouch.y);
      if (Math.abs(dx)>40&&dy<60) { dx<0?nextHero():prevHero(); startHeroTimer(); }
    });

    // keyboard
    document.addEventListener('keydown', e=>{
      if ($('modal-overlay').classList.contains('show')) return;
      if (e.key==='ArrowLeft') { prevHero(); startHeroTimer(); }
      if (e.key==='ArrowRight') { nextHero(); startHeroTimer(); }
    });

  } catch { $('featured-hero').style.display='none'; }
};

// ══ EVENTS ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      S.mode=btn.dataset.mode; S.tab='popular'; S.genreId=null; S.yearFilter=null; S.ratingMin=null; S.page=1; S.query='';
      $('search-input').value='';
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="popular"]').classList.add('active');
      const upBtn=document.querySelector('.tab-btn[data-tab="upcoming"]');
      if (upBtn) upBtn.textContent=S.mode==='tv'?'📡 On The Air':'🎟 Upcoming';
      // close all filter panels
      document.querySelectorAll('.filter-panel').forEach(p=>p.classList.remove('open'));
      document.querySelectorAll('.filter-toggle').forEach(t=>t.classList.remove('open'));
      buildFilters();
      fetchContent();
    });
  });

  // Nav TV link
  $('nav-tv')?.addEventListener('click', e=>{
    e.preventDefault();
    document.querySelector('.mode-btn[data-mode="tv"]').click();
  });

  // Tab buttons
  $('content-tabs').addEventListener('click', e=>{
    const btn=e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    S.tab=btn.dataset.tab; S.page=1; S.query='';
    $('search-input').value='';
    fetchContent();
  });

  // Filter toggles
  [['genre-toggle','genre-panel'],['year-toggle','year-panel'],['rating-toggle','rating-panel']].forEach(([tid,pid])=>{
    $(tid)?.addEventListener('click', ()=>{
      const panel=$(pid), toggle=$(tid);
      const isOpen=panel.classList.contains('open');
      // close all
      document.querySelectorAll('.filter-panel').forEach(p=>p.classList.remove('open'));
      document.querySelectorAll('.filter-toggle').forEach(t=>t.classList.remove('open'));
      if (!isOpen) { panel.classList.add('open'); toggle.classList.add('open'); }
    });
  });

  // Genre filter clicks
  $('genre-filters').addEventListener('click', e=>{
    const btn=e.target.closest('.filter-btn');
    if (!btn) return;
    const gid=parseInt(btn.dataset.genre);
    S.genreId=S.genreId===gid?null:gid; S.page=1;
    buildFilters(); fetchContent();
  });

  // Year filter
  $('year-filters').addEventListener('click', e=>{
    const btn=e.target.closest('.filter-btn');
    if (!btn) return;
    const y=btn.dataset.year==='null'?null:parseInt(btn.dataset.year);
    S.yearFilter=S.yearFilter===y?null:y; S.page=1;
    buildFilters(); fetchContent();
  });

  // Rating filter
  $('rating-filters').addEventListener('click', e=>{
    const btn=e.target.closest('.filter-btn');
    if (!btn) return;
    const r=btn.dataset.rating==='null'?null:parseInt(btn.dataset.rating);
    S.ratingMin=S.ratingMin===r?null:r; S.page=1;
    buildFilters(); fetchContent();
  });

  // Clear filters
  $('clear-filters').addEventListener('click', ()=>{
    S.genreId=null; S.yearFilter=null; S.ratingMin=null; S.page=1;
    document.querySelectorAll('.filter-panel').forEach(p=>p.classList.remove('open'));
    document.querySelectorAll('.filter-toggle').forEach(t=>t.classList.remove('open'));
    buildFilters(); fetchContent();
  });

  // Search
  $('search-form').addEventListener('submit', e=>{
    e.preventDefault();
    const q=$('search-input').value.trim();
    if (!q) return;
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    S.tab='search'; S.query=q; S.page=1;
    fetchContent();
  });

  // Pagination
  $('btn-prev').addEventListener('click', ()=>{ if(S.page>1){S.page--;fetchContent();window.scrollTo({top:0,behavior:'smooth'});} });
  $('btn-next').addEventListener('click', ()=>{ if(S.page<S.totalPages){S.page++;fetchContent();window.scrollTo({top:0,behavior:'smooth'});} });

  // Grid click → modal
  $('grid').addEventListener('click', e=>{ const c=e.target.closest('.card'); if(c) openModal(c.dataset.id,c.dataset.type); });
  $('grid').addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ const c=e.target.closest('.card'); if(c){e.preventDefault();openModal(c.dataset.id,c.dataset.type);} } });

  // Modal close
  $('modal-close').addEventListener('click', closeModal);
  $('modal-overlay').addEventListener('click', e=>{ if(e.target===$('modal-overlay')) closeModal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

  // Boot
  buildFilters();
  fetchContent();
  initHero();
});
