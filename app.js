/*
 * Kurzgefasst – App-Logik
 * Datenschutz: Geteilte URLs und Zusammenfassungen werden NICHT gespeichert.
 * Im Gerätespeicher liegen nur Backend-URL und Zugangsschlüssel.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    url: $('urlInput'), pageTitle: $('pageTitle'),
    status: $('status'), statusText: $('statusText'), error: $('error'),
    result: $('result'), resultTitle: $('resultTitle'), btnSummarize: $('btnSummarize'),
    resultBody: $('resultBody'), linkOriginal: $('linkOriginal'), btnCopy: $('btnCopy'),
    settings: $('settings'), backendUrl: $('backendUrl'), accessKey: $('accessKey'),
    pingResult: $('pingResult'), btnPing: $('btnPing'), btnSettings: $('btnSettings'),
    settingsForm: $('settingsForm')
  };
  const segButtons = Array.from(document.querySelectorAll('.seg'));
  const TIMEOUT_MS = 90000;

  let length = 'short';
  let lastSummary = '';

  /* ---------- Einstellungen (nur lokal) ---------- */

  function store(key, value) {
    try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (e) { /* privat/gesperrt */ }
  }
  function load(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }
  function settings() {
    return { backendUrl: load('kg.backendUrl'), accessKey: load('kg.accessKey') };
  }
  function openSettings() {
    const s = settings();
    els.backendUrl.value = s.backendUrl;
    els.accessKey.value = s.accessKey;
    setPing('', '');
    els.settings.showModal();
  }
  function setPing(text, cls) {
    els.pingResult.textContent = text;
    els.pingResult.className = 'hint' + (cls ? ' ' + cls : '');
  }

  els.btnSettings.addEventListener('click', openSettings);
  els.settingsForm.addEventListener('submit', () => {
    store('kg.backendUrl', els.backendUrl.value.trim());
    store('kg.accessKey', els.accessKey.value.trim());
  });
  els.btnPing.addEventListener('click', async () => {
    setPing('Teste …', '');
    try {
      const data = await callBackend(els.backendUrl.value.trim(), { key: els.accessKey.value.trim(), action: 'ping' });
      if (!data.ok) return setPing(data.error || 'Fehler', 'bad');
      if (!data.gemini) return setPing('Verbindung steht, aber Gemini ist nicht eingerichtet (GEMINI_API_KEY fehlt).', 'bad');
      setPing('Verbindung steht. Gemini ✓', 'ok');
    } catch (e) {
      setPing(e.message, 'bad');
    }
  });

  /* ---------- Geteilte Seite übernehmen ---------- */

  function extractUrl(shared) {
    const direct = (shared.url || '').trim();
    if (/^https?:\/\//i.test(direct)) return direct;
    const m = (shared.text || '').match(/https?:\/\/[^\s<>"']+/i);
    return m ? m[0].replace(/[).,;!?]+$/, '') : '';
  }

  function readShareFromHash() {
    if (!location.hash.startsWith('#share=')) return;
    let shared = {};
    try { shared = JSON.parse(decodeURIComponent(location.hash.slice(7))); } catch (e) { /* ignorieren */ }
    // URL-Fragment sofort entfernen, damit nichts in der Adresszeile/Historie stehen bleibt
    history.replaceState(null, '', location.pathname);

    const url = extractUrl(shared);
    els.url.value = url;
    const title = (shared.title || '').trim();
    if (title && title !== url) {
      els.pageTitle.textContent = title;
      els.pageTitle.hidden = false;
    }
    resetOutput();

    // Mit nur einem Anbieter gibt es nichts zu wählen: direkt loslegen.
    const s = settings();
    if (url && s.backendUrl && s.accessKey) summarize();
  }

  /* ---------- Länge ---------- */

  segButtons.forEach((btn) => btn.addEventListener('click', () => {
    length = btn.dataset.length;
    segButtons.forEach((b) => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    });
  }));

  /* ---------- Zusammenfassen ---------- */

  els.btnSummarize.addEventListener('click', () => summarize());

  async function summarize() {
    if (els.btnSummarize.disabled) return;
    const s = settings();
    if (!s.backendUrl || !s.accessKey) { openSettings(); return; }

    const url = els.url.value.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      showError('Bitte eine gültige Adresse eingeben oder die Seite über „Teilen“ senden.');
      return;
    }

    resetOutput();
    setBusy(true);
    els.statusText.textContent = 'Gemini liest die Seite …';
    els.status.hidden = false;

    try {
      // provider: 'gemini' hält die App auch mit einem noch nicht aktualisierten Backend lauffähig.
      const data = await callBackend(s.backendUrl, { key: s.accessKey, url, provider: 'gemini', length });
      if (!data.ok) throw new Error(data.error || 'Unbekannter Fehler.');
      showResult(data, url);
    } catch (e) {
      showError(e.message);
    } finally {
      els.status.hidden = true;
      setBusy(false);
    }
  }

  async function callBackend(backendUrl, payload) {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(backendUrl)) {
      throw new Error('Die Backend-URL muss eine Apps-Script-Web-App-Adresse sein (…/exec).');
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      // text/plain vermeidet einen CORS-Preflight, den Apps Script nicht beantwortet.
      // Die Daten stehen im Body, nicht in der Adresse.
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: ctrl.signal
      });
      const text = await res.text();
      try { return JSON.parse(text); } catch (e) {
        throw new Error('Unerwartete Antwort vom Backend. Ist die Web-App für „Jeder“ freigegeben?');
      }
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Zeitüberschreitung – die Seite war zu groß oder die KI zu langsam.');
      if (e instanceof TypeError) throw new Error('Keine Verbindung zum Backend.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  function setBusy(busy) {
    els.btnSummarize.disabled = busy;
    els.btnSummarize.classList.toggle('busy', busy);
  }

  function resetOutput() {
    els.error.hidden = true;
    els.result.hidden = true;
    els.resultBody.textContent = '';
    lastSummary = '';
  }

  function showError(msg) {
    els.error.textContent = msg;
    els.error.hidden = false;
  }

  function showResult(data, url) {
    lastSummary = data.summary || '';
    els.resultTitle.textContent = data.title || els.pageTitle.textContent || '';
    els.resultTitle.hidden = !els.resultTitle.textContent;
    els.resultBody.innerHTML = renderMarkdown(lastSummary);
    els.linkOriginal.href = url;
    els.result.hidden = false;
    els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  els.btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(lastSummary);
      flash(els.btnCopy, 'Kopiert ✓');
    } catch (e) {
      flash(els.btnCopy, 'Nicht möglich');
    }
  });

  function flash(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = old; }, 1500);
  }

  /* ---------- Minimaler, sicherer Markdown-Renderer ---------- */
  // Erst alles escapen, dann nur Überschriften, Listen und **fett** umwandeln.
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function inline(s) {
    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function renderMarkdown(md) {
    const out = [];
    let inList = false;
    let para = [];
    const flushPara = () => { if (para.length) { out.push('<p>' + para.map(inline).join(' ') + '</p>'); para = []; } };
    const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };

    md.replace(/\r/g, '').split('\n').forEach((raw) => {
      const line = raw.trim();
      let m;
      if (!line) { flushPara(); closeList(); return; }
      if ((m = line.match(/^#{1,6}\s+(.*)$/))) {
        flushPara(); closeList();
        out.push('<h3>' + inline(m[1].replace(/\*\*/g, '')) + '</h3>');
        return;
      }
      if ((m = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/))) {
        flushPara();
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(m[1]) + '</li>');
        return;
      }
      closeList();
      para.push(line);
    });
    flushPara(); closeList();
    return out.join('');
  }

  /* ---------- Start ---------- */

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* App funktioniert auch ohne */ });
  }
  readShareFromHash();
  window.addEventListener('hashchange', readShareFromHash);

  const s = settings();
  if (!s.backendUrl || !s.accessKey) openSettings();
})();
