(() => {
  const KEY = 'cf-language';
  const INITIAL = document.querySelector('meta[name="initial-language"]')?.content;
  const dict = {
    "How to upload":"アップロード方法",
    "How to import to game":"ゲームへのインポート方法",
    "Upload":"アップロード",
    "Login":"ログイン",
    "Register":"登録",
    "Logout":"ログアウト",
    "Language":"言語",
    "Sort by":"並び替え",
    "Upload date":"アップロード日",
    "Uploader":"アップロード者",
    "Robot name":"機体名",
    "How to upload":"アップロード方法",
    "How to import to game":"ゲームへのインポート方法",
    "Upload Bot":"Botをアップロード",
    "Robot name":"機体名",
    "Description":"説明",
    "Bot file":"Botファイル",
    "Thumbnail":"サムネイル",
    "Thumbnail preview":"サムネイルプレビュー",
    "Preview images":"プレビュー画像",
    "Optional. You can attach multiple images to show on the Bot Details page.":"任意。Bot Detailsページに表示する画像を複数添付できます。",
    "No preview images selected.":"プレビュー画像が選択されていません。",
    "Cancel":"キャンセル",
    "Bot Details":"Bot Details",
    "Player:":"プレイヤー：",
    "Uploaded:":"アップロード日：",
    "Download Bot":"Botをダウンロード",
    "Delete Bot":"Botを削除",
    "Import information":"インポート情報",
    "Copy":"コピー",
    "Copied":"コピーしました",
    "Save this line and append it to ":"この文字列を保存し、",
    " in your ":" にある",
    "templates":"templates",
    " folder.":" に追記してください。",
    "First, you need to export your bot from the game as a .bot file.":"まず、ゲーム内でBotを.botファイルとしてエクスポートする必要があります。",
    "In the Garage, select Prefabs → Local Export, then select the bot you want to export.":"ガレージで「Prefabs → Local Export」を選択し、エクスポートするBotを選択してください。",
    "After exporting, check the templates folder:":"エクスポート後、templatesフォルダを確認してください：",
    "Register or log in.":"登録またはログインする。",
    "Click the Upload button.":"Uploadボタンを押す。",
    "Enter the required information.":"必要事項を入力する。",
    "Upload the thumbnail image and bot data.":"サムネイル画像とBotデータをアップロードする。",
    "Preview images.":"プレビュー用画像をアップロードする。",
    "First, you need to export your bot from the game as a .bot file. In the Garage, select Prefabs → Local Export, then select the bot you want to export. After exporting, check the templates folder:":"まず、ゲーム内でBotを.botファイルとしてエクスポートする必要があります。ガレージで「Prefabs → Local Export」を選択し、エクスポートするBotを選択してください。エクスポート後、templatesフォルダを確認してください：",
    "First, you need to export your bot from the game as a .bot file.":"まず、ゲーム内でBotを.botファイルとしてエクスポートする必要があります。",
    "Download":"ダウンロード",
    "Download the bot file.":"Botファイルをダウンロード",
    "About":"詳細",
    "No description":"説明なし",
    "Please log in or register to upload a bot.":"Botをアップロードするにはログインまたは登録してください。",
    "Registration complete. Please log in.":"登録が完了しました。ログインしてください。",
    "Descending":"降順",
    "Ascending":"昇順",
    "bots":"Bot",
    "No bots are registered yet.":"登録されているBotはありません。",
    "Please select a thumbnail.":"サムネイルを選択してください。",
    "Invalid bot file.":"Botファイルが不正です。"
  };

  function translateText(text, lang) {
    if (lang === 'en') return Object.keys(dict).find(k => dict[k] === text) || text;
    for (const [en, ja] of Object.entries(dict)) if (text.trim() === en) return ja;
    return text;
  }

  function apply(lang) {
    document.documentElement.lang = lang === 'ja' ? 'ja' : 'en';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName)) continue;
      const original = node.nodeValue;
      const trimmed = original.trim();
      if (!trimmed) continue;
      const translated = translateText(trimmed, lang);
      if (translated !== trimmed) node.nodeValue = original.replace(trimmed, translated);
    }
    const btn = document.getElementById('languageBtn');
    if (btn) btn.textContent = lang === 'ja' ? 'Language: 日本語' : 'Language';
    window.__cfLanguage = lang;
  }

  function getInitial() {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ja' || saved === 'en') return saved;
    return INITIAL === 'ja' ? 'ja' : 'en';
  }

  function setLanguage(lang, save = true) {
    if (lang !== 'ja' && lang !== 'en') return;
    if (save) localStorage.setItem(KEY, lang);
    apply(lang);
  }

  window.setLanguage = setLanguage;
  window.getLanguage = () => window.__cfLanguage || getInitial();

  document.addEventListener('DOMContentLoaded', () => {
    const initial = getInitial();
    apply(initial);
    const btn = document.getElementById('languageBtn');
    if (btn) btn.onclick = () => setLanguage(getInitial() === 'en' ? 'ja' : 'en');
    const observer = new MutationObserver(() => {
      if (window.__cfLanguage === 'ja') apply('ja');
    });
    observer.observe(document.body, {childList:true, subtree:true});
  });
})();
