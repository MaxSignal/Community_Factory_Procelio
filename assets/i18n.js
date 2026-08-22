(() => {
  const STORAGE_KEY = 'cf-language';
  const translations = {
    en: {
      'brand': 'Procelio Community Factory (Unofficial)',
      'howUpload': 'How to upload', 'howImport':'How to import to game', 'upload':'Upload', 'login':'Login', 'register':'Register', 'logout':'Logout', 'language':'Language',
      'sortBy':'Sort by','uploadDate':'Upload date','uploader':'Uploader','robotName':'Robot name','about':'About',
      'howUploadTitle':'How to upload','howImportTitle':'How to import to game','botDetails':'Bot Details','username':'Username','password':'Password',
      'uploadBot':'Upload Bot','description':'Description','botFile':'Bot file','thumbnail':'Thumbnail','previewImages':'Preview images','cancel':'Cancel',
      'thumbnailHelp':'Crop to the same 216:116 ratio as the site thumbnail. The saved image is automatically adjusted to stay within 1 MB.',
      'cropHelp':'Drag the image to adjust the crop. Use the mouse wheel to zoom.','thumbPreview':'Thumbnail preview','noPreview':'No preview images selected.',
      'optional':'Optional. You can attach multiple images to show on the Bot Details page.','downloadBot':'Download Bot','deleteBot':'Delete Bot','player':'Player','uploaded':'Uploaded',
      'previewGallery':'Preview images','importInfo':'Import information','copy':'Copy','saveImport':'Save this line and append it to index.file in your templates folder.','noDescription':'No description',
      'uploadSteps':['Register or log in.','Click the Upload button.','Enter the required information.','Upload the thumbnail image and bot data.','Upload preview images.'],
      'bot':'bot','bots':'bots','noDescription':'No description','signedInAs':'Signed in as','admin':'Admin','saveImport':'Save this line and append it to index.file in your templates folder.','importSteps':['Click the About button for the robot you want to import on this page, then select Download. Save the displayed text.','Place the downloaded file in the templates folder.','Append the displayed text from the Download dialog to the index.file in the templates folder.','In the Garage, select Prefabs, then move the Garage slots all the way to the right. The added bot will be there.']
    },
    ja: {
      'brand': 'Procelio Community Factory (非公式)',
      'howUpload': 'アップロード方法', 'howImport':'ゲームへのインポート方法', 'upload':'アップロード', 'login':'ログイン', 'register':'登録', 'logout':'ログアウト', 'language':'言語',
      'sortBy':'並び替え','uploadDate':'アップロード日','uploader':'投稿者','robotName':'機体名','about':'詳細',
      'howUploadTitle':'アップロード方法','howImportTitle':'ゲームへのインポート方法','botDetails':'Bot詳細','username':'アカウント名','password':'パスワード',
      'uploadBot':'Botをアップロード','description':'機体説明','botFile':'Botファイル','thumbnail':'サムネイル','previewImages':'プレビュー画像','cancel':'キャンセル',
      'thumbnailHelp':'サイトのサムネイルと同じ216:116の比率になるように切り抜いてください。保存時に1MB以内になるよう自動調整されます。',
      'cropHelp':'画像をドラッグして切り抜き位置を調整できます。マウスホイールで拡大・縮小できます。','thumbPreview':'サムネイルプレビュー','noPreview':'プレビュー画像は選択されていません。',
      'optional':'任意。Bot Detailsページに表示するプレビュー画像を複数添付できます。','downloadBot':'Botをダウンロード','deleteBot':'Botを削除','player':'プレイヤー','uploaded':'アップロード日',
      'previewGallery':'プレビュー画像','importInfo':'インポート情報','copy':'コピー','saveImport':'この1行を保存し、templatesフォルダのindex.fileに追記してください。','noDescription':'説明なし',
      'uploadSteps':['登録またはログインする。','アップロードボタンを押す。','必要事項を入力する。','サムネイル画像とボットデータをアップロードする。','プレビュー用の画像をアップロードする。'],
      'importSteps':['このページでインポートしたい機体のAboutボタンをクリックしてDownloadを選択し、表示された文字列を保存する。','ダウンロードしたファイルをtemplatesフォルダに配置する。','Downloadで表示された文字列をtemplatesフォルダにあるindex.fileへ追記する。','ガレージにてPrefabsを選択後、ガレージスロットを一番右端まで移動すると追加したボットがある。']
    }
  };
  function initialLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ja') return saved;
    const serverHint = document.documentElement.dataset.country;
    if (serverHint && serverHint.toUpperCase() === 'JP') return 'ja';
    return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
  }
  let current = initialLanguage();
  window.t = key => translations[current][key] ?? translations.en[key] ?? key;
  window.getLanguage = () => current;
  window.setLanguage = lang => {
    if (!translations[lang]) return;
    current = lang; localStorage.setItem(STORAGE_KEY, lang); document.documentElement.lang = lang === 'ja' ? 'ja' : 'en';
    applyStatic(); document.dispatchEvent(new CustomEvent('languagechange', {detail:{lang}}));
  };
  function text(id,key){ const el=document.getElementById(id); if(el) el.textContent=t(key); }
  function applyStatic(){
    text('howToUploadBtn','howUpload'); text('howToImportBtn','howImport'); text('uploadBtn','upload'); text('loginBtn','login'); text('registerBtn','register'); text('logoutBtn','logout'); text('languageBtn','language');
    text('sortLabel','sortBy'); text('sortUploadDate','uploadDate'); text('sortUploader','uploader'); text('sortRobotName','robotName');
    text('howToUploadTitle','howUploadTitle'); text('howToImportTitle','howImportTitle'); text('authUsernameLabel','username'); text('authPasswordLabel','password'); text('uploadModalTitle','uploadBot');
    text('robotNameLabel','robotName'); text('descriptionLabel','description'); text('botFileLabel','botFile'); text('thumbnailLabel','thumbnail'); text('previewImagesLabel','previewImages');
    text('cancelUploadBtn','cancel'); text('cropHelp','cropHelp'); text('thumbPreviewLabel','thumbPreview'); text('detailTitle','botDetails'); text('previewGalleryTitle','previewGallery'); text('importInfoTitle','importInfo'); text('copyImportInfo','copy'); text('importInfoHelp','saveImport');
    const upList=document.getElementById('howUploadList'); if(upList){upList.innerHTML=''; t('uploadSteps').forEach((s,i)=>{const li=document.createElement('li');li.innerHTML=`<strong>${s}</strong>${i===3?`<div class="help">First, export your bot from the game as a <code>.bot</code> file. In the Garage, select <strong>Prefabs → Local Export</strong>, then select the bot you want to export. After exporting, check the <code>templates</code> folder:</div><code>C:\Users\%user%\AppData\LocalLow\Ironshell Studios\Procelio\templates</code>`:i===4?` <span class="help">(${t('optional')})</span>`:''}`;upList.appendChild(li)});}
    const impList=document.getElementById('howToImportList'); if(impList){impList.innerHTML=''; t('importSteps').forEach((s,i)=>{const li=document.createElement('li');li.innerHTML=`<strong>${s}</strong>${i===1?`<div class="help"><code>C:\Users\%user%\AppData\LocalLow\Ironshell Studios\Procelio\templates</code></div>`:''}`;impList.appendChild(li)});}
    const opt=document.getElementById('previewOptional'); if(opt) opt.textContent=t('optional');
  }
  function bootI18n(){ applyStatic(); const btn=document.getElementById('languageBtn'); if(btn && !btn.dataset.i18nBound){ btn.dataset.i18nBound='1'; btn.addEventListener('click',()=>window.setLanguage(window.getLanguage()==='en'?'ja':'en')); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootI18n, {once:true}); else bootI18n();
})();
