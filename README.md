# Kurzgefasst – Webseiten per „Teilen“ zusammenfassen

In Chrome auf dem Handy: **Teilen → Kurzgefasst → Claude, Gemini oder Groq**.

```
Handy (Chrome) ──Teilen──▶ Kurzgefasst-App (GitHub Pages, läuft lokal)
                                │  URL + Zugangsschlüssel (HTTPS, im Body)
                                ▼
                     Apps-Script-Backend (dein Google-Konto)
                                │  lädt Seitentext
                                ▼
              Claude-API  ·  Gemini-API  ·  Groq-API
```

## Aufbau dieses Repos
- Hauptverzeichnis (`index.html`, `app.js`, `sw.js` …) – die Web-App, ausgeliefert über GitHub Pages
- `backend/Code.gs` – das Google-Apps-Script-Backend (nur zur Versionierung, läuft in Apps Script)

---

## 1. Backend einrichten (ca. 10 Min.)

1. **script.google.com** öffnen → *Neues Projekt* → Namen geben, z. B. „Kurzgefasst Backend“.
2. Den Inhalt von `Code.gs` komplett in den Editor einfügen und speichern.
3. **API-Schlüssel besorgen:**
   - Claude: console.anthropic.com → *API Keys* → neuen Schlüssel anlegen und unter *Billing* Guthaben aufladen.
     **Wichtig:** Das claude.ai-Abo (Pro/Max) gilt nicht für die API – die API wird separat nach Verbrauch abgerechnet.
   - Gemini: aistudio.google.com → *Get API key*.
     **Datenschutz:** Im kostenlosen Kontingent darf Google Eingaben zur Produktverbesserung nutzen.
     Aktiviere die Abrechnung für das Projekt, dann gilt das nicht.
   - Groq (kostenlos): console.groq.com → anmelden → *API Keys* → *Create API Key*.
     Groq nutzt Eingaben laut eigenen Bedingungen nicht zum Training.
4. Links **Projekteinstellungen (Zahnrad) → Skripteigenschaften** → hinzufügen:
   | Eigenschaft | Wert |
   |---|---|
   | `ANTHROPIC_API_KEY` | dein Claude-Schlüssel |
   | `GEMINI_API_KEY` | dein Gemini-Schlüssel |
   | `GROQ_API_KEY` | dein Groq-Schlüssel |
   | `CLAUDE_MODEL` *(optional)* | Standard: `claude-sonnet-5-5` (günstiger: `claude-haiku-5-5`) |
   | `GEMINI_MODEL` *(optional)* | Standard: `gemini-flash-latest` |
   | `GROQ_MODEL` *(optional)* | Standard: `openai/gpt-oss-120b` |
   | `GROQ_MAX_CHARS` *(optional)* | Standard: `18000` – Seitentext für Groq, wegen des Gratis-Limits pro Minute gekürzt |
5. Im Editor oben die Funktion **`zugangsschluesselErzeugen`** auswählen → *Ausführen* → Berechtigungen bestätigen.
   Im Ausführungsprotokoll steht dein **Zugangsschlüssel** – kopieren.
6. **Bereitstellen → Neue Bereitstellung** → Typ *Web-App*:
   - *Ausführen als:* **Ich**
   - *Zugriff:* **Jeder**
   → *Bereitstellen* → die **Web-App-URL** (endet auf `/exec`) kopieren.

> Warum „Jeder“? Die App ruft das Backend ohne Google-Anmeldung auf. Geschützt ist es durch den
> Zugangsschlüssel: Ohne ihn lehnt das Backend jede Anfrage ab.

## 2. App auf GitHub Pages veröffentlichen (ca. 5 Min.)

1. Die App-Dateien liegen bereits im Hauptverzeichnis dieses Repos.
   Das Repo darf **öffentlich** sein – es enthält keinerlei Schlüssel oder Daten.
   (GitHub Pages für private Repos braucht einen bezahlten GitHub-Plan.)
2. **Settings → Pages** → *Source: Deploy from a branch* → Branch `main`, Ordner `/ (root)` → *Save*.
3. Nach ca. 1 Minute ist die App erreichbar unter `https://kurzgefasstapp.github.io/Summarize_App/`.

## 3. Auf dem Handy installieren

1. Die GitHub-Pages-Adresse in **Chrome** öffnen.
2. Die Einstellungen öffnen sich automatisch: **Backend-URL** und **Zugangsschlüssel** eintragen →
   *Verbindung testen* → *Speichern*.
3. Chrome-Menü **⋮ → App installieren** (oder *Zum Startbildschirm hinzufügen*).
4. Fertig. „Kurzgefasst“ erscheint jetzt im **Teilen-Menü**.

## Benutzung
Auf einer Seite in Chrome **⋮ → Teilen → Kurzgefasst** → *Kurz* oder *Ausführlich* wählen →
**Claude**, **Gemini** oder **Groq** antippen.

---

## Datenschutz & Sicherheit
- **Nichts wird gespeichert:** Die App speichert nur Backend-URL und Zugangsschlüssel auf deinem Gerät.
  Das Backend schreibt keine URLs, Inhalte oder Zusammenfassungen mit.
- **Die geteilte URL geht nicht an GitHub:** Der Service Worker fängt den Teilen-Vorgang auf dem Gerät ab
  und reicht die URL nur im URL-Fragment (`#…`) weiter – das verlässt das Gerät nie.
- **API-Schlüssel** liegen ausschließlich in den Skripteigenschaften, nie im Code.
- **Zugangsschlüssel** (zufällig, 64 Zeichen) schützt vor fremder Nutzung, dazu ein Limit von 30 Anfragen pro 10 Minuten.
- **Alles über HTTPS**, Daten im Anfrage-Body. Die App hat eine strenge Content-Security-Policy.
- **Was trotzdem jemand sieht:** Google (Apps Script ruft die Seite ab) und der gewählte KI-Anbieter
  (verarbeitet den Inhalt). Die Claude-API nutzt API-Daten standardmäßig nicht zum Training,
  die bezahlte Gemini-API ebenfalls nicht – das kostenlose Gemini-Kontingent schon.
  Groq nutzt Eingaben laut Vertrag nicht zum Training, auch im Gratis-Plan nicht.

## Grenzen
- Seiten hinter **Login oder Paywall** kann das Backend nicht lesen.
- Seiten, die ihren Text erst per **JavaScript** nachladen, liefern oft „Kaum Text gefunden“.

## Fehlerbehebung
| Problem | Lösung |
|---|---|
| App erscheint nicht im Teilen-Menü | Sie muss *installiert* sein (Schritt 3). Danach Chrome einmal schließen. Kann 1–2 Min. dauern. |
| „Zugang verweigert“ | Zugangsschlüssel in den App-Einstellungen prüfen. |
| „Unerwartete Antwort vom Backend“ | Bereitstellung muss *Zugriff: Jeder* haben; URL muss auf `/exec` enden. |
| „Gemini-Fehler (404)“ | Modellname `GEMINI_MODEL` in den Skripteigenschaften prüfen. |
| „Gemini-Kontingent erschöpft“ | Freies Kontingent aufgebraucht – Claude nehmen oder später erneut versuchen. |
| „Claude-API-Guthaben aufgebraucht“ | console.anthropic.com → *Billing* → Guthaben aufladen. |
| „Claude ist nicht eingerichtet“ | Skripteigenschaft `ANTHROPIC_API_KEY` fehlt. |
| „Groq ist nicht eingerichtet“ | Skripteigenschaft `GROQ_API_KEY` fehlt. |
| „Groq-Gratislimit erreicht“ | Kurz warten. Passiert es bei jeder langen Seite: `GROQ_MAX_CHARS` auf z. B. `12000` setzen. |

## Änderungen später
- **Backend geändert?** *Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Version: Neue Version*.
  Die URL bleibt gleich.
- **App geändert?** In `sw.js` die Zeile `const CACHE = 'kurzgefasst-v5'` hochzählen (v6, v7 …),
  damit das Handy die neue Version lädt.
