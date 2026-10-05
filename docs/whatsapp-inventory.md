# Daily WhatsApp inventory report

Settings → Inventory contains an automatic sending switch and a Saudi time input.
The default is 16:59, one minute before the existing 17:00 manual-login cutoff.
Choose **WhatsApp Web — Chrome** for the local device integration described in
[the Chrome setup guide](whatsapp-web.md). This is the default provider and needs
the device awake, Chrome running, WhatsApp signed in and a valid TrainFlow session.

The optional **WhatsApp Business API** provider described below uses the database
scheduler and works when browsers are closed or signed out. It snapshots
the current inventory once per Saudi calendar day and sends to the existing saved
WhatsApp number. It does not wait for a browser session or delay sign-out.

Automatic sending remains disabled until configured. The Meta scheduler does
not dispatch when Web is selected. No messages or test messages were sent during
setup.

## Connect the official sending service

1. Set up [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started).
   Obtain the sending Phone Number ID and a production system-user access token
   with `whatsapp_business_messaging` permission.
2. Submit an approved text template with **six positional body variables** and
   no additional header/button variables. For an Arabic report use `ar` and this
   body (the counts within each section are separated by ` · `):

   ```text
   تقرير رصيد الأكواد اليومي
   التاريخ: {{1}}

   الأكواد معايا:
   {{2}}

   الأكواد مع {{3}}:
   {{4}}

   إجمالي الأكواد:
   {{5}}
   الإجمالي الكلي: {{6}}
   ```

   Variables: date; available counts by category; supervisor name; supervisor
   balances by category; totals by category; overall total. The template contains
   the same inventory information as the existing manual message. Meta controls
   template approval and service charges. An English template uses the same six
   variables; select its exact approved language code and match the inventory
   message language.
3. Save the recipient number and supervisor name in the existing message settings.
   Fill every supervisor category balance in Inventory.
4. Choose **WhatsApp Business API**, then enter Phone Number ID, approved template name, language, and access token in
   Settings → Inventory. Choose a time, enable sending, and save.

The token is stored encrypted in Supabase Vault. It is never returned to the
browser, stored in localStorage, included in the program backup, or written to
delivery logs. Leaving the token field blank retains the existing saved token.
Only active administrators can configure or read delivery settings. Network
functions and private delivery tables cannot be called/read by app users directly.

## Status and duplicate prevention

The scheduler runs every minute, evaluates `Asia/Riyadh`, and locks the single
configuration row before dispatch. One attempt is recorded per Saudi day.
Changing the time after an attempt does not send another message that day.
Enabling sending after the selected time catches up that day on the next
scheduler run, unless that day's attempt has already been recorded.
Disabling the switch stops future dispatches; it cannot retract a queued message.

“Accepted” means Meta returned a message ID, not that the recipient received it.
Actual delivery is checked in the Meta account. A rejected, missing, or ambiguous
response is shown in Settings; the scheduler does not automatically retry an
ambiguous outcome and risk duplicate messages. Check the service account before
changing/retrying an unsuccessful setup. Failed configuration/count checks are
also logged without storing tokens or provider response bodies.

All database tests in `tests/inventory-delivery-database.sql` use a transaction
and roll back fixture data, Vault secrets and HTTP queues before commit. pg_net
only starts HTTP requests after commit, so these tests never send externally.
