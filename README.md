# Live Ledger — Client

Live Ledger (client) is the front-end application that connects to the Live Ledger back end to display real-time ledger events, transactions, and account state. This README gives a quick overview, setup and development instructions.

## Features
- Real-time updates via WebSocket (or SSE) to stream ledger events
- REST API integration for historical queries and account management
- Lightweight UI components for accounts, transactions, and feeds
- Configurable auth and environment settings for local development

## Prerequisites
- Node.js LTS (16+ recommended)
- npm
- Back-end Live Ledger service running or test server endpoint

## Quick start
1. Clone the repo and install dependencies:
   - npm: `npm install`
2. Configure environment (see Configuration).
3. Start in development mode:
   - npm: `npm run dev`
4. Open the app at `http://localhost:3000` (port may vary).

## Configuration


## API & WebSocket usage


## Development notes
- UI framework: (Nextjs/typescript)
- State management:
- Keep WebSocket handling in a single service module for easy mocking/testing
- Use feature branches and PRs; follow repo lint and formatting rules

## Testing


## Contributing
- Fork, create a branch, open a PR with a clear description
- Write tests for new features and run linters
- Add or update README sections if behavior/configuration changes

## License
Specify project license in top-level LICENSE file.

<!-- End of README -->
