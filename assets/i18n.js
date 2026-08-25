(() => {
  const STORAGE_KEY = 'cf-language';
  const translations = {
    en: {
      'brand': 'Procelio Community Factory (Unofficial)',
      'howUpload': 'How to upload', 'howImport':'How to import to game', 'upload':'Upload', 'login':'Login', 'register':'Register', 'logout':'Logout', 'language':'Language',
      'reportProblem':'Report a problem','reportList':'Report list','reportTitle':'Report a problem','reportMessageLabel':'Problem report','reportContactLabel':'Contact (optional)','reportMessagePlaceholder':'Please describe the problem.','reportContactPlaceholder':'Twitter ID, Discord ID, email address, or anything else','sendReport':'Send report','reportSent':'Report submitted.','noReports':'No reports.','reportedBy':'Reported by','deleteReport':'Delete report','deleteReportConfirm':'Delete this report?','reportError':'Failed to submit the report.','reportListError':'Failed to load reports.', 'sortBy':'Sort by','uploadDate':'Upload date','uploader':'Uploader','robotName':'Robot name','about':'About','ascending':'Ascending','descending':'Descending',
      'howUploadTitle':'How to upload','howImportTitle':'How to import to game','botDetails':'Bot Details','username':'Username','password':'Password',
      'uploadBot':'Upload Bot','description':'Description','botFile':'Bot file','thumbnail':'Thumbnail','previewImages':'Preview images','cancel':'Cancel',
      'thumbnailHelp':'Crop to the same 216:116 ratio as the site thumbnail. The saved image is automatically adjusted to stay within 1 MB.',
      'cropHelp':'Drag the image to adjust the crop. Use the mouse wheel to zoom.','thumbPreview':'Thumbnail preview','noPreview':'No preview images selected.',
      'optional':'Optional. You can attach multiple images to show on the Bot Details page.','downloadBot':'Download Bot','share':'Share','shareTitle':'Share bot','shareHelp':'Copy or share this link to open this Bot Details page.','deleteBot':'Delete Bot','player':'Player','uploaded':'Uploaded',
      'previewGallery':'Preview images','importAbout':'About','importDownload':'Download','previewImageAlt':'Bot preview','importInfo':'Import information','copy':'Copy','saveImport':'Save this line and append it to index.file in your templates folder.','noDescription':'No description','registrationComplete':'Registration complete. Please log in.','importInfoError':'Failed to get import information.','downloadError':'Failed to download the bot file.','copied':'Copied','adminDeleteConfirm':'Delete this bot as administrator?','deleteConfirm':'Delete your bot?','cannotUndo':'This cannot be undone.','uploadLoginRequired':'Please log in or register to upload a bot.','thumbnailRequired':'Please select a thumbnail.',
      'uploadSteps':['Register or log in.','Click the Upload button.','Upload the bot data.','Enter the required information.','Upload the thumbnail image and preview images.'],
      'uploadStep4Help':'First, export your bot from the game as a <code>.bot</code> file. In the Garage, select <strong>Prefabs → Local Export</strong>, then select the bot you want to export. After exporting, check the <code>templates</code> folder:',
      'templatePath':'C:\\Users\\%user%\\AppData\\LocalLow\\Ironshell Studios\\Procelio\\templates',
      'bot':'bot','bots':'bots','noDescription':'No description','signedInAs':'Signed in as','admin':'Admin','saveImport':'Save this line and append it to index.file in your templates folder.','importSteps':['Click the About button for the robot you want to import on this page, then select Download. Save the displayed text.','Place the downloaded file in the templates folder.','Append the displayed text from the Download dialog to the index.file in the templates folder.','In the Garage, select Prefabs, then move the Garage slots all the way to the right. The added bot will be there.']
    },
    ja: {
      'brand': 'Procelio Community Factory (非公式)',
      'howUpload': 'アップロード方法', 'howImport':'ゲームへのインポート方法', 'upload':'アップロード', 'login':'ログイン', 'register':'登録', 'logout':'ログアウト', 'language':'言語',
      'reportProblem':'問題を報告','reportList':'報告一覧','reportTitle':'問題を報告','reportMessageLabel':'問題の内容','reportContactLabel':'連絡先（任意）','reportMessagePlaceholder':'問題の内容を入力してください。','reportContactPlaceholder':'TwitterのID、DiscordのID、メールアドレス、その他なんでも','sendReport':'報告する','reportSent':'報告を送信しました。','noReports':'報告はありません。','reportedBy':'報告者','deleteReport':'報告を削除','deleteReportConfirm':'この報告を削除しますか？','reportError':'報告の送信に失敗しました。','reportListError':'報告一覧の取得に失敗しました。', 'sortBy':'並び替え','uploadDate':'アップロード日','uploader':'投稿者','robotName':'機体名','about':'詳細','ascending':'昇順','descending':'降順',
      'howUploadTitle':'アップロード方法','howImportTitle':'ゲームへのインポート方法','botDetails':'Bot詳細','username':'アカウント名','password':'パスワード',
      'uploadBot':'Botをアップロード','description':'機体説明','botFile':'Botファイル','thumbnail':'サムネイル','previewImages':'プレビュー画像','cancel':'キャンセル',
      'thumbnailHelp':'サイトのサムネイルと同じ216:116の比率になるように切り抜いてください。保存時に1MB以内になるよう自動調整されます。',
      'cropHelp':'画像をドラッグして切り抜き位置を調整できます。マウスホイールで拡大・縮小できます。','thumbPreview':'サムネイルプレビュー','noPreview':'プレビュー画像は選択されていません。',
      'optional':'任意。Bot詳細ページに表示するプレビュー画像を複数添付できます。','downloadBot':'Botをダウンロード','share':'共有','shareTitle':'Botを共有','shareHelp':'このリンクをコピーまたは共有すると、このBotの詳細ページを開けます。','deleteBot':'Botを削除','player':'プレイヤー','uploaded':'アップロード日',
      'previewGallery':'プレビュー画像','importAbout':'詳細','importDownload':'ダウンロード','previewImageAlt':'Botプレビュー','importInfo':'インポート情報','copy':'コピー','saveImport':'この1行を保存し、templatesフォルダのindex.fileに追記してください。','noDescription':'説明なし','registrationComplete':'登録が完了しました。ログインしてください。','importInfoError':'インポート情報の取得に失敗しました。','downloadError':'Botファイルのダウンロードに失敗しました。','copied':'コピーしました','adminDeleteConfirm':'管理者としてこのBotを削除しますか？','deleteConfirm':'このBotを削除しますか？','cannotUndo':'この操作は元に戻せません。','uploadLoginRequired':'Botをアップロードするにはログインまたは登録してください。','thumbnailRequired':'サムネイルを選択してください。',
      'uploadSteps':['登録またはログインする。','アップロードボタンを押す。','ボットデータをアップロードする。','必要事項を入力する。','サムネイル画像とプレビュー用の画像をアップロードする。'],
      'uploadStep4Help':'まずゲーム内でボットを.botファイルとしてエクスポートする必要があります。ガレージにて<strong>Prefabs → Local Export</strong>を選択し、エクスポートするボットを選択してください。エクスポート後、<code>templates</code>フォルダを確認してください。',
      'templatePath':'C:\\Users\\%user%\\AppData\\LocalLow\\Ironshell Studios\\Procelio\\templates',
      'importSteps':['このページでインポートしたい機体の詳細ボタンをクリックしてダウンロードを選択し、表示された文字列を保存する。','ダウンロードしたファイルをtemplatesフォルダに配置する。','ダウンロードで表示された文字列をtemplatesフォルダにあるindex.fileへ追記する。','ガレージにてPrefabsを選択後、ガレージスロットを一番右端まで移動すると追加したボットがある。']
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
  function renderHowToUpload(){
    const title=document.getElementById('howToUploadTitle');
    if(title) title.textContent=t('howUploadTitle');
    const list=document.getElementById('howToUploadList');
    if(!list) return;
    list.innerHTML='';
    const steps=t('uploadSteps');
    steps.forEach((s,i)=>{
      const li=document.createElement('li');
      li.innerHTML=`<strong>${s}</strong>`;
      if(i===3){
        const help=document.createElement('div'); help.className='help'; help.innerHTML=t('uploadStep4Help');
        const path=document.createElement('code'); path.textContent=t('templatePath');
        li.append(help,path);
      } else if(i===4){
        const opt=document.createElement('span'); opt.className='help'; opt.textContent = current === 'ja' ? '（プレビュー用の画像は任意です。）' : ' (Preview images are optional.)'; li.append(opt);
      }
      list.appendChild(li);
    });
  }
  function renderHowToImport(){
    const title=document.getElementById('howToImportTitle');
    if(title) title.textContent=t('howImportTitle');
    const list=document.getElementById('howToImportList');
    if(!list) return;
    list.innerHTML='';
    t('importSteps').forEach((s,i)=>{
      const li=document.createElement('li');
      li.innerHTML=`<strong>${s}</strong>`;
      if(i===1){ const path=document.createElement('code'); path.textContent=t('templatePath'); const help=document.createElement('div'); help.className='help'; help.appendChild(path); li.appendChild(help); }
      list.appendChild(li);
    });
  }
  function applyStatic(){
    text('howToUploadBtn','howUpload'); text('howToImportBtn','howImport'); text('uploadBtn','upload'); text('loginBtn','login'); text('registerBtn','register'); text('logoutBtn','logout'); text('languageBtn','language');
    text('sortLabel','sortBy'); text('sortUploadDate','uploadDate'); text('sortUploader','uploader'); text('sortRobotName','robotName');
    text('reportProblemLink','reportProblem'); text('reportListLink','reportList'); text('reportTitle','reportTitle'); text('reportMessageLabel','reportMessageLabel'); text('reportContactLabel','reportContactLabel'); text('submitReportBtn','sendReport'); text('reportListTitle','reportList'); text('cancelReportBtn','cancel'); const rm=document.getElementById('reportMessage'); if(rm) rm.placeholder=t('reportMessagePlaceholder'); const rc=document.getElementById('reportContact'); if(rc) rc.placeholder=t('reportContactPlaceholder');
    text('howToUploadTitle','howUploadTitle'); text('howToImportTitle','howImportTitle'); text('shareTitle','shareTitle'); text('shareHelp','shareHelp'); text('shareCopy','copy'); text('authUsernameLabel','username'); text('authPasswordLabel','password'); text('uploadModalTitle','uploadBot');
    text('robotNameLabel','robotName'); text('descriptionLabel','description'); text('botFileLabel','botFile'); text('thumbnailLabel','thumbnail'); text('previewImagesLabel','previewImages');
    text('cancelUploadBtn','cancel'); text('cropHelp','cropHelp'); text('thumbPreviewLabel','thumbPreview'); text('detailTitle','botDetails'); text('previewGalleryTitle','previewGallery'); text('importInfoTitle','importInfo'); text('copyImportInfo','copy'); text('importInfoHelp','saveImport');
    renderHowToUpload(); renderHowToImport();
    const opt=document.getElementById('previewOptional'); if(opt) opt.textContent=t('optional');
  }
  window.refreshI18n = applyStatic;
  window.renderHowToI18n = () => { renderHowToUpload(); renderHowToImport(); };
  window.refreshI18n = applyStatic;
  function bootI18n(){ applyStatic(); const btn=document.getElementById('languageBtn'); if(btn && !btn.dataset.i18nBound){ btn.dataset.i18nBound='1'; btn.addEventListener('click',()=>window.setLanguage(window.getLanguage()==='en'?'ja':'en')); } document.addEventListener('languagechange',()=>{ renderHowToUpload(); renderHowToImport(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootI18n, {once:true}); else bootI18n();
})();
