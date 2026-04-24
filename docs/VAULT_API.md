# Vault CRM API — Glass Integration

## Endpoint

```
GET /crm/api/contacts/lookup
```

Mounted at `/crm` in Vault, so the full URL in local dev is:
```
http://u2-2.vault.localhost:3000/crm/api/contacts/lookup?email=someone@example.com
```

## Auth

Simple static Bearer token for local dev:
```
Authorization: Bearer glass-dev-token
```

**Before production:** Replace with proper API client auth (see `Api::ApiController` for the existing pattern using `ApiClient` model with HTTP Basic auth + scopes).

## Parameters

| Param | Type | Description |
|---|---|---|
| `email` | string | Contact email address (preferred lookup method) |
| `name` | string | First + last name (e.g., "John Doe") — fuzzy match |

One of `email` or `name` is required.

## Response

Returns a single JSON object with all data an AI sales coach needs:

```json
{
  "contact": {
    "id": 123,
    "name": "Jane Smith",
    "email": "jane@acme.com",
    "phone": "+14155551234",
    "title": "VP of Engineering",
    "department": "Engineering",
    "stage": "in_progress",
    "lead_score": 85,
    "customer_fit_score": 4.2,
    "current_ecommerce_platform": "BigCommerce",
    "primary_product_interest": "Shopify Plus",
    "engagement": {
      "emails_sent": 12,
      "emails_opened": 8,
      "email_replies": 3,
      "calls": 5,
      "connected_calls": 2
    }
  },
  "account": {
    "name": "Acme Corp",
    "domain": "acme.com",
    "industry": "Retail",
    "estimated_total_revenue_usd": 25000000,
    "gmv_usd_l365d": 15000000,
    "ecomm_platform": "BigCommerce",
    "plus_status": "prospect",
    "sales_notes": "Interested in migrating from BC. Budget concerns mentioned.",
    "fit_scores": { "d2c": 8.5, "b2b": 3.2, "retail_accel": 6.0 }
  },
  "shops": [...],
  "deals": [...],
  "recent_calls": [...],
  "recent_emails": [...],
  "notes": [...]
}
```

## Data Included

| Section | Source | What's in it |
|---|---|---|
| `contact` | `CRM::Contact` | Name, email, phone, title, stage, lead score, fit score, engagement stats |
| `account` | `CRM::Account` | Company info, revenue, GMV, platform, sales notes, fit scores |
| `shops` | `CRM::Shop` | Shop name, domain, plan, active status |
| `deals` | `CRM::Deal` | Deal pipeline: phase, status, close date, win/loss |
| `recent_calls` | `CRM::Call` | Last 10 calls: direction, disposition, duration, sentiment |
| `recent_emails` | `CRM::Email` | Last 10 emails: direction, subject, open/click status |
| `notes` | `CRM::Note` | Last 10 notes: body (truncated), author, date |

## Active Call Endpoint

```
GET /crm/api/active_call
```

### Parameters

| Param | Type | Description |
|---|---|---|
| `user_email` | string | The sales rep's email (Vault User email) |

### Response

If the rep is on an active call (via Twilio dialer):
```json
{
  "active": true,
  "call_id": 456,
  "call_status": "in_progress",
  "contact": { ... },
  "account": { ... },
  "shops": [...],
  "deals": [...],
  "recent_calls": [...],
  "recent_emails": [...],
  "notes": [...]
}
```

If not on a call:
```json
{
  "active": false
}
```

Active statuses checked: `queued`, `initiated`, `ringing`, `in_progress` (from `CRM::Call::ACTIVE_STATUSES`).

## Call Summary Endpoint

```
POST /crm/api/call_summary
```

Saves a Glass AI-generated call summary to the CRM.

### Parameters

| Param | Required | Description |
|---|---|---|
| `user_email` | Yes | Sales rep's email (Vault User) |
| `summary` | Yes | The AI-generated summary text |
| `call_id` | For dialer calls | `CRM::Call` ID — attaches note to this call |
| `contact_id` | For external calls | `CRM::Contact` ID |
| `contact_email` | Fallback | Contact email for lookup |
| `calendar_event_id` | For Meet calls | Google Calendar event ID — matched against `CRM::Call.external_id` for `source=google_meet` |
| `duration_seconds` | No | Call duration |

### Behavior

1. **Dialer call** (`call_id` provided): attaches note to existing `CRM::Call`
2. **Google Meet** (`calendar_event_id` provided): searches `CRM::Call` where `source=google_meet` and `external_id LIKE '{event_id}%'`. If found, attaches note. If not, falls through.
3. **Fallback**: creates `CRM::Activity` (type: Meeting) + note on the contact

All notes are prefixed with `🤖 AI Summary:`.

### Response

```json
{
  "success": true,
  "type": "dialer_call_note",
  "call_id": 158,
  "note_id": 19
}
```

Or for external meetings:
```json
{
  "success": true,
  "type": "external_meeting",
  "activity_id": 42,
  "note_id": 20
}
```

## Code Location

- **Contact Lookup Controller:** `engines/crm/app/controllers/crm/api/contacts_controller.rb`
- **Active Call Controller:** `engines/crm/app/controllers/crm/api/active_calls_controller.rb`
- **Call Summary Controller:** `engines/crm/app/controllers/crm/api/call_summaries_controller.rb`
- **Shared Serializers:** `engines/crm/app/controllers/crm/api/concerns/contact_serialization.rb`
- **Routes:** `engines/crm/config/routes.rb` (under `namespace :api`)
- **Branch:** `glass-contact-api` on u2-2 worktree (`/Users/shameel/trees/u2/u2-2`)

## Testing Locally

1. Seed CRM data: `shadowenv exec -- bin/rails dev:seed:crm:all`
2. Start Vault: `shadowenv exec -- dev s`
3. Test contact lookup:
```bash
curl -H "Authorization: Bearer glass-dev-token" \
  "http://u2-2.vault.localhost:3000/crm/api/contacts/lookup?email=test@example.com"
```
4. Test active call check:
```bash
curl -H "Authorization: Bearer glass-dev-token" \
  "http://u2-2.vault.localhost:3000/crm/api/active_call?user_email=rep@shopify.com"
```
