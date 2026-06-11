# Trading Platform Full API Reference
> Base URL: `https://yourdomain.com/api`  
> All requests/responses: `Content-Type: application/json`  
> Protected routes require: `Authorization: Bearer <access_token>`

---

## Authentication Flow

```
Register → Verify Email → Login → Get Tokens → Use Access Token
                                              → Refresh when expired
                                              → Logout
```

---

## ── PHASE 1 · AUTH ──────────────────────────────────────────

### `POST /auth/register`
Register a new user. Sends verification email.

**Rate limit:** 5 per hour per IP

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Passw0rd!",
  "full_name": "Ahmed Hassan"
}
```
> Password rules: min 8 chars, must include uppercase, lowercase, number, special char

**Response `201`:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email."
}
```

**Errors:** `409` email exists · `422` validation failed

---

### `GET /auth/verify-email?token=<TOKEN>`
Verify email via link sent to user. (Frontend renders a page that hits this.)

**Response `200`:**
```json
{ "success": true, "message": "Email verified successfully. You can now log in." }
```

**Errors:** `400` invalid/expired token

---

### `POST /auth/resend-verification`
Resend verification email.

**Rate limit:** 3 per hour per IP

**Body:** `{ "email": "user@example.com" }`

**Response `200`:** Always returns success (prevents email enumeration)

---

### `POST /auth/login`
Login and receive tokens.

**Rate limit:** 10 per 15 min per IP · Account locks after 5 failed attempts (30 min)

**Body:**
```json
{ "email": "user@example.com", "password": "Passw0rd!" }
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Ahmed Hassan",
      "is_admin": false
    }
  }
}
```

**Errors:** `401` invalid credentials · `403` not verified / suspended · `423` account locked

---

### `POST /auth/refresh`
Get a new access token using the refresh token. Refresh token is rotated on each use.

**Body:** `{ "refresh_token": "eyJ..." }`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900
  }
}
```

---

### `POST /auth/logout` 🔒
Revoke tokens.

**Body (optional):** `{ "refresh_token": "eyJ..." }`

**Response `200`:** `{ "success": true, "message": "Logged out successfully" }`

---

### `POST /auth/forgot-password`
Request password reset email.

**Rate limit:** 3 per hour

**Body:** `{ "email": "user@example.com" }`

**Response `200`:** Always same response (prevents enumeration)

---

### `POST /auth/reset-password`
Set new password using reset token.

**Body:**
```json
{
  "token": "abc123...",
  "password": "NewPassw0rd!"
}
```

**Response `200`:** `{ "success": true, "message": "Password reset successfully." }`

---

### `GET /auth/me` 🔒
Get current user profile + wallet balance.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Ahmed Hassan",
      "is_verified": true,
      "kyc_status": "none",
      "two_fa_enabled": false,
      "last_login_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "wallet": {
      "balance": 1250.50,
      "locked": 100.00,
      "available": 1150.50
    }
  }
}
```

---

## ── PHASE 2 · WALLET & DEPOSIT ──────────────────────────────

### `GET /wallet/balance` 🔒
Get user's USDT wallet balance.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "balance": 1250.50000000,
    "locked": 100.00000000,
    "available": 1150.50000000
  }
}
```

---

### `GET /wallet/transactions` 🔒
Transaction history for user's wallet.

**Query params:** `?page=1&limit=20&type=deposit|withdrawal|trade_buy|trade_sell|fee|refund`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "deposit",
        "amount": "500.00000000",
        "balance_before": "750.50000000",
        "balance_after": "1250.50000000",
        "ref_type": "deposit",
        "ref_id": "uuid",
        "description": "Deposit 0.01 BTC (≈500.00 USDT)",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "total": 45,
    "page": 1,
    "pages": 3
  }
}
```

---

### `GET /deposit/peers` 🔒
List all 10 supported coins with their networks.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "BTC": {
      "name": "Bitcoin",
      "networks": [{ "id": "btc", "label": "Bitcoin (BTC)" }],
      "minDeposit": 0.0001,
      "minWithdraw": 0.001,
      "withdrawFee": 0.0005
    },
    "ETH": { "name": "Ethereum", "networks": [...], "minDeposit": 0.01, ... },
    "BNB": { ... },
    "XRP": { ..., "hasMemo": true },
    "ADA": { ... },
    "SOL": { ... },
    "DOGE": { ... },
    "TRX": { ... },
    "LTC": { ... },
    "MATIC": { ... }
  }
}
```

---

### `GET /deposit/address/:coin` 🔒
Get or generate deposit address for a specific coin.

**URL param:** `coin` = BTC, ETH, BNB, XRP, ADA, SOL, DOGE, TRX, LTC, MATIC  
**Query param:** `?network=btc|eth|bsc|...` (optional, uses default if not specified)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "coin": "BTC",
    "network": "btc",
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "memo": null,
    "network_label": "Bitcoin (BTC)",
    "min_deposit": 0.0001,
    "has_memo": false
  }
}
```

> ⚠️ For XRP/MEMO coins, always show `memo` to the user — sending without memo loses funds.

**Errors:** `400` unsupported coin or network · `503` KuCoin unavailable

---

### `GET /deposit/history` 🔒
User's deposit history.

**Query params:** `?page=1&limit=20&coin=BTC&status=pending|confirming|completed|failed`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "deposits": [
      {
        "id": "uuid",
        "coin": "BTC",
        "network": "btc",
        "amount": "0.01000000",
        "usdt_amount": "450.00000000",
        "tx_hash": "abc123...",
        "status": "completed",
        "confirmations": 6,
        "credited_at": "2024-01-15T10:05:00Z",
        "created_at": "2024-01-15T09:55:00Z"
      }
    ],
    "pagination": { "total": 12, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

---

## ── PHASE 3 · TRADING ────────────────────────────────────────

### `POST /trade/order` 🔒
Place a buy or sell order. 1% platform fee applied.

**Rate limit:** 30 per minute

**Body:**
```json
{
  "symbol": "BTC-USDT",
  "side": "buy",
  "type": "market",
  "amount": "0.001",
  "price": null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| symbol | string | ✅ | Format: `COIN-USDT` e.g. `BTC-USDT`, `ETH-USDT` |
| side | string | ✅ | `buy` or `sell` |
| type | string | ❌ | `market` (default) or `limit` |
| amount | number | ✅ | Coin amount |
| price | number | Limit only | Required for limit orders |

**Supported symbols:** BTC-USDT, ETH-USDT, BNB-USDT, XRP-USDT, ADA-USDT, SOL-USDT, DOGE-USDT, TRX-USDT, LTC-USDT, MATIC-USDT

**Response `201`:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "trade_id": "uuid",
    "kucoin_order_id": "vs8d7f6s...",
    "symbol": "BTC-USDT",
    "side": "buy",
    "type": "market",
    "amount": "0.001",
    "estimated_price": 45000.00,
    "fee_usdt": 0.45,
    "fee_percent": 1,
    "total_cost": 45.45,
    "status": "open"
  }
}
```

**Errors:** `400` insufficient balance / unsupported pair · `502` KuCoin error

---

### `GET /trade/orders` 🔒
Get open/pending orders.

**Query params:** `?symbol=BTC-USDT&page=1&limit=20`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "symbol": "BTC-USDT",
      "side": "buy",
      "type": "market",
      "amount": "0.001",
      "price": "45000",
      "fee_usdt": "0.45000000",
      "status": "open",
      "created_at": "..."
    }
  ]
}
```

---

### `GET /trade/history` 🔒
Completed/cancelled trade history.

**Query params:** `?symbol=BTC-USDT&side=buy&page=1&limit=20`

**Response `200`:** Same structure as open orders with pagination.

---

### `GET /trade/order/:id` 🔒
Get single order (auto-syncs with KuCoin).

---

### `DELETE /trade/order/:id` 🔒
Cancel an open order. Refunds balance for buy orders.

**Response `200`:** `{ "success": true, "message": "Order cancelled and refunded" }`

---

### `GET /trade/ticker/:symbol` 🔒
Get current market price.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "price": "45123.50",
    "bestAsk": "45124.00",
    "bestBid": "45123.00",
    "time": 1705312200000
  }
}
```

---

## ── PHASE 4 · WITHDRAWAL ─────────────────────────────────────

### `GET /withdraw/fees` 🔒
Get withdrawal fees for all coins.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "coin": "BTC", "name": "Bitcoin", "min_withdraw": 0.001, "fee": 0.0005, "networks": [...] },
    { "coin": "ETH", ... },
    ...
  ]
}
```

---

### `POST /withdraw/request` 🔒
Submit a withdrawal request.

**Rate limit:** 5 per hour

**Body:**
```json
{
  "coin": "BTC",
  "network": "btc",
  "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "amount": "0.005",
  "memo": null
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Withdrawal request submitted",
  "data": {
    "withdrawal_id": "uuid",
    "coin": "BTC",
    "amount": "0.005",
    "fee": 0.0005,
    "net_amount": 0.0045,
    "address": "bc1q...",
    "status": "pending",
    "note": "Withdrawal is being reviewed and will be processed shortly"
  }
}
```

**Errors:** `400` insufficient balance / below minimum / unsupported coin

---

### `GET /withdraw/history` 🔒
User's withdrawal history.

**Query params:** `?status=pending|processing|completed|failed&coin=BTC&page=1&limit=20`

---

### `GET /withdraw/:id` 🔒
Get single withdrawal.

```json
{
  "id": "uuid",
  "coin": "BTC",
  "network": "btc",
  "to_address": "bc1q...",
  "amount": "0.005",
  "fee": "0.00050000",
  "net_amount": "0.00450000",
  "tx_hash": "abc123...",
  "status": "completed",
  "requested_at": "...",
  "processed_at": "..."
}
```

---

## ── PHASE 5 · ADMIN ──────────────────────────────────────────
> All admin routes require `is_admin: true` in JWT. Returns `403` otherwise.

### `GET /admin/stats` 🔒👑
Dashboard overview.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "users": { "total": 1500, "active": 1420 },
    "deposits": { "total_usdt": 850000.00 },
    "withdrawals": { "total_usdt": 320000.00, "pending_count": 7 },
    "fees": { "total_usdt": 8500.00 },
    "platform": { "total_user_balances": 530000.00 },
    "kucoin": { "available": "450000", "holds": "5000", "balance": "455000" }
  }
}
```

---

### `GET /admin/users` 🔒👑
List all users with balances.

**Query params:** `?page=1&limit=20&search=email_or_name&is_active=1&is_verified=1`

---

### `GET /admin/users/:id` 🔒👑
Full user detail with last 10 deposits, trades, withdrawals.

---

### `PATCH /admin/users/:id/status` 🔒👑
Suspend or activate a user.

**Body:** `{ "is_active": false }`

---

### `POST /admin/users/:id/credit` 🔒👑
Manually credit USDT to a user's wallet.

**Body:** `{ "amount": "100.00", "reason": "Promotional credit" }`

---

### `GET /admin/deposits` 🔒👑
All deposits across all users.

**Query params:** `?status=completed&coin=BTC&page=1&limit=20`

---

### `GET /admin/withdrawals` 🔒👑
All withdrawal requests.

**Query params:** `?status=pending&page=1&limit=20`

---

### `POST /admin/withdrawals/:id/approve` 🔒👑
Approve and execute withdrawal on KuCoin.

**Body (optional):** `{ "admin_note": "Verified address" }`

**Response `200`:**
```json
{
  "success": true,
  "message": "Withdrawal approved and submitted to KuCoin",
  "data": { "kucoin_wd_id": "6291..." }
}
```

---

### `POST /admin/withdrawals/:id/reject` 🔒👑
Reject withdrawal. Funds are unlocked back to user.

**Body:** `{ "reason": "Suspicious address" }`

---

### `GET /admin/fees` 🔒👑
Fees report.

**Query params:** `?from=2024-01-01&to=2024-01-31`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "fees": [...],
    "total_collected": 8500.50
  }
}
```

---

### `GET /admin/kucoin-balance` 🔒👑
Live KuCoin account balances.

---

### `GET /admin/audit-logs` 🔒👑
Security audit trail.

**Query params:** `?user_id=uuid&action=user_login&page=1&limit=50`

---

## Error Format (all errors)

```json
{
  "success": false,
  "message": "Human readable error",
  "errors": [
    { "field": "email", "msg": "Valid email required" }
  ]
}
```

| HTTP Code | Meaning |
|-----------|---------|
| 400 | Bad request / business logic error |
| 401 | Not authenticated / token expired |
| 403 | Forbidden (email not verified, suspended, not admin) |
| 404 | Resource not found |
| 409 | Conflict (email already exists) |
| 422 | Validation failed |
| 423 | Account locked |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 502 | KuCoin API error |
| 503 | External service unavailable |

---

## Token Lifecycle

```
Access Token:  expires in 15 minutes
Refresh Token: expires in 7 days, rotates on each use

Error code TOKEN_EXPIRED → call POST /auth/refresh
Store refresh token securely (HttpOnly cookie recommended)
```

---

## Special Notes for Frontend

1. **Deposit addresses with MEMO** (XRP): Always show both `address` AND `memo` field to user — missing memo loses funds.
2. **Balance is always USDT**: All balances stored/displayed in USDT equivalent.
3. **Trade amounts**: `amount` = coin quantity (e.g. `0.001` BTC), not USDT value.
4. **Withdrawal flow**: User requests → Admin approves in dashboard → KuCoin processes → Confirmed on-chain.
5. **Deposit flow**: Fully automatic — user sends to address → platform detects TX → credits wallet.
6. **Polling open orders**: Poll `GET /trade/order/:id` every 5-10s for live status updates.
