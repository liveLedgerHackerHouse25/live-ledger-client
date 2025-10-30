## Live Ledger — Micropayments Client

This document contains route documentation, a recommended `.env.sample`, and other important developer notes that are not in the main `README.md`.

## Routes and Pages (Next.js App Router)

The project uses the Next.js App Router (`app/` directory). File-based routing maps folders and `page.tsx` files to URL paths. Below are the main routes reflected in the `app/` tree and their purpose.

- `/` — `app/page.tsx`
	- Purpose: Home / landing page for the micropayments client.
	- Access: Public.

- `/auth/login` — `app/auth/login/page.tsx`
	- Purpose: Login page (collect credentials or trigger wallet login flow).
	- Access: Public.

- `/auth/signup` — `app/auth/signup/page.tsx`
	- Purpose: User registration page.
	- Access: Public.

- `/payer/dashboard` — `app/payer/dashboard/page.tsx` (with `layout.tsx`)
	- Purpose: Payer dashboard — create/manage payment streams.
	- Access: Protected (requires authenticated payer role).

- `/recipient/dashboard` — `app/recipient/dashboard/page.tsx` (with `layout.tsx`)
	- Purpose: Recipient dashboard — view incoming streams, withdraw funds.
	- Access: Protected (requires authenticated recipient role).

Shared UI components are in `app/_components/ui` and shared styles in `app/_components/styling`.

Notes about routing and protections:
- The App Router uses server components by default. Client interactions (wallet connect, forms) must use client components (`"use client"`).
- Route protection is commonly implemented at the `layout.tsx` level for payer/recipient. Check those layout files for auth checks.
- If you add dynamic routes (e.g., stream details), follow Next.js App Router conventions (`[id]` folders and `page.tsx`).

## API layer

`src/lib/api.ts` centralizes network requests. Typical responsibilities:
- Build fetch URLs using a base (commonly `NEXT_PUBLIC_API_URL` or relative `/api`).
- Attach auth headers (Bearer token or session cookies).
- Provide helpers for GET/POST/PUT/DELETE and consistent error handling.

Check `src/lib/api.ts` for exact route strings and the env var names it uses.

## Wallet / Web3

Components referencing wallets: `walletAside.tsx`, `withdrawToggle.tsx`, `withdrawButton.tsx`.

Likely libs (check `package.json`): `ethers`, `wagmi`, `web3modal`/`@web3modal/react`, `rainbowkit`.

Required env variables for web3 (examples below): RPC URLs and API keys (Alchemy/Infura). Keep secrets server-side.

## .env.sample (recommended)

Drop this file at the project root or copy into `micropayments/env.sample`.

```
# Public (exposed to client) - prefix with NEXT_PUBLIC_
NEXT_PUBLIC_APP_NAME="Live Ledger"
NEXT_PUBLIC_API_URL="http://localhost:3000"    # Client base URL for API calls. Use deployed API URL in production.

# Server-only (DO NOT expose as NEXT_PUBLIC)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="replace_with_a_long_random_value"
NODE_ENV=""


```

Notes:
- Never commit real secrets. Use `.env.local` for local secrets and configure env on your deployment platform.
- Variables prefixed with `NEXT_PUBLIC_` are embedded in client bundles. Do not put secrets there.

## How to run locally

1. Install dependencies (project root `micropayments/`):

```bash
npm install
# or: pnpm install
# or: yarn
```

2. Create `.env.local` from the `env.sample` and fill secrets.

3. Run dev server:

```bash
npm run dev
# open http://localhost:3000
```

4. Build & run production locally:

```bash
npm run build
npm run start
```

Check `package.json` for exact script names (dev, build, start, lint, test).

## Tests, linting and type-checking

- Linting: repo includes `eslint.config.mjs`. Run `npm run lint` if a script exists.
- Types: TypeScript config is in `tsconfig.json`. Run `npm run type-check` or `tsc --noEmit` if available.
- Tests: If no tests exist, consider a small test for `src/lib/api.ts` to assert URL construction and header behavior.

## Common issues & debugging tips

- Missing `NEXT_PUBLIC_API_URL` — client calls may point to the wrong domain; set it to your API base.
- Auth token handling — confirm whether tokens are stored in httpOnly cookies (preferred) or localStorage. Adjust `src/lib/api.ts` accordingly.
- Wallet RPC mismatch — ensure `NEXT_PUBLIC_CHAIN_ID` matches wallet/network.
- CSS modules not applying — check module imports (paths and exported class names).

## Next steps I can do for you
- Create a `micropayments/env.sample` file 
- Flesh out exact API endpoints by scanning `src/lib/api.ts` and listing required env variables
- Add a small `scripts/env-check.js` to fail early when required env vars are missing.

