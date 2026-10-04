# Local Chrome WhatsApp inventory delivery

This is the default provider in Settings → Inventory. It sends the existing
inventory message to the existing saved recipient using a Chrome extension in
the same profile as the user's WhatsApp Web session. It needs no Meta token.

## Install and enable

1. Download `https://ibta-ops.pages.dev/ibta-whatsapp-web.zip` from Inventory
   settings and extract it into a permanent folder. Developers can instead load
   `extension/whatsapp-web` directly.
2. Open `chrome://extensions` in the WhatsApp Chrome profile, enable Developer
   mode, choose Load unpacked, and select the folder containing `manifest.json`.
3. Reload IBTA and sign in as an administrator. Save the existing recipient
   number including country code, and complete all supervisor category balances.
4. In Settings → Inventory choose WhatsApp Web — Chrome, enable automatic
   sending, set a Saudi time, and save. The default is 16:59, before the existing
   17:00 manual-login cutoff. The connection status must show that the extension
   is connected and enabled on this device.

Enable on **one device only**: duplicate prevention is local to that Chrome
profile, not a cross-device server lock. Keep the device awake, Chrome running,
WhatsApp signed in, and the IBTA session valid before the prefetch time, one
minute before delivery. The extension cannot wake a sleeping device. Do not move
or delete its installation folder.

## Delivery and recovery

The extension uses a fixed UTC+3 Saudi calendar and Chrome alarms. It requests
a fresh, administrator-authorized inventory snapshot one minute before sending.
An existing healthy IBTA tab is used; otherwise a background IBTA tab is opened.
Authentication still needs to be valid in that tab. Only available category
counts, supervisor balances, labels and message settings are returned; trainee
records, Prometric credentials, auth tokens and database keys are not shared
with the extension. The automatic 17:00 sign-out remains unchanged.

At the configured time a dedicated WhatsApp tab is opened using the saved
phone number and exact report. The sender waits for the matching prefilled
draft and an unobstructed Send button, obtains a one-use approval for that tab,
rechecks the draft, and clicks once. It never overwrites another draft.

Snapshots must match the owner, recipient, scheduled time and Saudi date and
be less than five minutes old. Dispatch more than two minutes after the due
time is skipped. Missing, stale or incomplete data is not sent. An attempt is
recorded before opening WhatsApp and persisted across worker restarts; changing
the time does not send again after a sent or ambiguous outcome on the same day. There is no automatic retry after
failure or an uncertain outcome. Check the conversation before sending manually.

“Sent” means a new outgoing message appeared and the composer cleared. It does
not confirm server delivery or that the recipient read it. A missing WhatsApp
login, changed draft, blocked dialog or unrecognized UI yields failure or an
unknown outcome rather than a blind send. WhatsApp UI changes may require an
extension update.

If the popup shows the installed version but IBTA says the extension is not
connected after an extension Reload, reload the **IBTA page too**, or use Open
program and settings from the popup to open a fresh tab in that Chrome profile.
Existing content-script contexts are invalidated by extension reloads. Sign in
if needed, then save sending settings again to enable this device. The shared
automatic-sending checkbox alone does not enable a newly installed local device.
Check for “sending is enabled on this device”, “Fresh report ready” and a next
alarm dated today when testing. Choose a time at least three minutes ahead.

The extension popup refreshes the report and can stop sending on this device.
Stopping locally does not disable the shared setting; save the setting again
to re-enable this device. Disable and save in IBTA to turn off the shared
setting too. Switching to Meta stops this extension when saved on this device;
other previously configured devices must also stop or receive the updated
configuration before their own alarms.

Version 1.0.1 shows the actual local recipient, next alarm (including its date),
and fresh-report readiness in Settings and waits for the extension to acknowledge
schedule saves. Saving a time after that minute has started schedules tomorrow;
for a same-day check choose a time at least two minutes ahead. Saving the message
recipient also refreshes the local report immediately. Refresh send status requests
a fresh report and reads the local alarm again.

After a confirmed failure before any Send click (missing fresh report, WhatsApp
not ready/openable, or a mismatching draft), explicitly changing the time or
recipient and saving allows a new attempt. Sent, in-progress and ambiguous
outcomes stay blocked for the day to prevent duplicates. Updating the installed
unpacked extension requires replacing its files and pressing Reload in
`chrome://extensions`, then reloading IBTA and WhatsApp tabs.

## Permissions and validation

Manifest V3 permissions are `storage` and `alarms`, with host access limited to
the IBTA site and WhatsApp Web. No general `tabs` permission, cookie access,
download permission, external sending service or remotely executed code is used.
Local storage contains configuration, a temporary report and last attempt status.
This is an unpacked extension, not a Chrome Web Store installation.

`tests/whatsapp-web.test.cjs` checks Saudi scheduling, report freshness, origin
and owner restrictions, restart/duplicate prevention and one-use approval.
`tests/whatsapp-web-sender-browser.test.cjs` uses an isolated browser and mock
WhatsApp page for exact-draft sending and rejection paths. Inventory browser
tests check installation guards and the app bridge; cloud tests verify snapshot
privacy. A fresh isolated browser profile also verified the actual MV3 worker
boots. No test sends to a real recipient. The authenticated user's WhatsApp
DOM and actual delivery still require verification after installation.

The optional [Meta server provider](whatsapp-inventory.md) remains available;
its scheduler does not dispatch while the configured provider is Web.

Version 1.0.2 fixes a syntax error in the popup's last-attempt text that prevented
the popup from running. It displays the installed version, recipient, next alarm
and report readiness, and handles absent/rejected background replies explicitly.
The background also accepts its own extension page when opened in a browser tab.
`tests/whatsapp-web-extension-browser.test.cjs` loads the real MV3 package in a
fresh isolated profile and checks the popup/worker connection and Stop, plus
missing/invalid reply paths. The site build checks every extension script's
syntax before producing the ZIP. These checks do not enable delivery or send
external messages.

`tests/whatsapp-web-flow-browser.test.cjs` exercises the actual installed MV3
bridge, app configuration acknowledgment, snapshot, Chrome alarm, created tab,
sender approval and outgoing confirmation together using synthetic pages and a
fresh profile. Both live hostnames resolve to loopback and HTTP requests are
fulfilled locally or blocked. The browser-created WhatsApp tab is navigated to
its exact prepared URL after test routing attaches. No WhatsApp session, real
recipient or operational records are used. The test also reloads the extension,
verifies that the old page disconnects, and verifies recovery after page reload.
