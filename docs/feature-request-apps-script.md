# Feature Request — Google Apps Script setup

The in-app **Settings → Feedback → Request a Feature** form POSTs each idea to a
Google Apps Script Web App. The script appends a row to a Google Sheet **and**
emails the team. No backend or paid service required.

The app reads the endpoint from `EXPO_PUBLIC_FEATURE_REQUEST_URL`. Until that's
set, the form is visible but shows a "not enabled in this build" notice and
won't send.

## One-time setup (~5 minutes)

1. **Create the Sheet.** Go to <https://sheets.new>, name it e.g.
   `Link – Feature Requests`. (The script adds a header row automatically.)

2. **Open Apps Script.** In that Sheet: **Extensions → Apps Script**.

3. **Paste the code.** Delete the starter `function myFunction() {}` and paste
   the entire **Code.gs** below. Save (💾).

4. **Deploy as a Web App.**
   - Click **Deploy → New deployment**.
   - Gear icon → **Web app**.
   - **Execute as:** *Me*.
   - **Who has access:** *Anyone*. ← required so the app can POST without login.
   - Click **Deploy**, then **Authorize access** and approve the permissions
     (Sheets + Gmail/MailApp). The "unverified app" screen is expected for your
     own script — choose *Advanced → Go to (project)*.
   - Copy the **Web app URL** (ends in `/exec`).

5. **Wire it into the app.** Put the URL in `Link/.env`:

   ```bash
   EXPO_PUBLIC_FEATURE_REQUEST_URL=https://script.google.com/macros/s/XXXX/exec
   ```

   Restart Expo with a cleared cache so the new env var is bundled:

   ```bash
   npx expo start -c
   ```

6. **Test.** Open the app → Settings → Request a Feature → send a test note.
   A row should appear in the Sheet and an email should arrive at both
   addresses.

> Changing the script later? Use **Deploy → Manage deployments → Edit → New
> version** so the same `/exec` URL keeps working. A brand-new deployment makes
> a new URL you'd have to paste again.

## Code.gs

```javascript
// Recipients for every feature request notification.
const NOTIFY_EMAILS = ['adenharris@icloud.com', 'Kauh.evan@gmail.com'];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Add a header row the first time we ever write.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Submitted At', 'Message', 'Name', 'Email',
        'User ID', 'Platform', 'App Version',
      ]);
    }

    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.message || '',
      data.name || '',
      data.email || '',
      data.userId || '',
      data.platform || '',
      data.appVersion || '',
    ]);

    const subject = 'Link — New Feature Request';
    const body =
      'A new feature request was submitted in Link:\n\n' +
      (data.message || '(no message)') + '\n\n' +
      '— From: ' + (data.name || 'Anonymous') +
      (data.email ? ' <' + data.email + '>' : '') + '\n' +
      '— Platform: ' + (data.platform || 'unknown') +
      ' · App ' + (data.appVersion || 'unknown') + '\n' +
      '— User: ' + (data.userId || 'unknown') + '\n' +
      '— Submitted: ' + (data.submittedAt || new Date().toISOString());

    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(','),
      subject: subject,
      body: body,
      replyTo: data.email || undefined,
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Notes

- `MailApp` sends from the Google account that owns the script. Consumer Gmail
  allows ~100 recipients/day — far more than enough here.
- The app sends the body as `text/plain` on purpose: Apps Script Web Apps don't
  answer CORS preflight (`OPTIONS`), and `text/plain` avoids triggering one.
  `doPost` parses the JSON string itself.
- To stop collecting requests, blank out `EXPO_PUBLIC_FEATURE_REQUEST_URL` and
  rebuild — the form will show the "not enabled" notice and won't send.
