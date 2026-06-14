// ══ CONFIG ══════════════════════════════════
const TMDB_KEY  = 'f19bed2c1f8c6c9df52845b6669e0f27';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p';

// ══ HELPERS ═════════════════════════════════
const $   = (id) => document.getElementById(id);
const esc = (s)  => String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const tmdb = async (path, params={}) => {
  const qs = new URLSearchParams({api_key:TMDB_KEY,...params});
  const r  = await fetch(`${TMDB_BASE}${path}?${qs}`);
  if (!r.ok) throw new Error(r.status);
  return r.json();
};
const playUrl     = (id) => `https://playimdb.com/title/${id}/`;
const posterUrl   = (p,s) => p ? `${TMDB_IMG}/${s||'w342'}${p}` : '';
const backdropUrl = (p)   => p ? `${TMDB_IMG}/w1280${p}` : '';
const fmtRuntime  = (m)   => { if(!m) return ''; const h=Math.floor(m/60),mn=m%60; return h?`${h}h ${mn}m`:`${mn}m`; };
const stars       = (v)   => { const n=Math.round(v/2); return '★'.repeat(n)+'☆'.repeat(5-n); };

// ══ GENRES ══════════════════════════════════
const GENRES = {
  movie:[{id:28,name:'Action'},{id:12,name:'Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},{id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},{id:10751,name:'Family'},{id:14,name:'Fantasy'},{id:36,name:'History'},{id:27,name:'Horror'},{id:10402,name:'Music'},{id:9648,name:'Mystery'},{id:10749,name:'Romance'},{id:878,name:'Sci-Fi'},{id:53,name:'Thriller'},{id:10752,name:'War'},{id:37,name:'Western'}],
  tv:[{id:10759,name:'Action & Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},{id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},{id:10751,name:'Family'},{id:10762,name:'Kids'},{id:9648,name:'Mystery'},{id:10765,name:'Sci-Fi & Fantasy'},{id:10766,name:'Soap'},{id:10768,name:'War & Politics'},{id:37,name:'Western'}]
};

// ══ STATE ════════════════════════════════════
const S = {mode:'movie',tab:'popular',genreId:null,year:null,rating:null,page:1,totalPages:1,query:''};
// pending filter state (applied only on Apply click)
const FP = {genreId:null,year:null,rating:null};

// ══ RECENTLY VIEWED ══════════════════════════
const RECENT_KEY = 'cp_recent';
const getRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]'); } catch{return[];} };
const addRecent = (item) => {
  let arr = getRecent().filter(i=>i.id!==item.id);
  arr.unshift(item);
  arr = arr.slice(0,20);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr)); } catch{}
  renderRecent();
};
const renderRecent = () => {
  const arr = getRecent();
  const sec = $('recent-section');
  if (!arr.length) { if(sec) sec.style.display='none'; return; }
  if(sec) sec.style.display='';
  const grid = $('recent-grid');
  if (!grid) return;
  grid.innerHTML = arr.map(item => {
    const img = item.poster
      ? `<img src="${esc(item.poster)}" alt="${esc(item.title)}" loading="lazy"/>`
      : `<div class="mini-noposter">No img</div>`;
    return `<div class="mini-card" data-id="${item.id}" data-type="${item.type}" tabindex="0" role="button" aria-label="${esc(item.title)}">
      ${img}<div class="mini-title">${esc(item.title)}</div>
    </div>`;
  }).join('');
};

// ══ FILTER CHIPS ════════════════════════════
const buildFilterChips = () => {
  const yr = new Date().getFullYear();
  // genres
  $('genre-chips').innerHTML = GENRES[S.mode].map(g =>
    `<button class="chip${FP.genreId===g.id?' active':''}" data-genre="${g.id}">${esc(g.name)}</button>`
  ).join('');
  // years
  const yrs = [null,yr,yr-1,yr-2,yr-3,yr-4];
  const ylbls = ['All','This Year',String(yr-1),String(yr-2),String(yr-3),String(yr-4)];
  $('year-chips').innerHTML = yrs.map((y,i) =>
    `<button class="chip${FP.year===y?' active':''}" data-year="${y}">${ylbls[i]}</button>`
  ).join('');
  // ratings
  const rs = [null,9,8,7,6];
  const rlbls = ['All','9+ ★','8+ ★','7+ ★','6+ ★'];
  $('rating-chips').innerHTML = rs.map((r,i) =>
    `<button class="chip${FP.rating===r?' active':''}" data-rating="${r}">${rlbls[i]}</button>`
  ).join('');
  // filter button active state
  const hasFilter = S.genreId||S.year||S.rating;
  $('filter-btn').classList.toggle('active', !!hasFilter);
};

// ══ SECTION TITLE ════════════════════════════
const updateTitle = () => {
  const mode = S.mode==='movie'?'Movies':'TV Shows';
  const tabs = {popular:'Popular',trending:'Trending',top_rated:'Top Rated',upcoming:S.mode==='movie'?'Upcoming':'On The Air',search:'Search Results'};
  $('section-title').textContent = (tabs[S.tab]||'') + ' ' + mode;
};

// ══ RENDER GRID ═════════════════════════════
const showState = (which) => {
  $('spinner').style.display    = which==='spinner' ? 'block' : 'none';
  $('empty-state').style.display= which==='empty'   ? 'block' : 'none';
  $('err-state').style.display  = which==='err'     ? 'block' : 'none';
};

const renderGrid = (items) => {
  if (!items.length) { $('grid').innerHTML=''; showState('empty'); $('pagination').style.display='none'; $('section-count').textContent=''; return; }
  showState(null);
  $('section-count').textContent = `${items.length} titles`;
  $('grid').innerHTML = items.map(m => {
    const title = m.title||m.name||'';
    const year  = (m.release_date||m.first_air_date||'').slice(0,4);
    const poster= posterUrl(m.poster_path);
    const rating= m.vote_average>0 ? `<div class="card-rating">★ ${m.vote_average.toFixed(1)}</div>` : '';
    const badge = S.mode==='tv' ? `<div class="card-type">TV</div>` : '';
    const img   = poster ? `<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy"/>` : `<div class="card-noposter">No Poster</div>`;
    return `<div class="card" tabindex="0" role="button" data-id="${m.id}" data-type="${S.mode}">
      <div class="card-poster">${img}${rating}${badge}<div class="card-overlay"><div class="card-play">▶</div></div></div>
      <div class="card-info"><div class="card-title">${esc(title)}</div><div class="card-year">${year}</div></div>
    </div>`;
  }).join('');
  $('pagination').style.display = 'flex';
  $('page-info').textContent = `Page ${S.page} of ${S.totalPages.toLocaleString()}`;
  $('btn-prev').disabled = S.page<=1;
  $('btn-next').disabled = S.page>=S.totalPages;
};

// ══ FETCH ════════════════════════════════════
const fetchContent = async () => {
  showState('spinner'); $('grid').innerHTML=''; $('pagination').style.display='none';
  updateTitle();
  const isMovie = S.mode==='movie';
  const params  = {page:S.page,language:'en-US'};
  if (S.genreId) params.with_genres = S.genreId;
  if (S.year)    params[isMovie?'primary_release_year':'first_air_date_year'] = S.year;
  if (S.rating)  params['vote_average.gte'] = S.rating;
  try {
    let data;
    const base = isMovie?'/movie':'/tv';
    if      (S.tab==='search'&&S.query) data = await tmdb(`/search/${isMovie?'movie':'tv'}`,{...params,query:S.query,include_adult:false});
    else if (S.tab==='trending')        data = await tmdb(`/trending/${isMovie?'movie':'tv'}/week`,params);
    else if (S.tab==='top_rated')       data = await tmdb(`${base}/top_rated`,params);
    else if (S.tab==='upcoming'&&isMovie)  data = await tmdb(`${base}/upcoming`,params);
    else if (S.tab==='upcoming'&&!isMovie) data = await tmdb(`${base}/on_the_air`,params);
    else if (S.genreId||S.year||S.rating)  data = await tmdb(`/discover/${isMovie?'movie':'tv'}`,{...params,sort_by:'popularity.desc'});
    else                                   data = await tmdb(`${base}/popular`,params);
    S.totalPages = Math.min(data.total_pages||1,500);
    renderGrid(data.results||[]);
  } catch { showState('err'); }
};

// ══ MODAL ════════════════════════════════════
const openModal = async (id, type) => {
  const isMovie = type==='movie';
  // reset
  $('modal-backdrop').src=''; $('modal-poster').src=''; $('modal-poster').style.display='none';
  ['modal-title','modal-orig','modal-overview'].forEach(i=>$(i).textContent='');
  ['modal-pills','modal-meta','modal-cast','modal-cta'].forEach(i=>$(i).innerHTML='');
  $('modal-cast-wrap').style.display='none';
  $('modal-loading').style.display='flex';
  $('modal-body').style.visibility='hidden';
  $('modal-overlay').style.display='flex';
  document.body.style.overflow='hidden';

  try {
    const d = await tmdb(`/${isMovie?'movie':'tv'}/${id}`,{append_to_response:'credits'});

    // backdrop
    if (d.backdrop_path) $('modal-backdrop').src = backdropUrl(d.backdrop_path);

    // poster
    const poster = posterUrl(d.poster_path);
    if (poster) { $('modal-poster').src=poster; $('modal-poster').alt=d.title||d.name||''; $('modal-poster').style.display=''; }

    // title
    $('modal-title').textContent = d.title||d.name||'';
    const orig = d.original_title||d.original_name||'';
    if (orig && orig!==(d.title||d.name)) $('modal-orig').textContent = orig;

    // pills
    let pills='';
    if (d.vote_average>0) pills+=`<span class="pill pill-r">${stars(d.vote_average)} ${d.vote_average.toFixed(1)}</span>`;
    const ds=d.release_date||d.first_air_date||'';
    if (ds) pills+=`<span class="pill">${ds.slice(0,4)}</span>`;
    if (!isMovie&&d.number_of_seasons) pills+=`<span class="pill">${d.number_of_seasons} Season${d.number_of_seasons>1?'s':''}</span>`;
    const rt=isMovie?fmtRuntime(d.runtime):(d.episode_run_time?.[0]?fmtRuntime(d.episode_run_time[0]):'');
    if (rt) pills+=`<span class="pill">${rt}</span>`;
    (d.genres||[]).slice(0,3).forEach(g=>{ pills+=`<span class="pill">${esc(g.name)}</span>`; });
    $('modal-pills').innerHTML=pills;

    // overview
    if (d.overview) $('modal-overview').textContent=d.overview;

    // meta
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
    $('modal-meta').innerHTML=meta.map(([l,v])=>`<div><div class="meta-label">${l}</div><div class="meta-value">${esc(String(v))}</div></div>`).join('');

    // cast
    const cast=(d.credits?.cast||[]).slice(0,6);
    if (cast.length) {
      $('modal-cast-wrap').style.display='';
      $('modal-cast').innerHTML=cast.map(c=>{
        const av=c.profile_path
          ?`<img class="cast-av" src="${TMDB_IMG}/w45${c.profile_path}" alt="${esc(c.name)}" loading="lazy"/>`
          :`<div class="cast-av-ph">👤</div>`;
        return `<div class="cast-chip">${av}<div><div class="cast-name">${esc(c.name)}</div><div class="cast-char">${esc(c.character)}</div></div></div>`;
      }).join('');
    }

    // imdb id + CTA
    let imdbId = d.imdb_id;
    if (!isMovie&&!imdbId) { try { const ext=await tmdb(`/tv/${id}/external_ids`); imdbId=ext.imdb_id; } catch{} }
    if (imdbId) {
      $('modal-cta').innerHTML=`<a class="btn-watch" href="${playUrl(imdbId)}" target="_blank" rel="noopener noreferrer">Watch Now</a><a class="btn-imdb" href="https://www.imdb.com/title/${imdbId}/" target="_blank" rel="noopener noreferrer">IMDb ↗</a>`;
    } else {
      $('modal-cta').innerHTML=`<span class="btn-watch" style="opacity:.35;cursor:default">Watch Now</span>`;
    }

    // save to recently viewed
    addRecent({id, type, title:d.title||d.name||'', poster:posterUrl(d.poster_path,'w185')});

  } catch {
    $('modal-cta').innerHTML='<p style="color:#e55;margin-top:14px">Could not load details. Try again.</p>';
  } finally {
    $('modal-loading').style.display='none';
    $('modal-body').style.visibility='';
  }
};

const closeModal = () => { $('modal-overlay').style.display='none'; document.body.style.overflow=''; };

// ══ HERO ═════════════════════════════════════
let heroMovies=[], heroIdx=0, heroTimer=null;
let touchStartX=0, touchStartY=0, isDragging=false;

const showHeroSlide = (idx) => {
  if (!heroMovies.length) return;
  heroIdx = (idx+heroMovies.length)%heroMovies.length;
  const m = heroMovies[heroIdx];

  // slide track
  $('hero-track').style.transform=`translateX(-${heroIdx*100}%)`;

  // content
  $('hero-title').textContent = m.title||m.name||'';
  $('hero-overview').textContent = m.overview||'';
  const year=(m.release_date||m.first_air_date||'').slice(0,4);
  $('hero-meta').innerHTML=[
    year?`<span class="h-pill">${year}</span>`:'',
    m.vote_average>0?`<span class="h-rating">★ ${m.vote_average.toFixed(1)}</span>`:'',
    `<span class="h-pill">HD</span>`,
  ].join('');

  // dots
  $('hero-dots').innerHTML=heroMovies.map((_,i)=>
    `<button class="h-dot${i===heroIdx?' active':''}" data-dot="${i}" aria-label="Slide ${i+1}"></button>`
  ).join('');

  // buttons
  $('hero-watch-btn').onclick = async () => {
    $('hero-watch-btn').textContent='Loading…';
    try {
      const d=await tmdb(`/movie/${m.id}`);
      if (d.imdb_id) window.open(playUrl(d.imdb_id),'_blank');
    } catch{}
    $('hero-watch-btn').textContent='Watch Now';
  };
  $('hero-more-btn').onclick = () => openModal(m.id,'movie');
};

const heroNext = () => { showHeroSlide(heroIdx+1); resetTimer(); };
const heroPrev = () => { showHeroSlide(heroIdx-1); resetTimer(); };
const resetTimer = () => { clearInterval(heroTimer); heroTimer=setInterval(heroNext,6000); };

const initHero = async () => {
  try {
    const data=await tmdb('/trending/movie/day');
    heroMovies=(data.results||[]).filter(m=>m.backdrop_path).slice(0,8);
    if (!heroMovies.length) { $('hero').style.display='none'; return; }

    // build slides
    const track=$('hero-track');
    track.style.display='flex';
    track.style.width=`${heroMovies.length*100}%`;
    track.innerHTML=heroMovies.map(m=>
      `<div class="hero-slide" style="flex:0 0 ${100/heroMovies.length}%;background-image:url('${backdropUrl(m.backdrop_path)}')"></div>`
    ).join('');

    showHeroSlide(0);
    resetTimer();

    // dots
    $('hero-dots').addEventListener('click', e=>{
      const btn=e.target.closest('[data-dot]');
      if (!btn) return;
      showHeroSlide(parseInt(btn.dataset.dot));
      resetTimer();
    });

    // arrows
    $('hero-prev').addEventListener('click', heroPrev);
    $('hero-next').addEventListener('click', heroNext);

    // TOUCH — deliberate swipe only (min 60px horizontal, max 40px vertical drift)
    const hero=$('hero');
    hero.addEventListener('touchstart', e=>{
      touchStartX=e.touches[0].clientX;
      touchStartY=e.touches[0].clientY;
      isDragging=false;
    },{passive:true});
    hero.addEventListener('touchmove', e=>{
      const dx=Math.abs(e.touches[0].clientX-touchStartX);
      const dy=Math.abs(e.touches[0].clientY-touchStartY);
      if (dx>10&&dx>dy) isDragging=true;
    },{passive:true});
    hero.addEventListener('touchend', e=>{
      if (!isDragging) return;
      const dx=e.changedTouches[0].clientX-touchStartX;
      const dy=Math.abs(e.changedTouches[0].clientY-touchStartY);
      if (Math.abs(dx)>=60&&dy<50) { dx<0?heroNext():heroPrev(); }
      isDragging=false;
    });

    // keyboard arrows (only when modal is closed)
    document.addEventListener('keydown', e=>{
      if ($('modal-overlay').style.display!=='none') return;
      if (e.key==='ArrowLeft') heroPrev();
      if (e.key==='ArrowRight') heroNext();
    });

  } catch { $('hero').style.display='none'; }
};

// ══ EVENTS ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Mode buttons (in header)
  document.querySelectorAll('.mode-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      S.mode=btn.dataset.mode;
      S.tab='popular'; S.genreId=null; S.year=null; S.rating=null; S.page=1; S.query='';
      FP.genreId=null; FP.year=null; FP.rating=null;
      $('search-input').value='';
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="popular"]').classList.add('active');
      // update upcoming label
      const up=document.querySelector('.tab-btn[data-tab="upcoming"]');
      if(up) up.textContent=S.mode==='tv'?'On The Air':'Upcoming';
      // close filter panel
      $('filter-panel').style.display='none';
      $('filter-backdrop').style.display='none';
      buildFilterChips();
      fetchContent();
    });
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      S.tab=btn.dataset.tab; S.page=1; S.query='';
      $('search-input').value='';
      fetchContent();
    });
  });

  // Filter panel toggle
  $('filter-btn').addEventListener('click', ()=>{
    const hidden=$('filter-panel').style.display==='none';
    $('filter-panel').style.display=hidden?'block':'none';
    $('filter-backdrop').style.display=hidden?'block':'none';
    $('filter-btn').setAttribute('aria-expanded', hidden?'true':'false');
    if (!hidden) return;
    // sync FP to current S when opening
    FP.genreId=S.genreId; FP.year=S.year; FP.rating=S.rating;
    buildFilterChips();
  });

  // Close filter on backdrop click
  $('filter-backdrop').addEventListener('click', ()=>{
    $('filter-panel').style.display='none';
    $('filter-backdrop').style.display='none';
    $('filter-btn').setAttribute('aria-expanded','false');
  });

  // Genre chips
  $('genre-chips').addEventListener('click', e=>{
    const btn=e.target.closest('.chip');
    if (!btn||!('genre' in btn.dataset)) return;
    const gid=parseInt(btn.dataset.genre);
    FP.genreId = FP.genreId===gid ? null : gid;
    buildFilterChips();
  });

  // Year chips
  $('year-chips').addEventListener('click', e=>{
    const btn=e.target.closest('.chip');
    if (!btn||!('year' in btn.dataset)) return;
    const y=btn.dataset.year==='null'?null:parseInt(btn.dataset.year);
    FP.year = FP.year===y ? null : y;
    buildFilterChips();
  });

  // Rating chips
  $('rating-chips').addEventListener('click', e=>{
    const btn=e.target.closest('.chip');
    if (!btn||!('rating' in btn.dataset)) return;
    const r=btn.dataset.rating==='null'?null:parseInt(btn.dataset.rating);
    FP.rating = FP.rating===r ? null : r;
    buildFilterChips();
  });

  // Apply filter
  $('filter-apply').addEventListener('click', ()=>{
    S.genreId=FP.genreId; S.year=FP.year; S.rating=FP.rating; S.page=1;
    $('filter-panel').style.display='none';
    $('filter-backdrop').style.display='none';
    $('filter-btn').setAttribute('aria-expanded','false');
    buildFilterChips();
    fetchContent();
  });

  // Clear filter
  $('filter-clear').addEventListener('click', ()=>{
    FP.genreId=null; FP.year=null; FP.rating=null;
    buildFilterChips();
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

  // Grid → open modal
  $('grid').addEventListener('click', e=>{
    const c=e.target.closest('.card');
    if(c) openModal(c.dataset.id, c.dataset.type);
  });
  $('grid').addEventListener('keydown', e=>{
    if(e.key==='Enter'||e.key===' '){
      const c=e.target.closest('.card');
      if(c){e.preventDefault();openModal(c.dataset.id,c.dataset.type);}
    }
  });

  // Recently viewed clicks
  $('recent-grid').addEventListener('click', e=>{
    const c=e.target.closest('.mini-card');
    if(c) openModal(c.dataset.id, c.dataset.type);
  });
  $('recent-grid').addEventListener('keydown', e=>{
    if(e.key==='Enter'||e.key===' '){
      const c=e.target.closest('.mini-card');
      if(c){e.preventDefault();openModal(c.dataset.id,c.dataset.type);}
    }
  });

  // Clear recently viewed
  $('clear-recent').addEventListener('click', ()=>{
    try{localStorage.removeItem(RECENT_KEY);}catch{}
    renderRecent();
  });

  // Modal close
  $('modal-close').addEventListener('click', closeModal);
  $('modal-overlay').addEventListener('click', e=>{ if(e.target===$('modal-overlay')) closeModal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'&&$('modal-overlay').style.display!=='none') closeModal(); });

  // Boot
  buildFilterChips();
  renderRecent();
  fetchContent();
  initHero();
});
