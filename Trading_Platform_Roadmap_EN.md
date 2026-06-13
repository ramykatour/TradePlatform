# Trading Platform Internal Exchange Roadmap

## Internal Trading on the Platform

---

## Current Phase (Before Licensing)

- Backend is complete: Spot Trading + Futures Trading + Deposit + Withdrawal + Wallet + Admin Panel
- Trading is currently done via the KuCoin API (temporary, for testing only)
- The current frontend is a prototype for testing only — it will be completely rebuilt
- Deposit system: one user = one independent address (to be implemented after licensing)

---

## After Licensing — The Goal

Trading will happen entirely within the platform.
Users will trade directly with each other without relying on KuCoin.

---

## Required Components

### 1. Matching Engine — The Heart of the Platform

The hardest part of the project.
Its job: match buy orders with sell orders by price and quantity.

- Written in C++ or Rust to ensure speed
- Handles thousands of operations per second
- Must be consistent — must not lose a single order
- Supports order types: Market, Limit, Stop-Limit

---

### 2. Order Book

- Stores all open orders (Bids / Asks)
- Updated in real time with every trade
- Displayed to users via WebSocket

---

### 3. Liquidity — The Biggest Challenge

**The Problem:**
At the start, the number of users is small, so the Order Book is empty.
Example: User A wants to buy BTC at $50,000 — User B wants to sell at $52,000 — no trade happens.

**The Solution — Hybrid Model:**

```
User places an order on the platform
            ↓
Is there an internal match with another user?
            ↓
Yes → executed internally (better)
No  → sent to KuCoin or a Liquidity Provider for execution (Hedge)
```

This way the platform has liquidity from day one.
As the number of users grows, reliance on the Hedge gradually decreases.

---

### 4. Settlement Engine

- Records the result of every trade in the Database
- Updates buyers' and sellers' balances immediately
- Creates a historical record for every transaction

---

### 5. Risk Management

- Prevents orders that exceed the user's balance
- Protection against price manipulation
- Circuit Breaker: automatically halts trading if prices move abnormally

---

## New Files Required (Backend)

| File | Function |
|---|---|
| `matchingEngine.js` or `matching_engine.rs` | Order matching |
| `orderBookService.js` | Order Book management |
| `settlementService.js` | Trade settlement and balance updates |
| `hedgeService.js` | Sends orders to KuCoin if there's no match |
| `riskService.js` | Checks balance and risk before order execution |
| `priceService.js` | Fetches reference prices from the market |

---

## Files That Will Change (Backend)

| File | Change |
|---|---|
| `tradeController.js` | Stops using KuCoin and uses the Matching Engine instead |
| `wsServer.js` | Broadcasts Order Book updates to users |
| `depositController.js` | Connects to the new wallet system |
| `txMonitor.js` | Monitors the blockchain directly |

---

## Files That Will Not Change

| File | Reason |
|---|---|
| `walletService.js` | Same balance logic |
| `withdrawalController.js` | Same withdrawal logic |
| `adminController.js` | Same admin logic |
| `authController.js` | Same authentication logic |
| `database.js` | Same database |

---

## Frontend — Complete Rebuild

The current frontend is temporary, for testing only.
After licensing, it will be completely rebuilt to include:

- Trading page: Order Book + Chart + Buy/Sell form
- Real-time updates via WebSocket
- Deposit page: an independent address for each user with a QR Code
- Withdrawal page
- History page
- Full admin panel

---

## Approximate Timeline (After Licensing)

| Phase | Duration | Details |
|---|---|---|
| Deposit system (separate wallets) | 1 week | CoinsPaid or HD Wallet |
| Matching Engine (basic) | 2–3 weeks | Limit + Market Orders |
| Order Book + WebSocket | 3–4 weeks | Real-time |
| Settlement + Risk | 2 weeks | Settlement and protection |
| Hybrid Liquidity (KuCoin Hedge) | 2–3 weeks | For initial liquidity |
| Frontend rebuild | 1 week | Complete redesign |
| Testing and launch | 1 month | QA + Security Audit |

---

## Important Notes

1. **A Security Audit is mandatory** — before launch, a specialized company must review the code
2. **The Matching Engine is the most critical part** — a single bug could cost users money
