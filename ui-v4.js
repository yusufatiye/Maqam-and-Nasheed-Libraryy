
(function(){
  const uiEsc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clip = (txt, max=270) => { txt=(txt||'').replace(/\s*\n\s*/g,' — ').replace(/\s+/g,' ').trim(); return txt.length>max?txt.slice(0,max).trim()+'…':txt; };
  const SONG_NOTES_KEY='maqamBookSongNotesV4', PAGE_NOTES_KEY='maqamBookPageNotesV4';
  function readJSON(k,d){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v&&typeof v==='object'?v:d}catch(_){return d}}
  function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
  let songNotes=readJSON(SONG_NOTES_KEY,{}), pageNotes=readJSON(PAGE_NOTES_KEY,{});
  // Migrate notes created in the original MVP when IDs match.
  const legacy=readJSON('maqam_book_notes_v1',{}); let migrated=false;
  for(const [k,v] of Object.entries(legacy)){if(v && !songNotes[k]){songNotes[k]=String(v);migrated=true}} if(migrated)writeJSON(SONG_NOTES_KEY,songNotes);
  const getSongNote=s=>String(songNotes[s?.id]||''); const getPageNote=n=>String(pageNotes[String(n)]||'');
  const saveSongNotes=()=>writeJSON(SONG_NOTES_KEY,songNotes), savePageNotes=()=>writeJSON(PAGE_NOTES_KEY,pageNotes);

  function songMetaText(s){return [s.maqam&&`المقام: ${s.maqam}`,s.branch&&`الفرع: ${s.branch}`,s.rhythm&&`الإيقاع/الوزن: ${s.rhythm}`,s.poet&&`الكلمات: ${s.poet}`,s.composer&&`الألحان: ${s.composer}`,s.tape&&`الشريط: ${s.tape}`,(s.pdfPages||[]).length&&`PDF: ${(s.pdfPages||[]).join('، ')}`].filter(Boolean).join(' • ')}
  function noteScore(text,nq,mode){const t=norm(text||'');if(!nq||!t)return 0;const toks=nq.split(' ').filter(Boolean);if(t.includes(nq))return 700;if(mode==='phrase')return 0;if(toks.every(x=>t.includes(x)))return 520+toks.length*5;if(mode==='all')return 0;const words=t.split(' ');let ok=0;for(const q of toks){if(q.length<3){if(t.includes(q))ok++;continue}const lim=q.length>=7?2:1;let found=false;for(const w of words){if(Math.abs(w.length-q.length)>lim)continue;if(w[0]!==q[0])continue;if(lev(q,w)<=lim){found=true;break}}if(found)ok++}return ok===toks.length?260+ok*10:0}
  function noteHtml(note){return note?`<div class="note-preview"><strong>ملاحظتي:</strong> ${highlight(note,state.query)}</div>`:''}

  let detailSong=null;
  window.openSongDetail=function(s){detailSong=s;document.getElementById('sdTitle').textContent=s.title||'النشيد';document.getElementById('sdMeta').textContent=songMetaText(s);document.getElementById('sdLyrics').textContent=s.lyrics||'لا يوجد نص مفهرس كامل لهذا النشيد.';document.getElementById('sdNote').value=getSongNote(s);updateSongFav();const d=document.getElementById('songDialog');d.classList.add('open');d.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'};
  function closeSongDetail(){const d=document.getElementById('songDialog');d.classList.remove('open');d.setAttribute('aria-hidden','true');document.body.style.overflow=''}
  function updateSongFav(){if(!detailSong)return;const on=favorites.has('song:'+detailSong.id),b=document.getElementById('sdFav');b.textContent=on?'★ محفوظ':'☆ مفضلة';b.classList.toggle('fav',on)}
  function flash(btn,msg,back){const old=btn.textContent;btn.textContent=msg;setTimeout(()=>btn.textContent=back||old,1200)}
  document.getElementById('sdClose').onclick=closeSongDetail;
  document.getElementById('songDialog').onclick=e=>{if(e.target===document.getElementById('songDialog'))closeSongDetail()};
  document.getElementById('sdPage').onclick=()=>{if(!detailSong)return;closeSongDetail();openPage((detailSong.pdfPages||[])[0]||1)};
  document.getElementById('sdCopy').onclick=async()=>{if(!detailSong)return;try{await navigator.clipboard.writeText(detailSong.lyrics||'');flash(document.getElementById('sdCopy'),'تم النسخ ✓','نسخ النص')}catch(_){}};
  document.getElementById('sdFav').onclick=()=>{if(!detailSong)return;const k='song:'+detailSong.id;favorites.has(k)?favorites.delete(k):favorites.add(k);saveFav();updateSongFav();run()};
  document.getElementById('sdNoteSave').onclick=()=>{if(!detailSong)return;const v=document.getElementById('sdNote').value.trim();if(v)songNotes[detailSong.id]=v;else delete songNotes[detailSong.id];saveSongNotes();flash(document.getElementById('sdNoteSave'),'تم الحفظ ✓','حفظ الملاحظة');run()};
  document.getElementById('sdNoteClear').onclick=()=>{if(!detailSong)return;delete songNotes[detailSong.id];saveSongNotes();document.getElementById('sdNote').value='';flash(document.getElementById('sdNoteClear'),'تم الحذف ✓','حذف الملاحظة');run()};

  // Page viewer: image / OCR text / personal note are three explicit modes.
  const oldCloseViewer=closeViewer; closeViewer=function(){oldCloseViewer();document.body.style.overflow=''};
  const oldOpenPage=openPage; let viewerMode='image';
  function setViewerMode(mode){viewerMode=mode;const img=document.getElementById('vImg'),txt=document.getElementById('vText'),np=document.getElementById('vNotePanel');img.style.display=mode==='image'?'block':'none';txt.classList.toggle('show',mode==='text');np.classList.toggle('show',mode==='note');document.getElementById('vTextBtn').textContent=mode==='text'?'صورة الصفحة':'نص البحث';document.getElementById('vNoteBtn').textContent=mode==='note'?'صورة الصفحة':'ملاحظة'}
  openPage=function(n){oldOpenPage(n);document.body.style.overflow='hidden';document.getElementById('vNote').value=getPageNote(currentPage);setViewerMode('image')};
  document.getElementById('vTextBtn').onclick=()=>setViewerMode(viewerMode==='text'?'image':'text');
  document.getElementById('vNoteBtn').onclick=()=>setViewerMode(viewerMode==='note'?'image':'note');
  document.getElementById('vNoteSave').onclick=()=>{const v=document.getElementById('vNote').value.trim();if(v)pageNotes[String(currentPage)]=v;else delete pageNotes[String(currentPage)];savePageNotes();flash(document.getElementById('vNoteSave'),'تم الحفظ ✓','حفظ الملاحظة');run()};
  document.getElementById('vNoteClear').onclick=()=>{delete pageNotes[String(currentPage)];savePageNotes();document.getElementById('vNote').value='';flash(document.getElementById('vNoteClear'),'تم الحذف ✓','حذف الملاحظة');run()};

  songCard=function(s){const d=document.createElement('article');d.className='card song';const f=favorites.has('song:'+s.id),note=getSongNote(s);const preview=clip(s.lyrics||'',290);d.innerHTML=`<div class="card-head"><div><h3>${highlight(s.title||'نشيد',state.query)}</h3><div class="meta-row"><span class="badge">${uiEsc(s.maqam||'')}</span>${s.branch?`<span class="badge">${uiEsc(s.branch)}</span>`:''}${s.rhythm?`<span class="badge">${uiEsc(s.rhythm)}</span>`:''}</div></div><button class="fav-star ${f?'on':''}" title="المفضلة" aria-label="المفضلة">${f?'★':'☆'}</button></div><div class="meta">${uiEsc(songMetaText(s))}</div><div class="song-preview">${highlight(preview,state.query)}</div>${noteHtml(note)}<div class="actions"><button class="linkbtn primary-action openDetail">عرض النشيد</button><button class="linkbtn openSource">الصفحة الأصلية</button></div>`;d.querySelector('.openDetail').onclick=()=>openSongDetail(s);d.querySelector('.openSource').onclick=()=>openPage((s.pdfPages||[])[0]||1);d.querySelector('.fav-star').onclick=()=>{const k='song:'+s.id;favorites.has(k)?favorites.delete(k):favorites.add(k);saveFav();run()};return d};
  pageCard=function(p){const d=document.createElement('article');d.className='card';const f=favorites.has('page:'+p.n),note=getPageNote(p.n),titles=(p.titles||[]).filter(Boolean).slice(0,3),main=titles[0]||`صفحة PDF ${p.n}`;d.innerHTML=`<div class="card-head"><div><h3>${highlight(main,state.query)}</h3><div class="meta-row"><span class="badge">${uiEsc(p.maqam||'')}</span><span class="badge">PDF ${p.n}</span></div></div><button class="fav-star ${f?'on':''}" title="المفضلة">${f?'★':'☆'}</button></div><div class="meta">${titles.slice(1).map(x=>uiEsc(x)).join(' • ')}${titles.length>1?' • ':''}المصدر: صورة الصفحة الأصلية</div><div class="snippet">${highlight(snippet(p,state.query),state.query)}</div>${noteHtml(note)}<div class="actions"><button class="linkbtn primary-action openSource">عرض الصفحة الأصلية</button></div>`;d.querySelector('.openSource').onclick=()=>openPage(p.n);d.querySelector('.fav-star').onclick=()=>{const k='page:'+p.n;favorites.has(k)?favorites.delete(k):favorites.add(k);saveFav();run()};return d};

  run=function(){document.querySelectorAll('.maqam').forEach(x=>x.classList.toggle('active',x.dataset.id===state.section));const nq=norm(state.query);let pageItems=[],songItems=[];
    if(!nq&&!state.favoritesOnly&&!state.section){songItems=SONGS.map(s=>({kind:'song',score:100,s}))}
    else{
      for(const p of PAGES){if(state.section&&p.section!==state.section)continue;if(state.favoritesOnly&&!favorites.has('page:'+p.n))continue;const sc=Math.max(scorePage(p,nq,state.mode),noteScore(getPageNote(p.n),nq,state.mode));if(sc>0)pageItems.push({kind:'page',score:sc,p})}
      if(nq&&!state.favoritesOnly){for(const s of SONGS){if(state.section&&norm(s.maqam)!==norm(secMap[state.section]?.name))continue;const sc=Math.max(scoreSong(s,nq),noteScore(getSongNote(s),nq,state.mode));if(sc>0)songItems.push({kind:'song',score:sc,s})}}
      if(!nq&&state.section&&!state.favoritesOnly){for(const s of SONGS){if(norm(s.maqam)===norm(secMap[state.section]?.name))songItems.push({kind:'song',score:150,s})}}
      if(state.favoritesOnly){for(const s of SONGS){if(favorites.has('song:'+s.id)&&(!state.section||norm(s.maqam)===norm(secMap[state.section]?.name)))songItems.push({kind:'song',score:1000,s})}}
    }
    songItems.sort((a,b)=>b.score-a.score);pageItems.sort((a,b)=>b.score-a.score||a.p.n-b.p.n);state.items=[...songItems,...pageItems];render()};

  render=function(){const total=state.items.length,start=(state.page-1)*state.per,end=Math.min(total,start+state.per);document.getElementById('resultCount').textContent=`${total} نتيجة`;let title=state.favoritesOnly?'المفضلة':state.query?`نتائج البحث عن «${state.query}»`:state.section?`مقام ${secMap[state.section].name}`:'كل الأناشيد المفهرسة';document.getElementById('resultTitle').textContent=title;const box=document.getElementById('results');box.innerHTML='';if(!total){box.innerHTML='<div class="empty"><strong>لا توجد نتيجة مباشرة.</strong><br>جرّب كلمة أقصر أو البحث الذكي. البحث يشمل أيضاً ملاحظاتك الشخصية.</div>';document.getElementById('pager').innerHTML='';return}for(const it of state.items.slice(start,end)){box.appendChild(it.kind==='song'?songCard(it.s):pageCard(it.p))}renderPager(total)};

  state.per=12;
  const mode=document.getElementById('mode');document.querySelectorAll('[data-search-mode]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-search-mode]').forEach(x=>x.classList.remove('active'));b.classList.add('active');mode.value=b.dataset.searchMode;state.mode=mode.value;if(state.query)search()});
  const panel=document.getElementById('maqamPanel'),toggle=document.getElementById('maqamToggle');function setPanel(open){panel.classList.toggle('collapsed',!open);toggle.textContent=open?'المقامات ▴':'المقامات ▾'}toggle.onclick=()=>setPanel(panel.classList.contains('collapsed'));document.getElementById('maqamClose').onclick=()=>setPanel(false);document.getElementById('sectionFilter').addEventListener('change',()=>{if(document.getElementById('sectionFilter').value)setPanel(false)});

  // Local backup / restore for moving notes between laptop and iPhone.
  const dataPanel=document.getElementById('dataPanel'),dataToggle=document.getElementById('dataToggle'),dataStatus=document.getElementById('dataStatus'),dataInput=document.getElementById('dataImport');
  dataToggle.onclick=()=>dataPanel.classList.toggle('open');
  function setDataStatus(t){dataStatus.textContent=t;setTimeout(()=>{if(dataStatus.textContent===t)dataStatus.textContent=''},4500)}
  document.getElementById('dataExport').onclick=()=>{const payload={format:'maqambook-user-data',version:1,exportedAt:new Date().toISOString(),songNotes,pageNotes,favorites:[...favorites]};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MaqamBook_MyData.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);setDataStatus('تم إنشاء ملف النسخة الاحتياطية. احفظه في مكان آمن.')};
  document.getElementById('dataImportBtn').onclick=()=>dataInput.click();
  dataInput.onchange=async()=>{const file=dataInput.files&&dataInput.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(!obj||obj.format!=='maqambook-user-data')throw new Error('format');if(obj.songNotes&&typeof obj.songNotes==='object')songNotes={...songNotes,...obj.songNotes};if(obj.pageNotes&&typeof obj.pageNotes==='object')pageNotes={...pageNotes,...obj.pageNotes};if(Array.isArray(obj.favorites))for(const k of obj.favorites)if(typeof k==='string')favorites.add(k);saveSongNotes();savePageNotes();saveFav();run();setDataStatus('تم الاستيراد ودمج الملاحظات والمفضلة بنجاح ✓')}catch(_){setDataStatus('تعذر استيراد الملف: تأكد أنه نسخة احتياطية صادرة من هذا التطبيق.')}finally{dataInput.value=''}};

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('songDialog').classList.contains('open'))closeSongDetail()});
  run();
  window.__MAQAMBOOK_UI_V4__={version:'4.0',notesSearch:true,pageNotes:true,backup:true,toolbarSticky:false};
  window.__MAQAMBOOK_NOTES_TEST__={noteScore,getSongNote,getPageNote};
})();
