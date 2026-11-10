# OBSCURITY Discord Bot

Railway-ready Discord.js v14 starter with SQLite persistence.

## Included in this build

- `/whitelist`, `/blacklist`, `/unwhitelist`, `/unblacklist`, `/check`
- Public whitelist/blacklist announcements (configured with `/setlogs`; falls back to the command channel)
- `/set buyer` to configure the server buyer role; whitelist grants that role when possible
- `/script panel` posts a **public** customer panel with View Script, Get Role, Reset HWID, Key Info and Script Info buttons. Button interactions open private user-specific script selection.
- `/owner panel` is private and staff-only; currently provides a read-only overview of registered scripts
- `/create script`, `/delete script`, `/my scripts`, `/script info`
- `/lockdown`, `/games` (Tap The Cookie playable; Guess The Number setup is not yet implemented), `/login` placeholder, `/help`, `/ping`
- `/games` includes Tap The Cookie and a placeholder for Guess The Number.

## Local setup

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env` and fill `DISCORD_TOKEN` and `CLIENT_ID`.
3. Run `npm install`.
4. Run `npm run register` (set `GUILD_ID` for fast testing; omit it for global commands).
5. Run `npm start`.

## Railway

Create a Railway service from the GitHub repository, set the start command to `npm start`, and add these variables in Railway's Variables tab:

- `DISCORD_TOKEN` — Discord bot token
- `CLIENT_ID` — Discord application/client ID
- `OWNER_IDS` — comma-separated OBSCURITY staff Discord user IDs
- `DATA_DIR=/data`

Attach a Railway Volume mounted at `/data` to persist `obscurity.sqlite` across redeploys. Without a persistent volume, SQLite data can be lost when the container is replaced. Register slash commands once using `npm run register` (locally or as a one-off Railway command).

## Discord bot setup

Enable the **Server Members Intent** in the Discord Developer Portal. Invite the bot with `bot` and `applications.commands` scopes and permissions to View Channels, Send Messages, Embed Links, Read Message History and Manage Roles (place the bot role above the buyer role).

## Security and integration notes

- Never commit `.env`, bot tokens, GitHub tokens, or other credentials. The supplied GitHub token file is not included in this project.
- Staff checks use Manage Server or IDs in `OWNER_IDS` for management commands; `/lockdown` requires Administrator.
- HWID reset here clears the stored Discord-side HWID field. It does **not** yet revoke or reset a live Roblox executor/device binding. Connect this to the OBSCURITY licensing API before relying on it for enforcement.
- `/login` is a placeholder until the dashboard verification API and one-time server-code flow are provided.
- The script source upload/edit workflow, paid checkout/key generation, full staff management controls, full game setup, product catalog, and dashboard sync are not implemented in this initial foundation.
- The whitelist announcement's `Access Your Script In` currently instructs the user to run `/script panel`; store a permanent panel message URL once the final public panel is posted if you want direct linking.
