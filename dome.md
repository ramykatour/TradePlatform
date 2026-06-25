# Swift Exchange — Backend Features

- **Auth** — Register, Login, JWT, Refresh Tokens, Email Verification, Reset Password ✅
- **Wallet** — Balance, Transaction History, Credit/Debit with DB locking ✅
- **Deposit** — NOWPayments + NowNodes API address generation, DB caching, History ✅
- **Withdrawal** — NOWPayments + NowNodes API payouts, Webhook IPN, lock/unlock balance ✅
- **Spot Trading** — Place/Cancel orders, internal market maker (CMC pricing + spread) ✅
- **Futures** — Open/Close positions, Leverage, TP/SL, Liquidation cron ✅
- **Match Bets** — Football betting via API ✅
- **Admin Panel** — Stats, Users, Deposits, Withdrawals approval, Fees, Trading Pairs ✅
- **WebSocket** — Binance price streams ✅
- **Double-Entry Ledger** — Every financial operation records two sides (Debit + Credit) in a `ledger_entries` table. Each entry has: `account_type` (user_wallet, exchange_revenue, pending_withdrawal, etc.), `direction` (DR/CR), `amount`, `currency`, and a `reference_id` linking back to the original operation (deposit, trade, withdrawal, bet). A `LedgerService` wraps every credit/debit call so no operation touches a balance without creating a matching ledger pair. Admin endpoint at `GET /admin/ledger` supports filtering by user, currency, date range, and account type — and always balances to zero (sum of all debits = sum of all credits). ✅
