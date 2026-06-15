const TMDB_KEY='f19bed2c1f8c6c9df52845b6669e0f27';
const TMDB_BASE='https://api.themoviedb.org/3';
const TMDB_IMG='https://image.tmdb.org/t/p';
const $=(id)=>document.getElementById(id);
const esc=(s)=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const tmdb=async(path,params={})=>{const qs=new URLSearchParams({api_key:TMDB_KEY,...params});const r=await fetch(`${TMDB_BASE}${path}?${qs}`);if(!r.ok)throw new Error(r.status);return r.json();};
const playUrl=(id)=>`https://playimdb.com/title/${id}/`;
const posterUrl=(p,s)=>p?`${TMDB_IMG}/${s||'w342'}${p}`:'';
const backdropUrl=(p)=>p?`${TMDB_IMG}/w1280${p}`:'';
const fmtRuntime=(m)=>{if(!m)return'';const h=Math.floor(m/60),mn=m%60;return h?`${h}h ${mn}m`:`${mn}m`;};
const stars=(v)=>{const n=Math.round(v/2);return'★'.repeat(n)+'☆'.repeat(5-n);};

const GENRES={
  movie:[{id:28,name:'Action'},{id:12,name:'Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},{id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},{id:10751,name:'Family'},{id:14,name:'Fantasy'},{id:36,name:'History'},{id:27,name:'Horror'},{id:10402,name:'Music'},{id:9648,name:'Mystery'},{id:10749,name:'Romance'},{id:878,name:'Sci-Fi'},{id:53,name:'Thriller'},{id:10752,name:'War'},{id:37,name:'Western'}],
  tv:[{id:10759,name:'Action & Adventure'},{id:16,name:'Animation'},{id:35,name:'Comedy'},{id:80,name:'Crime'},{id:99,name:'Documentary'},{id:18,name:'Drama'},{id:10751,name:'Family'},{id:10762,name:'Kids'},{id:9648,name:'Mystery'},{id:10765,name:'Sci-Fi & Fantasy'},{id:10768,name:'War & Politics'},{id:37,name:'Western'}]
};

const S={mode:'movie',tab:'popular',genreId:null,year:null,rating:null,page:1,totalPages:1,query:''};
const FP={genreId:null,year:null,rating:null};

// recently viewed
const RKEY='cp_recent';
const getRecent=()=>{try{return JSON.parse(localStorage.getItem(RKEY)||'[]');}catch{return[];}};
const addRecent=(item)=>{let a=getRecent().filter(i=>i.id!==item.id);a.unshift(item);a=a.slice(0,20);try{localStorage.setItem(RKEY,JSON.stringify(a));}catch{}renderRecent();};
const renderRecent=()=>{
  const arr=getRecent(),sec=$('recent-section');
  if(!sec)return;
  if(!arr.length){sec.style.display='none';return;}
  sec.style.display='';
  $('recent-grid').innerHTML=arr.map(i=>{
    const img=i.poster?`<img src="${esc(i.poster)}" alt="${esc(i.title)}" loading="lazy"/>`:`<div class="mini-noposter">🎬</div>`;
    return `<div class="mini-card" data-id="${i.id}" data-type="${i.type}" tabindex="0" role="button">${img}<div class="mini-title">${esc(i.title)}</div></div>`;
  }).join('');
};

// filter chips
const buildChips=()=>{
  const yr=new Date().getFullYear();
  $('genre-chips').innerHTML=GENRES[S.mode].map(g=>`<button class="chip${FP.genreId===g.id?' active':''}" data-genre="${g.id}">${esc(g.name)}</button>`).join('');
  $('year-chips').innerHTML=[null,yr,yr-1,yr-2,yr-3,yr-4].map((y,i)=>`<button class="chip${FP.year===y?' active':''}" data-year="${y}">${['All','This Year',yr-1,yr-2,yr-3,yr-4][i]}</button>`).join('');
  $('rating-chips').innerHTML=[null,9,8,7,6].map((r,i)=>`<button class="chip${FP.rating===r?' active':''}" data-rating="${r}">${['All','9+ ★','8+ ★','7+ ★','6+ ★'][i]}</button>`).join('');
  $('filter-btn').classList.toggle('active',!!(S.genreId||S.year||S.rating));
};

// filter sheet
const openSheet=()=>{FP.genreId=S.genreId;FP.year=S.year;FP.rating=S.rating;buildChips();$('filter-overlay').style.display='block';$('filter-sheet').style.display='block';document.body.style.overflow='hidden';};
const closeSheet=()=>{$('filter-overlay').style.display='none';$('filter-sheet').style.display='none';document.body.style.overflow='';};

// search
const openSearch=()=>{$('search-bar').style.display='block';$('search-input').focus();};
const closeSearch=()=>{$('search-bar').style.display='none';$('search-input').value='';};

// states
const showState=(w)=>{$('spinner').style.display=w==='spinner'?'block':'none';$('empty-state').style.display=w==='empty'?'block':'none';$('err-state').style.display=w==='err'?'block':'none';};

// title
const updateTitle=()=>{const mode=S.mode==='movie'?'Movies':'TV Shows';const map={popular:'Popular',trending:'Trending',top_rated:'Top Rated',upcoming:S.mode==='movie'?'Upcoming':'On The Air',search:'Search Results'};$('section-title').textContent=(map[S.tab]||'')+' '+mode;};

// render
const renderGrid=(items)=>{
  if(!items.length){$('grid').innerHTML='';showState('empty');$('pagination').style.display='none';$('section-count').textContent='';return;}
  showState(null);
  $('section-count').textContent=`${items.length} titles`;
  $('grid').innerHTML=items.map(m=>{
    const title=m.title||m.name||'';
    const year=(m.release_date||m.first_air_date||'').slice(0,4);
    const poster=posterUrl(m.poster_path);
    const rating=m.vote_average>0?`<div class="card-rating">★ ${m.vote_average.toFixed(1)}</div>`:'';
    const badge=S.mode==='tv'?`<div class="card-type">TV</div>`:'';
    const img=poster?`<img src="${esc(poster)}" alt="${esc(title)}" loading="lazy"/>`:`<div class="card-noposter">No Poster</div>`;
    return `<div class="card" tabindex="0" role="button" data-id="${m.id}" data-type="${S.mode}"><div class="card-poster">${img}${rating}${badge}<div class="card-overlay"><div class="card-play">▶</div></div></div><div class="card-info"><div class="card-title">${esc(title)}</div><div class="card-year">${year}</div></div></div>`;
  }).join('');
  $('pagination').style.display='flex';
  $('page-info').textContent=`Page ${S.page} of ${S.totalPages.toLocaleString()}`;
  $('btn-prev').disabled=S.page<=1;
  $('btn-next').disabled=S.page>=S.totalPages;
};

// fetch
const fetchContent=async()=>{
  showState('spinner');$('grid').innerHTML='';$('pagination').style.display='none';updateTitle();
  const isMovie=S.mode==='movie';
  const params={page:S.page,language:'en-US'};
  if(S.genreId)params.with_genres=S.genreId;
  if(S.year)params[isMovie?'primary_release_year':'first_air_date_year']=S.year;
  if(S.rating)params['vote_average.gte']=S.rating;
  try{
    let data;const base=isMovie?'/movie':'/tv';
    if(S.tab==='search'&&S.query)data=await tmdb(`/search/${isMovie?'movie':'tv'}`,{...params,query:S.query,include_adult:false});
    else if(S.tab==='trending')data=await tmdb(`/trending/${isMovie?'movie':'tv'}/week`,params);
    else if(S.tab==='top_rated')data=await tmdb(`${base}/top_rated`,params);
    else if(S.tab==='upcoming'&&isMovie)data=await tmdb(`${base}/upcoming`,params);
    else if(S.tab==='upcoming'&&!isMovie)data=await tmdb(`${base}/on_the_air`,params);
    else if(S.genreId||S.year||S.rating)data=await tmdb(`/discover/${isMovie?'movie':'tv'}`,{...params,sort_by:'popularity.desc'});
    else data=await tmdb(`${base}/popular`,params);
    S.totalPages=Math.min(data.total_pages||1,500);
    renderGrid(data.results||[]);
  }catch{showState('err');}
};

// modal
const openModal=async(id,type)=>{
  const isMovie=type==='movie';
  $('modal-backdrop').src='';$('modal-poster').src='';$('modal-poster').style.display='none';
  ['modal-title','modal-orig','modal-overview'].forEach(i=>$(i).textContent='');
  ['modal-pills','modal-meta','modal-cast','modal-cta'].forEach(i=>$(i).innerHTML='');
  $('modal-cast-wrap').style.display='none';
  $('modal-loading').style.display='flex';$('modal-body').style.visibility='hidden';
  $('modal-overlay').style.display='flex';document.body.style.overflow='hidden';
  try{
    const d=await tmdb(`/${isMovie?'movie':'tv'}/${id}`,{append_to_response:'credits'});
    if(d.backdrop_path)$('modal-backdrop').src=backdropUrl(d.backdrop_path);
    const poster=posterUrl(d.poster_path);
    if(poster){$('modal-poster').src=poster;$('modal-poster').alt=d.title||d.name||'';$('modal-poster').style.display='';}
    $('modal-title').textContent=d.title||d.name||'';
    const orig=d.original_title||d.original_name||'';
    if(orig&&orig!==(d.title||d.name))$('modal-orig').textContent=orig;
    let pills='';
    if(d.vote_average>0)pills+=`<span class="pill pill-r">${stars(d.vote_average)} ${d.vote_average.toFixed(1)}</span>`;
    const ds=d.release_date||d.first_air_date||'';
    if(ds)pills+=`<span class="pill">${ds.slice(0,4)}</span>`;
    if(!isMovie&&d.number_of_seasons)pills+=`<span class="pill">${d.number_of_seasons} Season${d.number_of_seasons>1?'s':''}</span>`;
    const rt=isMovie?fmtRuntime(d.runtime):(d.episode_run_time?.[0]?fmtRuntime(d.episode_run_time[0]):'');
    if(rt)pills+=`<span class="pill">${rt}</span>`;
    (d.genres||[]).slice(0,3).forEach(g=>{pills+=`<span class="pill">${esc(g.name)}</span>`;});
    $('modal-pills').innerHTML=pills;
    if(d.overview)$('modal-overview').textContent=d.overview;
    const crew=d.credits?.crew||[];const dir=crew.find(c=>c.job==='Director');const cre=(d.created_by||[])[0];
    const meta=[];
    if(dir)meta.push(['Director',dir.name]);
    if(!isMovie&&cre)meta.push(['Creator',cre.name]);
    if(d.status)meta.push(['Status',d.status]);
    if(isMovie&&d.budget>0)meta.push(['Budget',`$${(d.budget/1e6).toFixed(0)}M`]);
    if(isMovie&&d.revenue>0)meta.push(['Revenue',`$${(d.revenue/1e6).toFixed(0)}M`]);
    if(!isMovie&&d.networks?.length)meta.push(['Network',d.networks[0].name]);
    $('modal-meta').innerHTML=meta.map(([l,v])=>`<div><div class="meta-lbl">${l}</div><div class="meta-val">${esc(String(v))}</div></div>`).join('');
    const cast=(d.credits?.cast||[]).slice(0,6);
    if(cast.length){$('modal-cast-wrap').style.display='';$('modal-cast').innerHTML=cast.map(c=>{const av=c.profile_path?`<img class="cast-av" src="${TMDB_IMG}/w45${c.profile_path}" alt="${esc(c.name)}" loading="lazy"/>`:`<div class="cast-av-ph">👤</div>`;return`<div class="cast-chip">${av}<div><div class="cast-name">${esc(c.name)}</div><div class="cast-char">${esc(c.character)}</div></div></div>`;}).join('');}
    let imdbId=d.imdb_id;
    if(!isMovie&&!imdbId){try{const ext=await tmdb(`/tv/${id}/external_ids`);imdbId=ext.imdb_id;}catch{}}
    if(imdbId){$('modal-cta').innerHTML=`<a class="btn-watch" href="${playUrl(imdbId)}" target="_blank" rel="noopener noreferrer">▶ Watch Now</a><a class="btn-imdb" href="https://www.imdb.com/title/${imdbId}/" target="_blank" rel="noopener noreferrer">IMDb ↗</a>`;}
    else{$('modal-cta').innerHTML=`<span class="btn-watch" style="opacity:.35;cursor:default">▶ Watch Now</span>`;}
    addRecent({id,type,title:d.title||d.name||'',poster:posterUrl(d.poster_path,'w185')});
  }catch{$('modal-cta').innerHTML='<p style="color:#e55;margin-top:12px">Could not load. Try again.</p>';}
  finally{$('modal-loading').style.display='none';$('modal-body').style.visibility='visible';}
};
const closeModal=()=>{$('modal-overlay').style.display='none';$('modal-loading').style.display='none';$('modal-body').style.visibility='visible';document.body.style.overflow='';};

// hero
let hm=[],hi=0,ht=null,txS=0,tyS=0,ttS=0;
const showSlide=(idx)=>{
  if(!hm.length)return;
  hi=(idx+hm.length)%hm.length;const m=hm[hi];
  $('hero-track').style.transform=`translateX(-${hi*100}%)`;
  $('hero-title').textContent=m.title||m.name||'';
  $('hero-overview').textContent=m.overview||'';
  const yr=(m.release_date||m.first_air_date||'').slice(0,4);
  $('hero-meta').innerHTML=[yr?`<span class="h-pill">${yr}</span>`:'',m.vote_average>0?`<span class="h-rating">★ ${m.vote_average.toFixed(1)}</span>`:'','<span class="h-pill">HD</span>'].join('');
  $('hero-dots').innerHTML=hm.map((_,i)=>`<button class="h-dot${i===hi?' active':''}" data-dot="${i}"></button>`).join('');
  $('hero-watch-btn').onclick=async()=>{const t=$('hero-watch-btn').textContent;$('hero-watch-btn').textContent='…';try{const d=await tmdb(`/movie/${m.id}`);if(d.imdb_id)window.open(playUrl(d.imdb_id),'_blank');}catch{}$('hero-watch-btn').textContent=t;};
  $('hero-more-btn').onclick=()=>openModal(m.id,'movie');
};
const hNext=()=>{showSlide(hi+1);resetHT();};
const hPrev=()=>{showSlide(hi-1);resetHT();};
const resetHT=()=>{clearInterval(ht);ht=setInterval(hNext,6000);};
const initHero=async()=>{
  try{
    const data=await tmdb('/trending/movie/day',{page:1});
    hm=(data.results||[]).filter(m=>m.backdrop_path).slice(0,8);
    if(!hm.length){$('hero').style.display='none';return;}
    const track=$('hero-track');
    track.style.width=`${hm.length*100}%`;
    track.innerHTML=hm.map(m=>`<div class="hero-slide" style="flex:0 0 ${100/hm.length}%;background-image:url('${backdropUrl(m.backdrop_path)}')"></div>`).join('');
    showSlide(0);$('hero').style.opacity='1';resetHT();
    $('hero-dots').addEventListener('click',e=>{const b=e.target.closest('[data-dot]');if(b){showSlide(parseInt(b.dataset.dot));resetHT();}});
    $('hero-prev').addEventListener('click',e=>{e.stopPropagation();hPrev();});
    $('hero-next').addEventListener('click',e=>{e.stopPropagation();hNext();});
    const hero=$('hero');
    hero.addEventListener('touchstart',e=>{txS=e.touches[0].clientX;tyS=e.touches[0].clientY;ttS=Date.now();},{passive:true});
    hero.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-txS;const dy=Math.abs(e.changedTouches[0].clientY-tyS);const dt=Date.now()-ttS;if(Math.abs(dx)>=80&&dy<40&&Math.abs(dx)>dy*2&&dt>80&&dt<700){dx<0?hNext():hPrev();}},{passive:true});
    document.addEventListener('keydown',e=>{if($('modal-overlay').style.display==='flex')return;if(e.key==='ArrowLeft')hPrev();if(e.key==='ArrowRight')hNext();});
  }catch{$('hero').style.display='none';}
};

// mode switch
const switchMode=(mode)=>{
  S.mode=mode;S.tab='popular';S.genreId=null;S.year=null;S.rating=null;S.page=1;S.query='';
  FP.genreId=null;FP.year=null;FP.rating=null;
  closeSearch();closeSheet();
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='popular'));
  const up=document.querySelector('.tab-btn[data-tab="upcoming"]');
  if(up)up.textContent=mode==='tv'?'On Air':'Upcoming';
  buildChips();fetchContent();
};

document.addEventListener('DOMContentLoaded',()=>{
  // logo → home
  $('logo-btn').addEventListener('click',e=>{e.preventDefault();S.tab='popular';S.genreId=null;S.year=null;S.rating=null;S.page=1;S.query='';closeSearch();document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='popular'));fetchContent();});

  // search
  $('search-toggle').addEventListener('click',openSearch);
  $('search-close').addEventListener('click',closeSearch);
  $('search-form').addEventListener('submit',e=>{e.preventDefault();const q=$('search-input').value.trim();if(!q)return;document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));S.tab='search';S.query=q;S.page=1;closeSearch();fetchContent();});

  // mode
  document.querySelectorAll('.mode-btn').forEach(btn=>btn.addEventListener('click',()=>switchMode(btn.dataset.mode)));

  // tabs
  document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');S.tab=btn.dataset.tab;S.page=1;S.query='';fetchContent();}));

  // filter
  $('filter-btn').addEventListener('click',e=>{e.stopPropagation();openSheet();});
  $('filter-overlay').addEventListener('click',closeSheet);
  $('filter-close').addEventListener('click',closeSheet);

  // chips
  ['genre-chips','year-chips','rating-chips'].forEach(id=>{
    $(id).addEventListener('click',e=>{
      e.stopPropagation();const btn=e.target.closest('.chip');if(!btn)return;
      if('genre' in btn.dataset){const g=parseInt(btn.dataset.genre);FP.genreId=FP.genreId===g?null:g;}
      else if('year' in btn.dataset){const y=btn.dataset.year==='null'?null:parseInt(btn.dataset.year);FP.year=FP.year===y?null:y;}
      else if('rating' in btn.dataset){const r=btn.dataset.rating==='null'?null:parseInt(btn.dataset.rating);FP.rating=FP.rating===r?null:r;}
      buildChips();
    });
  });
  $('filter-apply').addEventListener('click',e=>{e.stopPropagation();S.genreId=FP.genreId;S.year=FP.year;S.rating=FP.rating;S.page=1;closeSheet();buildChips();fetchContent();});
  $('filter-clear').addEventListener('click',e=>{e.stopPropagation();FP.genreId=null;FP.year=null;FP.rating=null;buildChips();});

  // pagination
  $('btn-prev').addEventListener('click',()=>{if(S.page>1){S.page--;fetchContent();window.scrollTo({top:0,behavior:'smooth'});}});
  $('btn-next').addEventListener('click',()=>{if(S.page<S.totalPages){S.page++;fetchContent();window.scrollTo({top:0,behavior:'smooth'});}});

  // grid
  $('grid').addEventListener('click',e=>{const c=e.target.closest('.card');if(c)openModal(c.dataset.id,c.dataset.type);});
  $('grid').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const c=e.target.closest('.card');if(c){e.preventDefault();openModal(c.dataset.id,c.dataset.type);}}});

  // recent
  $('recent-grid').addEventListener('click',e=>{const c=e.target.closest('.mini-card');if(c)openModal(c.dataset.id,c.dataset.type);});
  $('clear-recent').addEventListener('click',()=>{try{localStorage.removeItem(RKEY);}catch{}renderRecent();});

  // modal close
  $('modal-close').addEventListener('click',closeModal);
  $('modal-overlay').addEventListener('click',e=>{if(e.target===$('modal-overlay'))closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('modal-overlay').style.display==='flex')closeModal();});

  // BOOT — grid and hero in parallel, hero pre-cached
  buildChips();renderRecent();
  fetchContent();
  initHero();
});
