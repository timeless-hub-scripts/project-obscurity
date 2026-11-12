# OBSCURITY Discord Bot

OBSCURITY is a Railway-ready Discord.js v14 bot for script access management, whitelist and blacklist workflows, licence keys, customer panels, role configuration, games, and audit history.

## Implemented command modules

- **Whitelist and security:** `/whitelist`, `/unwhitelist`, `/blacklist`, `/unblacklist`, `/whitelisted`, `/blacklisted`, `/check`, `/whitelistall`, `/lockdown`
- **Licence keys:** `/genkey`, `/redeem`, `/revokekey`, `/extendkey`, `/keyinfo`, `/keylist`, `/resetkey`, `/transferkey`
- **User management:** `/userinfo`, `/lookup`, `/userhistory`, `/resethwid`, `/profile`
- **Administration:** `/set logs`, `/set buyer`, `/setstaff`, `/setadmin`, `/permissions`, `/logs`, `/export`
- **Script management:** `/create script`, `/delete script`, `/my scripts`, `/script info`, `/script manage`, `/script panel`, `/script transfer`, `/script publish`, `/script unpublish`, `/modify panel`, `/owner panel`
- **General and games:** `/help`, `/ping`, `/about`, `/botinfo`, `/invite`, `/support`, `/serverinfo`, `/games cookie`, `/games guess`

The command set intentionally does not include `/login`. Staff and owner permissions are re-checked in handlers using `OWNER_IDS`, Discord permissions, and the configured staff/admin roles.

## Local setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN` and `CLIENT_ID`.
3. Run `npm install`.
4. Run `npm start`. The bot now registers all slash commands automatically when it connects.

For fast testing, set `GUILD_ID` to the target server ID. Without `GUILD_ID`, commands are registered globally and Discord may take time to propagate them. `npm run register` remains available for manual registration.

## Railway

Create a Railway service from this GitHub repository and use `npm start` as the start command. Configure:

- `DISCORD_TOKEN` — Discord bot token
- `CLIENT_ID` — Discord application/client ID
- `OWNER_IDS` — comma-separated owner Discord user IDs
- `DATA_DIR=/data` — persistent database directory
- Optional: `SUPPORT_URL` and `WEBSITE_URL`

Attach a Railway Volume mounted at `/data`. Without persistent storage, SQLite data will be lost when the service is replaced. The running bot registers slash commands automatically after login; set `GUILD_ID` for immediate server-level command availability during setup.

## Discord setup

Enable the Server Members Intent in the Discord Developer Portal. Invite the bot with `bot` and `applications.commands` scopes and permissions to view channels, send messages, embed links, read message history, manage roles, and attach files. Put the bot role above the configured buyer role.

## Security and implementation notes

- `.env`, tokens, `node_modules`, logs, and local data are ignored by Git.
- Private licence, user, and access information is returned ephemerally.
- Staff actions are written to the SQLite `history` table.
- The bot can clear its stored HWID field, but Discord cannot discover a device HWID. Connect the reset flow to the external script authentication service for actual device enforcement.
- `/games guess` stores the active game configuration; a production deployment should add a message listener for collecting guesses if full channel gameplay is required.
