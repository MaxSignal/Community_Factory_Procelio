const $ = s => document.querySelector(s);
const qs = s => [...document.querySelectorAll(s)];
let authMode='login'; let loggedIn=null; let isAdmin=false;
let crop={image:null,scale:1,x:0,y:0,drag:false,lastX:0,lastY:0};
const RATIO=216/116;
let robotsCache=[]; let sortKey='created_at'; let sortDesc=true;
let detailPreviews=[]; let detailPreviewIndex=0;
let lightboxOpen=false;

function modal(id,open=true){$(id).classList.toggle('show',open)}
function openLightbox(src,alt='Preview image'){const el=$('#imageLightbox');$('#imageLightboxImage').src=src;$('#imageLightboxImage').alt=alt;el.classList.add('show');el.setAttribute('aria-hidden','false');lightboxOpen=true}
function closeLightbox(){const el=$('#imageLightbox');el.classList.remove('show');el.setAttribute('aria-hidden','true');$('#imageLightboxImage').src='';lightboxOpen=false}
async function api(url,opts={}){const r=await fetch(url,{...opts,credentials:'same-origin'});if(!r.ok){let t=await r.text();throw new Error(t||`HTTP ${r.status}`)}return r}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatDate(timestamp){return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(Number(timestamp)*1000))}


function syncMobileHeader(){
  const pairs=[['howToUploadBtn','mobileHowToUploadBtn'],['howToImportBtn','mobileHowToImportBtn'],['uploadBtn','mobileUploadBtn'],['loginBtn','mobileLoginBtn'],['registerBtn','mobileRegisterBtn'],['languageBtn','mobileLanguageBtn'],['logoutBtn','mobileLogoutBtn']];
  for(const [a,b] of pairs){const src=$('#'+a),dst=$('#'+b);if(src&&dst){dst.textContent=src.textContent;dst.className=src.className;dst.classList.remove('hidden');if(src.classList.contains('hidden'))dst.classList.add('hidden');}}
  const pill=$('#userPill'),mp=$('#mobileUserPill'); if(pill&&mp) mp.textContent=pill.textContent;
}
function closeMobileMenu(){const m=$('#mobileMenu'),b=$('#mobileMenuBtn');if(m){m.classList.remove('open')}if(b)b.setAttribute('aria-expanded','false')}
function setupMobileMenu(){
  const btn=$('#mobileMenuBtn'),menu=$('#mobileMenu'); if(!btn||!menu)return;
  btn.onclick=()=>{const open=!menu.classList.contains('open');menu.classList.toggle('open',open);btn.setAttribute('aria-expanded',String(open));syncMobileHeader();};
  const bind=(id,fn)=>{const el=$('#'+id);if(el)el.onclick=()=>{closeMobileMenu();fn();};};
  bind('mobileHowToUploadBtn',()=>$('#howToUploadBtn')?.click());
  bind('mobileHowToImportBtn',()=>$('#howToImportBtn')?.click());
  bind('mobileUploadBtn',()=>$('#uploadBtn')?.click());
  bind('mobileLoginBtn',()=>$('#loginBtn')?.click());
  bind('mobileRegisterBtn',()=>$('#registerBtn')?.click());
  bind('mobileLanguageBtn',()=>$('#languageBtn')?.click());
  bind('mobileLogoutBtn',()=>$('#logoutBtn')?.click());
  document.addEventListener('click',e=>{if(menu.classList.contains('open')&&!menu.contains(e.target)&&e.target!==btn)closeMobileMenu();});
}

function arrangeAuthButtons(){
  const registerBtn=$('#registerBtn');
  const logoutBtn=$('#logoutBtn');
  const languageBtn=$('#languageBtn');
  if(!registerBtn || !logoutBtn || !languageBtn) return;
  if(loggedIn){
    logoutBtn.parentNode.insertBefore(languageBtn, logoutBtn.nextSibling);
  }else{
    registerBtn.parentNode.insertBefore(languageBtn, registerBtn.nextSibling);
  }
}

async function refreshMe(){
  const r=await fetch('/api/auth/me',{credentials:'same-origin'});const m=await r.json();
  loggedIn=m.logged_in?m.username:null; isAdmin=!!m.admin;
  $('#userPill').textContent=loggedIn?`${t('signedInAs')} ${loggedIn}${isAdmin?` (${t('admin')})`:''}`:'';
  $('#loginBtn').classList.toggle('hidden',!!loggedIn);$('#registerBtn').classList.toggle('hidden',!!loggedIn);$('#logoutBtn').classList.toggle('hidden',!loggedIn);
  arrangeAuthButtons();
  const reportListLink=$('#reportListLink'); const reportFooterSep=$('#reportFooterSep'); if(reportListLink) reportListLink.classList.toggle('hidden',!isAdmin); if(reportFooterSep) reportFooterSep.classList.toggle('hidden',!isAdmin);
  syncMobileHeader();
}

function syncReportFooter(){ const link=$('#reportListLink'); const sep=$('#reportFooterSep'); if(link) link.classList.toggle('hidden',!isAdmin); if(sep) sep.classList.toggle('hidden',!isAdmin); }

function updateDynamicLanguage(){
  if(!loggedIn) $('#userPill').textContent=''; else $('#userPill').textContent=isAdmin?`${t('signedInAs')} ${loggedIn} (${t('admin')})`:`${t('signedInAs')} ${loggedIn}`;
  $('#robotCount').textContent=`${robotsCache.length} ${robotsCache.length===1?t('bot'):t('bots')}`;
  $('#sortDirection').title=sortDesc?t('descending'):t('ascending');
  if($('#detailBody').querySelector('.detail')){ const d=$('#detailBody').querySelector('.date'); if(d){ const m=d.textContent.match(/: (.*)$/); d.textContent=`${t('uploaded')}: ${m?m[1]:d.textContent}`; } }
}
document.addEventListener('languagechange',()=>{updateDynamicLanguage();syncReportFooter();syncMobileHeader();renderRobots(); if($('#uploadModal').classList.contains('show')) $('#previewFileList').textContent=$('#previewFiles').files.length?$('#previewFileList').textContent:t('noPreview');});

function sortRobots(robots){return [...robots].sort((a,b)=>{let av=a[sortKey],bv=b[sortKey];if(sortKey==='created_at'){av=Number(av)||0;bv=Number(bv)||0}else{av=String(av??'').toLocaleLowerCase();bv=String(bv??'').toLocaleLowerCase()}if(av<bv)return sortDesc?1:-1;if(av>bv)return sortDesc?-1:1;return 0})}
function renderRobots(){
  const sorted=sortRobots(robotsCache);$('#robotCount').textContent=`${robotsCache.length} ${robotsCache.length===1?t('bot'):t('bots')}`;$('#sortDirection').textContent=sortDesc?'↓':'↑';$('#sortDirection').title=sortDesc?t('descending'):t('ascending');
  const grid=$('#grid');grid.innerHTML='';
  for(const bot of sorted){const el=document.createElement('article');el.className='card';el.innerHTML=`<img class="thumb" src="${esc(bot.thumbnail_url)}" alt="${esc(bot.name)}"><div class="card-body"><h3>${esc(bot.name)}</h3><div class="meta">${esc(t('player'))}: ${esc(bot.username)}</div><div class="card-actions"><button class="aboutBtn">${esc(t('about'))}</button></div></div>`;el.querySelector('.aboutBtn').onclick=()=>showDetail(bot.id);grid.appendChild(el)}
}
async function loadRobots(){const r=await api('/api/robots');const data=await r.json();robotsCache=data.robots||[];renderRobots()}
$('#sortSelect').onchange=e=>{sortKey=e.target.value;renderRobots()};$('#sortDirection').onclick=()=>{sortDesc=!sortDesc;renderRobots()};

async function loadReports(){
  const r=await api('/api/reports');
  const data=await r.json();
  const list=$('#reportList');
  if(!list)return;
  list.innerHTML='';
  const reports=data.reports||[];
  if(!reports.length){list.innerHTML=`<div class="help">${esc(t('noReports'))}</div>`;return}
  for(const report of reports){
    const item=document.createElement('div'); item.className='report-item';
    const who=report.username?`${t('reportedBy')}: ${report.username}`:`${t('reportedBy')}: anonymous`;
    item.innerHTML=`<div class="report-meta">${esc(formatDate(report.created_at))} · ${esc(who)}</div><div class="report-message">${esc(report.message)}</div>${report.contact?`<div class="report-contact">${esc(t('reportContactLabel'))}: ${esc(report.contact)}</div>`:''}<div class="report-actions"><button class="danger report-delete" data-id="${esc(report.id)}">${esc(t('deleteReport'))}</button></div>`;
    item.querySelector('.report-delete').onclick=async()=>{
      if(!confirm(t('deleteReportConfirm')))return;
      try{await api('/api/reports/'+encodeURIComponent(report.id),{method:'DELETE'});await loadReports();}
      catch(err){$('#reportListError').textContent=err.message;}
    };
    list.appendChild(item);
  }
}
$('#reportProblemLink').onclick=()=>{modal('#reportModal');$('#reportError').textContent='';};
$('#reportListLink').onclick=async()=>{if(!isAdmin)return;$('#reportListError').textContent='';modal('#reportListModal');try{await loadReports()}catch(err){$('#reportListError').textContent=err.message;}};
$('#reportForm').onsubmit=async e=>{e.preventDefault();$('#reportError').textContent='';try{await api('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:$('#reportMessage').value,contact:$('#reportContact').value})});$('#reportForm').reset();modal('#reportModal',false);alert(t('reportSent'));}catch(err){$('#reportError').textContent=err.message||t('reportError')}};

function showAuth(mode){authMode=mode;$('#authTitle').textContent=mode==='login'?t('login'):t('register');$('#authSubmit').textContent=mode==='login'?t('login'):t('register');$('#authError').textContent='';$('#authForm').reset();modal('#authModal')}
$('#howToUploadBtn').onclick=()=>{ if(typeof window.renderHowToI18n==='function') window.renderHowToI18n(); modal('#howToUploadModal'); };
$('#howToImportBtn').onclick=()=>{ if(typeof window.renderHowToI18n==='function') window.renderHowToI18n(); modal('#howToImportModal'); };
$('#loginBtn').onclick=()=>showAuth('login');$('#registerBtn').onclick=()=>showAuth('register');$('#logoutBtn').onclick=async()=>{await api('/api/auth/logout',{method:'POST'});await refreshMe()};
$('#authForm').onsubmit=async e=>{e.preventDefault();$('#authError').textContent='';try{await api(authMode==='login'?'/api/auth/login':'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('#authUsername').value,password:$('#authPassword').value})});if(authMode==='register'){alert(t('registrationComplete'));showAuth('login')}else{modal('#authModal',false);await refreshMe()}}catch(err){$('#authError').textContent=err.message}};

arrangeAuthButtons();
setupMobileMenu();
syncMobileHeader();

$('#uploadBtn').onclick=()=>{
  if(!loggedIn){alert(t('uploadLoginRequired'));return}
  $('#uploadError').textContent='';$('#uploadForm').reset();$('#cropPreview').src='';$('#previewFiles').value='';crop={image:null,scale:1,x:0,y:0,drag:false,lastX:0,lastY:0};$('#previewFileList').textContent=t('noPreview');resizeCanvas();modal('#uploadModal')
};
$('#thumbFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const img=new Image();img.onload=async()=>{crop.image=img;crop.scale=Math.max(1,Math.max(216/img.width,116/img.height));crop.x=(216-img.width*crop.scale)/2;crop.y=(116-img.height*crop.scale)/2;resizeCanvas();drawCrop();await updatePreview()};img.src=URL.createObjectURL(f)};
$('#previewFiles').onchange=e=>{const files=[...e.target.files];$('#previewFileList').textContent=files.length?files.map((f,i)=>`${i+1}. ${f.name}`).join('\n'):t('noPreview')};
const canvas=$('#cropCanvas');const ctx=canvas.getContext('2d');
function resizeCanvas(){const w=Math.min(720,Math.max(280,canvas.parentElement.clientWidth));canvas.width=Math.round(w);canvas.height=Math.round(w/RATIO);drawCrop()}
function drawCrop(){if(!crop.image){ctx.clearRect(0,0,canvas.width,canvas.height);return}const sx=canvas.width/216,sy=canvas.height/116;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#070b10';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(crop.image,crop.x*sx,crop.y*sy,crop.image.width*crop.scale*sx,crop.image.height*crop.scale*sy)}
canvas.addEventListener('pointerdown',e=>{crop.drag=true;crop.lastX=e.clientX;crop.lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!crop.drag||!crop.image)return;const sx=216/canvas.width,sy=116/canvas.height;crop.x+=(e.clientX-crop.lastX)*sx;crop.y+=(e.clientY-crop.lastY)*sy;crop.lastX=e.clientX;crop.lastY=e.clientY;drawCrop()});canvas.addEventListener('pointerup',()=>{crop.drag=false;updatePreview()});canvas.addEventListener('wheel',e=>{if(!crop.image)return;e.preventDefault();const factor=e.deltaY<0?1.08:0.93;const mx=(e.offsetX/canvas.width)*216,my=(e.offsetY/canvas.height)*116;const old=crop.scale;crop.scale=Math.max(.02,Math.min(10,crop.scale*factor));crop.x=mx-(mx-crop.x)*crop.scale/old;crop.y=my-(my-crop.y)*crop.scale/old;drawCrop();updatePreview()},{passive:false});
function makeCropBlob(){return new Promise(resolve=>{const c=document.createElement('canvas');c.width=864;c.height=464;const x=c.getContext('2d');x.fillStyle='#080d14';x.fillRect(0,0,c.width,c.height);x.drawImage(crop.image,crop.x*4,crop.y*4,crop.image.width*crop.scale*4,crop.image.height*crop.scale*4);c.toBlob(b=>resolve(b),'image/jpeg',.92)})}
async function updatePreview(){if(!crop.image)return;const b=await makeCropBlob();const old=$('#cropPreview').src;$('#cropPreview').src=URL.createObjectURL(b);if(old&&old.startsWith('blob:'))URL.revokeObjectURL(old)}
$('#uploadForm').onsubmit=async e=>{e.preventDefault();$('#uploadError').textContent='';if(!crop.image){$('#uploadError').textContent=t('thumbnailRequired');return}try{const thumb=await makeCropBlob();const fd=new FormData();fd.append('name',$('#robotName').value);fd.append('description',$('#robotDescription').value);fd.append('bot',$('#botFile').files[0]);fd.append('thumbnail',thumb,'thumbnail.jpg');for(const f of [...$('#previewFiles').files])fd.append('previews',f,f.name);await api('/api/robots',{method:'POST',body:fd});modal('#uploadModal',false);await loadRobots()}catch(err){$('#uploadError').textContent=err.message}};

function renderDetailPreview(){
  const box=$('#detailPreviewBox');
  if(!box)return;
  if(!detailPreviews.length){box.classList.add('hidden');return}
  box.classList.remove('hidden');
  const src=detailPreviews[detailPreviewIndex];
  $('#detailPreviewImage').src=src;
  $('#detailPreviewCount').textContent=`${detailPreviewIndex+1} / ${detailPreviews.length}`;
  $('#detailPrev').disabled=detailPreviews.length<2;
  $('#detailNext').disabled=detailPreviews.length<2;
  $('#detailPreviewImage').onclick=()=>openLightbox(src,$('#detailPreviewImage').alt);
  $('#detailPrev').onclick=()=>{detailPreviewIndex=(detailPreviewIndex-1+detailPreviews.length)%detailPreviews.length;renderDetailPreview()};
  $('#detailNext').onclick=()=>{detailPreviewIndex=(detailPreviewIndex+1)%detailPreviews.length;renderDetailPreview()};
}

async function showDetail(id){
  const r=await api('/api/robots/'+encodeURIComponent(id));const b=await r.json();
  const own=loggedIn&&loggedIn.toLowerCase()===String(b.username).toLowerCase();
  detailPreviews=b.preview_urls||[];detailPreviewIndex=0;
  $('#detailBody').innerHTML=`<div class="detail"><div><img src="${esc(b.thumbnail_url)}" alt="${esc(b.name)}"></div><div><h2>${esc(b.name)}</h2><div class="owner">${esc(t('player'))}: ${esc(b.username)}</div><div class="date">${esc(t('uploaded'))}: ${esc(formatDate(b.created_at))}</div><div class="description">${esc(b.description||t('noDescription'))}</div><div class="detail-actions"><button type="button" id="detailShare">${esc(t('share'))}</button><button class="primary" id="detailDownload">${esc(t('downloadBot'))}</button>${own||isAdmin?`<button class="danger" id="detailDelete">${esc(t('deleteBot'))}</button>`:''}</div></div></div><div class="preview-gallery hidden" id="detailPreviewBox"><h3>${esc(t('previewGallery'))}</h3><div class="preview-view"><img id="detailPreviewImage" alt="${esc(t('previewImageAlt'))}"></div><div class="preview-nav"><button type="button" id="detailPrev">←</button><span class="preview-count" id="detailPreviewCount">1 / 1</span><button type="button" id="detailNext">→</button></div></div>`;
  $('#detailShare').onclick=()=>{
    const url=new URL(window.location.href);
    url.searchParams.set('bot', b.id);
    $('#shareLinkText').value=url.toString();
    $('#shareCopy').textContent=t('copy');
    modal('#shareModal');
  };
  $('#detailDownload').onclick=async()=>{
    $('#importInfoText').value='';
    $('#importInfoError').textContent='';
    try {
      const info=await api('/api/robots/'+encodeURIComponent(b.id)+'/import-info');
      const data=await info.json();
      if (!info.ok) throw new Error(data.error || t('importInfoError'));
      $('#importInfoText').value=data.import_line;

      const response=await fetch(b.download_url);
      if (!response.ok) throw new Error(t('downloadError'));
      const contentDisposition=response.headers.get('Content-Disposition') || '';
      const filenameMatch=contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^;\"]+)\"?/i);
      const downloadFilename=filenameMatch ? decodeURIComponent((filenameMatch[1] || filenameMatch[2]).trim()) : null;
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download=downloadFilename || b.name.replace(/[^a-zA-Z0-9._-]+/g,'_')+'.bot';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);

      modal('#downloadInfoModal');
    } catch(err) {
      $('#importInfoError').textContent=err.message;
      modal('#downloadInfoModal');
    }
  };
  $('#shareCopy').onclick=async()=>{
    const value=$('#shareLinkText').value;
    if(!value)return;
    try{await navigator.clipboard.writeText(value);$('#shareCopy').textContent=t('copied');setTimeout(()=>$('#shareCopy').textContent=t('copy'),1200)}catch(_){$('#shareLinkText').focus();$('#shareLinkText').select();document.execCommand('copy');$('#shareCopy').textContent=t('copied');setTimeout(()=>$('#shareCopy').textContent=t('copy'),1200)}
  };
  $('#copyImportInfo').onclick=async()=>{
    const value=$('#importInfoText').value;
    if(!value)return;
    try{await navigator.clipboard.writeText(value);$('#copyImportInfo').textContent=t('copied');setTimeout(()=>$('#copyImportInfo').textContent=t('copy'),1200)}catch(_){$('#importInfoText').focus();$('#importInfoText').select();document.execCommand('copy');$('#copyImportInfo').textContent=t('copied');setTimeout(()=>$('#copyImportInfo').textContent=t('copy'),1200)}
  };
  if(own||isAdmin){$('#detailDelete').onclick=async()=>{const reason=isAdmin&&!own?t('adminDeleteConfirm'):t('deleteConfirm');if(!confirm(`${reason}\n${t('cannotUndo')}`))return;try{await api('/api/robots/'+encodeURIComponent(b.id),{method:'DELETE'});modal('#detailModal',false);await loadRobots()}catch(err){alert(err.message)}}}
  renderDetailPreview();modal('#detailModal')
}
qs('[data-close]').forEach(b=>b.onclick=()=>modal('#'+b.dataset.close,false));qs('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')}));$('#imageLightboxClose').onclick=closeLightbox;$('#imageLightbox').addEventListener('click',e=>{if(e.target===$('#imageLightbox'))closeLightbox()});document.addEventListener('keydown',e=>{if(lightboxOpen&&e.key==='Escape')closeLightbox()});window.addEventListener('resize',()=>{if($('#uploadModal').classList.contains('show')){resizeCanvas();drawCrop()}});
(async()=>{await refreshMe();await loadRobots();const botId=new URLSearchParams(window.location.search).get('bot');if(botId&&robotsCache.some(r=>String(r.id)===String(botId)))showDetail(botId)})().catch(console.error);
