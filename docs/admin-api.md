# Admin API (`/api/admin/v1`)

Platform-level API for embedding wacrm as the WhatsApp engine of
another system (one wacrm account per tenant of that system). It
provisions accounts and API keys without anyone signing up; after
that, the external system uses the [public API](./public-api.md) with
the tenant's key.

> **Migration required:** apply
> `supabase/migrations/040_account_external_ref.sql`.

## Authentication

Set `WACRM_ADMIN_TOKEN` (min. 32 chars) on the server and send it as a
bearer token:

```
Authorization: Bearer <WACRM_ADMIN_TOKEN>
```

With the variable unset, every admin request returns `401` — the admin
API is off by default. The token can act on **any** account: keep it
only in the external system's server-side secrets.

## Endpoints

### `POST /api/admin/v1/accounts`

Find-or-create the account for a tenant and mint an API key with the
integration scopes (`messages:send`, `messages:read`, `contacts:read`,
`contacts:write`, `conversations:read`, `webhooks:manage`).

```bash
curl -X POST https://your-crm.example.com/api/admin/v1/accounts \
  -H "Authorization: Bearer $WACRM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "external_ref": "biz-123", "name": "Ferretería López", "key_name": "MVenta" }'
```

| Field          | Required | Notes                                                            |
| -------------- | -------- | ---------------------------------------------------------------- |
| `external_ref` | yes      | The tenant's id in your system. Letters, digits, `_ . : -`.      |
| `name`         | yes      | Account name (used only when the account is created).           |
| `email`        | no       | Owner login email. Default: `<external_ref>@WACRM_PROVISION_EMAIL_DOMAIN`. |
| `key_name`     | no       | API key name. Default `External integration`.                    |

Response — `201` when the account was created, `200` when it existed:

```json
{
  "data": {
    "account_id": "…",
    "account_name": "Ferretería López",
    "owner_email": "biz-123@provisioned.wacrm.local",
    "created": true,
    "api_key": "wacrm_live_…",
    "key_prefix": "wacrm_live_a1b2c3d4",
    "scopes": ["messages:send", "…"]
  }
}
```

`api_key` is returned exactly once. Calling again for the same
`external_ref` **revokes** the previous key with that `key_name` and
returns a new one (key rotation). Error codes: `email_taken` (409).

### `POST /api/admin/v1/accounts/{id}/login-link`

One-time sign-in URL for the account owner — used by an operator to
open the dashboard and connect the WhatsApp number. Optional body
`{ "next": "/settings" }`.

```json
{ "data": { "url": "https://your-crm.example.com/auth/callback?token_hash=…&type=magiclink&next=%2Fsettings" } }
```

The link is single-use and expires with Supabase's OTP expiry.
