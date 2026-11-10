require('dotenv').config();
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, MessageFlags, AttachmentBuilder, version: discordVersion } = require('discord.js');
const db = require('./db');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], partials: [Partials.GuildMember] });
const ephemeral = MessageFlags.Ephemeral;
const EMOJI = { ok: '🟢', no: '🔴', check: '✅', lock: '🔒' };
const ownerIds = () => (process.env.OWNER_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
const setting = (g, k) => db.prepare('SELECT value FROM settings WHERE guild_id=? AND key=?').get(g, k)?.value;
const setSetting = (g, k, v) => db.prepare('INSERT INTO settings(guild_id,key,value) VALUES(?,?,?) ON CONFLICT(guild_id,key) DO UPDATE SET value=excluded.value').run(g, k, String(v));
const audit = (g, u, action, actor, details = '') => db.prepare('INSERT INTO history(guild_id,user_id,action,actor_id,details) VALUES(?,?,?,?,?)').run(g, u || null, action, actor || null, details);
const isOwner = i => ownerIds().includes(i.user.id);
const hasRole = (i, key) => Boolean(i.member?.roles?.cache?.has(setting(i.guildId, key)));
const isAdmin = i => isOwner(i) || Boolean(i.memberPermissions?.has(PermissionFlagsBits.Administrator)) || hasRole(i, 'admin_role');
const isStaff = i => isAdmin(i) || Boolean(i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) || hasRole(i, 'staff_role');
const deny = (i, level) => i.reply({ content: `This command requires ${level} permission.`, flags: ephemeral });
const embed = (title, description, color = 0x7654d6) => new EmbedBuilder().setColor(color).setTitle(title).setDescription(description || '\u200b').setTimestamp();
const fmtDate = value => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Permanent';
const expired = value => Boolean(value && new Date(value).getTime() <= Date.now());
const futureDate = days => new Date(Date.now() + days * 86400000).toISOString();
const scriptByName = (g, name) => db.prepare('SELECT * FROM scripts WHERE guild_id=? AND lower(name)=lower(?)').get(g, name);
const scriptName = i => i.options.getString('script') || i.options.getString('name');
const accessRow = (g, u, s) => db.prepare('SELECT * FROM access WHERE guild_id=? AND user_id=? AND script_id=?').get(g, u, s);
const lockdown = g => setting(g, 'lockdown') === 'true';

async function respond(i, content, options = {}) {
  const payload = typeof content === 'string' ? { content } : content;
  if (options.ephemeral !== false) payload.flags = ephemeral;
  return i.reply(payload);
}
async function announce(i, message, color = 0x7654d6) {
  const channel = i.guild.channels.cache.get(setting(i.guildId, 'logs_channel')) || i.channel;
  return channel?.send({ embeds: [embed('OBSCURITY', message, color)] }).catch(() => {});
}
function roleStatus(i, roleId) {
  if (!roleId) return 'Not configured';
  const role = i.guild.roles.cache.get(roleId);
  return role ? `${role} (${role.id})` : `Missing role (${roleId})`;
}
function panelComponents(scriptId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`panel:view:${scriptId}`).setLabel('View Script').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`panel:role:${scriptId}`).setLabel('Get Role').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`panel:hwid:${scriptId}`).setLabel('Reset HWID').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`panel:key:${scriptId}`).setLabel('Key Info').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`panel:info:${scriptId}`).setLabel('Script Info').setStyle(ButtonStyle.Secondary)
  )];
}
function scriptAccessText(g, u) {
  const rows = db.prepare('SELECT s.name,a.expires_at,a.hwid FROM access a JOIN scripts s ON s.id=a.script_id WHERE a.guild_id=? AND a.user_id=? ORDER BY s.name').all(g, u);
  return rows.length ? rows.map(x => `**${x.name}** — ${expired(x.expires_at) ? 'Expired' : fmtDate(x.expires_at)}${x.hwid ? ' • HWID bound' : ''}`).join('\n') : 'No script access.';
}
function uniqueKey() {
  return `OBS-${crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{1,4}/g).join('-')}`;
}

async function handleCommand(i) {
  const g = i.guildId;
  if (!g && i.commandName !== 'about' && i.commandName !== 'ping' && i.commandName !== 'botinfo' && i.commandName !== 'invite' && i.commandName !== 'support' && i.commandName !== 'help') return respond(i, 'This command can only be used inside a server.');
  const n = i.commandName;
  if (n === 'ping') return respond(i, { embeds: [embed('🏓 Pong', `API latency: **${client.ws.ping}ms**\nResponse latency: **${Date.now() - i.createdTimestamp}ms**`)] });
  if (n === 'about') return respond(i, { embeds: [embed('OBSCURITY', 'A Discord-native whitelist, licence and script access management bot.\n\nBuilt for private script distribution with persistent SQLite storage and audit history.')] });
  if (n === 'botinfo') return respond(i, { embeds: [embed('OBSCURITY Bot Info', `Uptime: **${Math.floor(process.uptime())} seconds**\nDiscord.js: **v${discordVersion}**\nNode.js: **${process.version}**\nServers: **${client.guilds.cache.size}**\nRegistered commands: **${require('./commands').length}**`)] });
  if (n === 'invite') return respond(i, `Invite OBSCURITY with the required scopes: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=268438544`);
  if (n === 'support') return respond(i, { embeds: [embed('OBSCURITY Support', `${process.env.SUPPORT_URL || 'Configure SUPPORT_URL for your support server.'}\n${process.env.WEBSITE_URL || 'Configure WEBSITE_URL for your website.'}`)] });
  if (n === 'help') return help(i);

  if (n === 'whitelist') {
    if (!isStaff(i)) return deny(i, 'STAFF');
    if (lockdown(g)) return respond(i, `${EMOJI.lock} Whitelist operations are disabled while lockdown is active.`);
    const user = i.options.getUser('user'), s = scriptByName(g, i.options.getString('script')), days = i.options.getInteger('days');
    if (!s) return respond(i, 'Script not found. Use the exact script name.');
    if (db.prepare('SELECT 1 FROM blacklist WHERE guild_id=? AND user_id=?').get(g, user.id)) return respond(i, 'This member is blacklisted. Remove the blacklist first.');
    const expiry = days ? futureDate(days) : '';
    db.prepare(`INSERT INTO access(guild_id,user_id,script_id,expires_at,added_by,key_value) VALUES(?,?,?,?,?,?) ON CONFLICT(guild_id,user_id,script_id) DO UPDATE SET expires_at=excluded.expires_at,added_by=excluded.added_by,updated_at=CURRENT_TIMESTAMP`).run(g, user.id, s.id, expiry, i.user.id, '');
    audit(g, user.id, 'whitelist', i.user.id, `${s.name}; expiry=${expiry || 'permanent'}`);
    const roleId = setting(g, 'buyer_role'), member = await i.guild.members.fetch(user.id).catch(() => null);
    const role = roleId && i.guild.roles.cache.get(roleId);
    if (member && role) await member.roles.add(role).catch(() => {});
    await announce(i, `${user} You Have Been Whitelisted ${EMOJI.ok}\nAccess Your Script In: ${setting(g, 'customer_panel_url') || 'The customer panel has not been published yet.'}`);
    return respond(i, { embeds: [embed('Whitelist Updated', `${user} has access to **${s.name}** until **${fmtDate(expiry)}**.`)] });
  }
  if (n === 'unwhitelist') {
    if (!isStaff(i)) return deny(i, 'STAFF');
    const u = i.options.getUser('user'), s = scriptByName(g, i.options.getString('script'));
    if (!s) return respond(i, 'Script not found.');
    const result = db.prepare('DELETE FROM access WHERE guild_id=? AND user_id=? AND script_id=?').run(g, u.id, s.id);
    audit(g, u.id, 'unwhitelist', i.user.id, s.name);
    return respond(i, { embeds: [embed('Access Removed', result.changes ? `${u} no longer has access to **${s.name}**.` : 'No matching access record was found.')] });
  }
  if (n === 'blacklist') {
    if (!isStaff(i)) return deny(i, 'STAFF');
    const u = i.options.getUser('user'), reason = i.options.getString('reason') || 'No reason supplied';
    db.prepare(`INSERT INTO blacklist(guild_id,user_id,reason,actor_id) VALUES(?,?,?,?) ON CONFLICT(guild_id,user_id) DO UPDATE SET reason=excluded.reason,actor_id=excluded.actor_id,created_at=CURRENT_TIMESTAMP`).run(g, u.id, reason, i.user.id);
    db.prepare('DELETE FROM access WHERE guild_id=? AND user_id=?').run(g, u.id);
    audit(g, u.id, 'blacklist', i.user.id, reason);
    await announce(i, `${u} has been blacklisted ${EMOJI.no}\nReason: ${reason}`, 0xd64545);
    return respond(i, { embeds: [embed('Member Blacklisted', `${u} is blacklisted and all script access has been suspended.\nReason: ${reason}`, 0xd64545)] });
  }
  if (n === 'unblacklist') {
    if (!isStaff(i)) return deny(i, 'STAFF');
    const u = i.options.getUser('user'); db.prepare('DELETE FROM blacklist WHERE guild_id=? AND user_id=?').run(g, u.id); audit(g, u.id, 'unblacklist', i.user.id); return respond(i, { embeds: [embed('Blacklist Removed', `${u} may be whitelisted again. Existing access was not restored.`)] });
  }
  if (n === 'whitelisted') {
    if (!isStaff(i)) return deny(i, 'STAFF');
    const name = i.options.getString('script');
    const rows = db.prepare(`SELECT a.user_id,s.name,a.expires_at FROM access a JOIN scripts s ON s.id=a.script_id WHERE a.guild_id=? ${name ? 'AND lower(s.name)=lower(?)' : ''} ORDER BY s.name,a.created_at DESC LIMIT 50`).all(...(name ? [g, name] : [g]));
    return respond(i, { embeds: [embed('Whitelisted Members', rows.length ? rows.map(x => `<@${x.user_id}> (${x.user_id}) — **${x.name}** — ${fmtDate(x.expires_at)}`).join('\n') : 'No active records found.')] });
  }
  if (n === 'blacklisted') {
    if (!isStaff(i)) return deny(i, 'STAFF');
    const rows = db.prepare('SELECT user_id,reason,created_at FROM blacklist WHERE guild_id=? ORDER BY created_at DESC LIMIT 50').all(g);
    return respond(i, { embeds: [embed('Blacklisted Members', rows.length ? rows.map(x => `<@${x.user_id}> (${x.user_id}) — ${x.reason} — ${fmtDate(x.created_at)}`).join('\n') : 'No blacklisted members.')] });
  }
  if (n === 'check') {
    if (!isStaff(i)) return deny(i, 'STAFF');
    const u = i.options.getUser('user'), s = scriptByName(g, i.options.getString('script'));
    if (!s) return respond(i, 'Script not found.');
    const b = db.prepare('SELECT reason FROM blacklist WHERE guild_id=? AND user_id=?').get(g, u.id), a = accessRow(g, u.id, s.id);
    const status = b ? 'BLACKLISTED' : !a ? 'NOT WHITELISTED' : expired(a.expires_at) ? 'EXPIRED' : 'WHITELISTED';
    return respond(i, { embeds: [embed('Access Check', `User: ${u}\nScript: **${s.name}**\nStatus: **${status}**\nExpiry: **${fmtDate(a?.expires_at)}**\nHWID: **${a?.hwid ? 'Bound' : 'Not bound'}**`)] });
  }
  if (n === 'whitelistall') {
    if (!isAdmin(i)) return deny(i, 'ADMIN');
    if (lockdown(g)) return respond(i, `${EMOJI.lock} Lockdown is active.`);
    const u = i.options.getUser('user'); if (db.prepare('SELECT 1 FROM blacklist WHERE guild_id=? AND user_id=?').get(g, u.id)) return respond(i, 'This member is blacklisted.');
    const scripts = db.prepare('SELECT id,name FROM scripts WHERE guild_id=?').all(g); let count = 0;
    for (const s of scripts) { const r = db.prepare(`INSERT OR IGNORE INTO access(guild_id,user_id,script_id,added_by) VALUES(?,?,?,?)`).run(g, u.id, s.id, i.user.id); if (r.changes) { count++; audit(g, u.id, 'whitelistall', i.user.id, s.name); } }
    return respond(i, { embeds: [embed('Whitelist All Complete', `${u} received access to **${count}** new script(s).`)] });
  }

  if (n === 'genkey') {
    if (!isStaff(i)) return deny(i, 'STAFF');
    const s = scriptByName(g, i.options.getString('script')), days = i.options.getInteger('days'), uses = i.options.getInteger('uses'); if (!s) return respond(i, 'Script not found.');
    let key; do key = uniqueKey(); while (db.prepare('SELECT 1 FROM keys WHERE key=?').get(key));
    db.prepare('INSERT INTO keys(key,guild_id,script_id,duration_days,uses_left,created_by) VALUES(?,?,?,?,?,?)').run(key, g, s.id, days, uses ?? null, i.user.id); audit(g, null, 'genkey', i.user.id, `${s.name}; ${key}`);
    return respond(i, { embeds: [embed('Licence Key Generated', `Script: **${s.name}**\nDuration: **${days} days**\nUses: **${uses ?? 'Unlimited'}**\n\n**${key}**`)] });
  }
  if (n === 'redeem') {
    if (lockdown(g)) return respond(i, `${EMOJI.lock} Key redemption is disabled while lockdown is active.`);
    const key = i.options.getString('key').trim().toUpperCase(), k = db.prepare('SELECT k.*,s.name FROM keys k JOIN scripts s ON s.id=k.script_id WHERE k.key=? AND k.guild_id=?').get(key, g);
    if (!k || k.revoked) return respond(i, 'That key is invalid or revoked.');
    if (k.uses_left !== null && k.uses_left <= 0) return respond(i, 'That key has no remaining uses.');
    if (db.prepare('SELECT 1 FROM redemptions WHERE key=? AND user_id=?').get(key, i.user.id)) return respond(i, 'You have already redeemed this key.');
    if (db.prepare('SELECT 1 FROM blacklist WHERE guild_id=? AND user_id=?').get(g, i.user.id)) return respond(i, 'Blacklisted users cannot redeem keys.');
    const expiry = futureDate(k.duration_days);
    db.transaction(() => { db.prepare('INSERT INTO redemptions(key,guild_id,user_id) VALUES(?,?,?)').run(key, g, i.user.id); if (k.uses_left !== null) db.prepare('UPDATE keys SET uses_left=uses_left-1 WHERE key=?').run(key); db.prepare(`INSERT INTO access(guild_id,user_id,script_id,expires_at,key_value,added_by) VALUES(?,?,?,?,?,?) ON CONFLICT(guild_id,user_id,script_id) DO UPDATE SET expires_at=excluded.expires_at,key_value=excluded.key_value,updated_at=CURRENT_TIMESTAMP`).run(g, i.user.id, k.script_id, expiry, key, 'key'); audit(g, i.user.id, 'redeem', i.user.id, `${k.name}; ${key}`); })();
    await announce(i, `${i.user} redeemed access to **${k.name}** ${EMOJI.ok}`); return respond(i, { embeds: [embed('Key Redeemed', `You now have access to **${k.name}** until **${fmtDate(expiry)}**.`)] });
  }
  if (n === 'revokekey') { if (!isStaff(i)) return deny(i, 'STAFF'); const key = i.options.getString('key').trim().toUpperCase(); const r = db.prepare('UPDATE keys SET revoked=1 WHERE key=? AND guild_id=?').run(key, g); audit(g, null, 'revokekey', i.user.id, key); return respond(i, `${r.changes ? 'Revoked' : 'Key not found'}: **${key}**`); }
  if (n === 'extendkey') { if (!isStaff(i)) return deny(i, 'STAFF'); const u = i.options.getUser('user'), s = scriptByName(g, i.options.getString('script')), days = i.options.getInteger('days'); if (!s) return respond(i, 'Script not found.'); const a = accessRow(g, u.id, s.id); if (!a) return respond(i, 'No access record found.'); const base = a.expires_at && !expired(a.expires_at) ? new Date(a.expires_at) : new Date(); base.setDate(base.getDate() + days); db.prepare('UPDATE access SET expires_at=?,updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND user_id=? AND script_id=?').run(base.toISOString(), g, u.id, s.id); audit(g, u.id, 'extendkey', i.user.id, `${s.name}; +${days} days`); return respond(i, `Extended ${u}'s **${s.name}** access until **${fmtDate(base)}**.`); }
  if (n === 'keyinfo') { if (!isStaff(i)) return deny(i, 'STAFF'); const k = db.prepare('SELECT k.*,s.name FROM keys k JOIN scripts s ON s.id=k.script_id WHERE k.key=? AND k.guild_id=?').get(i.options.getString('key').trim().toUpperCase(), g); if (!k) return respond(i, 'Key not found.'); return respond(i, { embeds: [embed('Licence Key Info', `Key: **${k.key}**\nScript: **${k.name}**\nDuration: **${k.duration_days} days**\nRemaining uses: **${k.uses_left ?? 'Unlimited'}**\nRevoked: **${k.revoked ? 'Yes' : 'No'}**\nCreated: **${fmtDate(k.created_at)}**`)] }); }
  if (n === 'keylist') { if (!isStaff(i)) return deny(i, 'STAFF'); const rows = db.prepare('SELECT k.key,s.name,k.uses_left,k.revoked FROM keys k JOIN scripts s ON s.id=k.script_id WHERE k.guild_id=? ORDER BY k.created_at DESC LIMIT 50').all(g); return respond(i, { embeds: [embed('Licence Keys', rows.length ? rows.map(x => `**${x.key}** — ${x.name} — uses: ${x.uses_left ?? '∞'} — ${x.revoked ? 'REVOKED' : 'active'}`).join('\n') : 'No keys generated.')] }); }
  if (n === 'resetkey' || n === 'resethwid') { if (!isStaff(i)) return deny(i, 'STAFF'); const u = i.options.getUser('user'), s = scriptByName(g, i.options.getString('script')); if (!s) return respond(i, 'Script not found.'); db.prepare('UPDATE access SET hwid="",key_value="",updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND user_id=? AND script_id=?').run(g, u.id, s.id); audit(g, u.id, n, i.user.id, s.name); return respond(i, `Cleared the key/HWID binding for ${u} on **${s.name}**. Whitelist access remains intact.`); }
  if (n === 'transferkey') { if (!isStaff(i)) return deny(i, 'STAFF'); if (lockdown(g)) return respond(i, `${EMOJI.lock} Transfers are disabled while lockdown is active.`); const from = i.options.getUser('from'), to = i.options.getUser('to'), s = scriptByName(g, i.options.getString('script')); if (!s) return respond(i, 'Script not found.'); const a = accessRow(g, from.id, s.id); if (!a) return respond(i, 'The current owner has no access to that script.'); db.transaction(() => { db.prepare('DELETE FROM access WHERE guild_id=? AND user_id=? AND script_id=?').run(g, from.id, s.id); db.prepare('INSERT OR REPLACE INTO access(guild_id,user_id,script_id,expires_at,hwid,key_value,added_by) VALUES(?,?,?,?,?,?,?)').run(g, to.id, s.id, a.expires_at, '', a.key_value, i.user.id); audit(g, from.id, 'transfer_out', i.user.id, `${s.name} -> ${to.id}`); audit(g, to.id, 'transfer_in', i.user.id, `${s.name} <- ${from.id}`); })(); return respond(i, `Transferred **${s.name}** access from ${from} to ${to}.`); }

  if (n === 'userinfo' || n === 'lookup') { if (!isStaff(i)) return deny(i, 'STAFF'); const u = n === 'userinfo' ? i.options.getUser('user') : await client.users.fetch(i.options.getString('user_id')).catch(() => null); if (!u) return respond(i, 'User not found.'); const b = db.prepare('SELECT reason,created_at FROM blacklist WHERE guild_id=? AND user_id=?').get(g, u.id); return respond(i, { embeds: [embed('User Information', `User: ${u} (${u.id})\nCreated: **${fmtDate(u.createdAt)}**\nBlacklist: **${b ? `Yes — ${b.reason}` : 'No'}**\n\n${scriptAccessText(g, u.id)}`)] }); }
  if (n === 'userhistory') { if (!isStaff(i)) return deny(i, 'STAFF'); const u = i.options.getUser('user'); const rows = db.prepare('SELECT action,details,created_at FROM history WHERE guild_id=? AND user_id=? ORDER BY id DESC LIMIT 30').all(g, u.id); return respond(i, { embeds: [embed('User History', rows.length ? rows.map(x => `**${x.action}** — ${x.details} — ${fmtDate(x.created_at)}`).join('\n') : 'No history found.')] }); }

  if (n === 'lockdown') { if (!isOwner(i)) return deny(i, 'OWNER'); const enabled = i.options.getBoolean('enabled'); setSetting(g, 'lockdown', enabled); audit(g, null, 'lockdown', i.user.id, String(enabled)); return respond(i, `${enabled ? EMOJI.lock + ' Lockdown enabled. New grants, redemptions and transfers are blocked.' : EMOJI.check + ' Lockdown disabled. Normal operations restored.'}`); }
  if (n === 'set') { if (!isAdmin(i)) return deny(i, 'ADMIN'); const sub = i.options.getSubcommand(); if (sub === 'logs') setSetting(g, 'logs_channel', i.options.getChannel('channel').id); else setSetting(g, 'buyer_role', i.options.getRole('role').id); audit(g, null, `set_${sub}`, i.user.id, sub === 'logs' ? i.options.getChannel('channel').id : i.options.getRole('role').id); return respond(i, `${EMOJI.check} ${sub === 'logs' ? 'Log channel' : 'Buyer role'} configured.`); }
  if (n === 'setstaff' || n === 'setadmin') { if (!isOwner(i)) return deny(i, 'OWNER'); const role = i.options.getRole('role'); setSetting(g, n === 'setstaff' ? 'staff_role' : 'admin_role', role.id); audit(g, null, n, i.user.id, role.id); return respond(i, `${EMOJI.check} ${n === 'setstaff' ? 'Staff' : 'Administrator'} role set to ${role}.`); }
  if (n === 'permissions') { if (!isAdmin(i)) return deny(i, 'ADMIN'); return respond(i, { embeds: [embed('Configured Permissions', `Staff role: ${roleStatus(i, setting(g, 'staff_role'))}\nAdmin role: ${roleStatus(i, setting(g, 'admin_role'))}\nBuyer role: ${roleStatus(i, setting(g, 'buyer_role'))}\nLog channel: ${setting(g, 'logs_channel') ? `<#${setting(g, 'logs_channel')}>` : 'Not configured'}`)] }); }

  if (n === 'create') { if (!isStaff(i)) return deny(i, 'STAFF'); const name = i.options.getString('name').trim(), description = i.options.getString('description') || ''; try { const r = db.prepare('INSERT INTO scripts(guild_id,name,description,owner_id) VALUES(?,?,?,?)').run(g, name, description, i.user.id); audit(g, null, 'create_script', i.user.id, `${name}; id=${r.lastInsertRowid}`); return respond(i, `Created **${name}** with script ID **${r.lastInsertRowid}**.`); } catch { return respond(i, 'A script with that name already exists.'); } }
  if (n === 'delete') { const s = scriptByName(g, i.options.getString('name')); if (!s) return respond(i, 'Script not found.'); if (!isOwner(i) && s.owner_id !== i.user.id) return deny(i, 'OWNER or script owner'); db.prepare('DELETE FROM scripts WHERE id=?').run(s.id); audit(g, null, 'delete_script', i.user.id, s.name); return respond(i, `Deleted **${s.name}** and its active access records.`); }
  if (n === 'my') { const rows = db.prepare('SELECT id,name,owner_id,published FROM scripts WHERE guild_id=? AND owner_id=? ORDER BY name').all(g, i.user.id); return respond(i, { embeds: [embed('My Scripts', rows.length ? rows.map(s => `**${s.name}** — ${s.published ? 'Published' : 'Unpublished'} — ${s.owner_id === i.user.id ? 'Owner' : 'Access'}`).join('\n') : 'No scripts owned by you.')] }); }
  if (n === 'script') return scriptCommand(i);
  if (n === 'owner') { if (!isStaff(i)) return deny(i, 'STAFF'); return respond(i, { embeds: [embed('OBSCURITY Management', 'Use the specification commands to manage scripts, access, keys, roles and audit history.\n\nAvailable modules: Scripts • Whitelist • Blacklist • Licence Keys • User Lookup • Audit Logs • Panel Settings')] }); }
  if (n === 'modify') { if (!isAdmin(i)) return deny(i, 'ADMIN'); const s = scriptByName(g, i.options.getString('script')); if (!s) return respond(i, 'Script not found.'); const title = i.options.getString('title'), description = i.options.getString('description'); db.prepare('UPDATE scripts SET panel_title=COALESCE(?,panel_title),panel_description=COALESCE(?,panel_description) WHERE id=?').run(title, description, s.id); audit(g, null, 'modify_panel', i.user.id, s.name); return respond(i, 'Panel configuration updated. Edit the existing message or repost `/script panel` to publish it.'); }
  if (n === 'profile') return respond(i, { embeds: [embed(`${i.user.username}'s OBSCURITY Profile`, `Buyer role: **${setting(g, 'buyer_role') && i.member.roles.cache.has(setting(g, 'buyer_role')) ? 'Assigned' : 'Not assigned'}**\n\n${scriptAccessText(g, i.user.id)}`)] });
  if (n === 'serverinfo') return respond(i, { embeds: [embed(i.guild.name, `Server ID: **${g}**\nMembers: **${i.guild.memberCount}**\nCreated: **${fmtDate(i.guild.createdAt)}**\nBuyer role: ${roleStatus(i, setting(g, 'buyer_role'))}\nStaff role: ${roleStatus(i, setting(g, 'staff_role'))}\nAdmin role: ${roleStatus(i, setting(g, 'admin_role'))}`)] });
  if (n === 'logs') { if (!isStaff(i)) return deny(i, 'STAFF'); const rows = db.prepare('SELECT action,user_id,actor_id,details,created_at FROM history WHERE guild_id=? ORDER BY id DESC LIMIT 40').all(g); return respond(i, { embeds: [embed('Audit Logs', rows.length ? rows.map(x => `**${x.action}** — user: ${x.user_id || '—'} — actor: ${x.actor_id || '—'} — ${x.details} — ${fmtDate(x.created_at)}`).join('\n') : 'No audit history.')] }); }
  if (n === 'export') { if (!isAdmin(i)) return deny(i, 'ADMIN'); const s = scriptByName(g, i.options.getString('script')); if (!s) return respond(i, 'Script not found.'); const rows = db.prepare('SELECT user_id,expires_at,hwid,created_at FROM access WHERE guild_id=? AND script_id=? ORDER BY created_at').all(g, s.id); const file = path.join(os.tmpdir(), `obscurity-${Date.now()}.csv`); fs.writeFileSync(file, ['user_id,expires_at,hwid,created_at', ...rows.map(x => [x.user_id,x.expires_at,x.hwid,x.created_at].map(v => `"${String(v || '').replaceAll('"','""')}"`).join(','))].join('\n')); audit(g, null, 'export', i.user.id, s.name); return respond(i, { content: `Export for **${s.name}**`, files: [new AttachmentBuilder(file, { name: `${s.name.replace(/[^a-z0-9]/gi, '_')}-access.csv` })] }); }
  if (n === 'games') return games(i);
}

async function scriptCommand(i) {
  const g = i.guildId, sub = i.options.getSubcommand(), s = scriptByName(g, i.options.getString('name'));
  if (sub === 'panel') {
    if (!s) return respond(i, 'Script not found.'); if (!isStaff(i) && s.owner_id !== i.user.id) return deny(i, 'STAFF or script owner');
    const msg = await i.channel.send({ embeds: [embed(s.panel_title || s.name, s.panel_description || s.description || 'Select an action below.', 0x7654d6)], components: panelComponents(s.id) });
    setSetting(g, 'customer_panel_url', msg.url); db.prepare('UPDATE scripts SET published=1 WHERE id=?').run(s.id); audit(g, null, 'publish_panel', i.user.id, `${s.name}; ${msg.url}`); return respond(i, `Public customer panel posted: ${msg.url}`);
  }
  if (!s) return respond(i, 'Script not found.');
  if (sub === 'info') { const a = accessRow(g, i.user.id, s.id); return respond(i, { embeds: [embed(s.name, `${s.description || 'No description set.'}\n\nOwner: <@${s.owner_id}>\nPublished: **${s.published ? 'Yes' : 'No'}**\nYour access: **${a && !expired(a.expires_at) ? `Active until ${fmtDate(a.expires_at)}` : 'None'}**`)] }); }
  if (sub === 'manage') { if (!isOwner(i) && s.owner_id !== i.user.id) return deny(i, 'OWNER or script owner'); const description = i.options.getString('description'), title = i.options.getString('title'), price = i.options.getString('price'); db.prepare('UPDATE scripts SET description=COALESCE(?,description),panel_title=COALESCE(?,panel_title),price=COALESCE(?,price) WHERE id=?').run(description,title,price,s.id); audit(g, null, 'manage_script', i.user.id, s.name); return respond(i, `Updated **${s.name}**.`); }
  if (sub === 'transfer') { if (!isOwner(i)) return deny(i, 'OWNER'); const u = i.options.getUser('owner'); db.prepare('UPDATE scripts SET owner_id=? WHERE id=?').run(u.id, s.id); audit(g, null, 'transfer_script', i.user.id, `${s.name} -> ${u.id}`); return respond(i, `Transferred **${s.name}** ownership to ${u}.`); }
  if (sub === 'publish' || sub === 'unpublish') { if (!isOwner(i) && s.owner_id !== i.user.id) return deny(i, 'OWNER or script owner'); db.prepare('UPDATE scripts SET published=? WHERE id=?').run(sub === 'publish' ? 1 : 0, s.id); audit(g, null, sub, i.user.id, s.name); return respond(i, `**${s.name}** is now ${sub === 'publish' ? 'published' : 'unpublished'}.`); }
}

async function games(i) {
  const sub = i.options.getSubcommand();
  if (sub === 'cookie') { const start = Date.now() + 3000; const button = () => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`cookie:${i.id}:${start}`).setLabel('🍪 TAP!').setStyle(ButtonStyle.Success).setDisabled(Date.now() < start)); const msg = await i.reply({ embeds: [embed('🍪 TAP THE COOKIE!', 'Get ready...\n\n3\n2\n1\nGO!', 0xf2a900)], components: [button()], fetchReply: true }); const timer = setInterval(() => { if (Date.now() >= start) { clearInterval(timer); msg.edit({ components: [button()] }).catch(() => {}); } }, 100); return; }
  const channel = i.options.getChannel('channel'), secret = i.options.getInteger('number'); const game = { owner: i.user.id, secret, active: true }; setSetting(i.guildId, `guess_${channel.id}`, JSON.stringify(game)); await channel.send({ embeds: [embed('🔢 Guess The Number', 'Guess a number from 1 to 100 by sending it in this channel. Higher/lower hints are enabled.') ] }); return respond(i, `Guessing game started in ${channel}. Only you can replace it.`);
}

async function help(i) { return respond(i, { embeds: [embed('OBSCURITY Help', '**Whitelist & Blacklist** — `/whitelist`, `/unwhitelist`, `/blacklist`, `/check`\n**Licence Keys** — `/genkey`, `/redeem`, `/revokekey`, `/keylist`\n**Scripts** — `/create script`, `/script info`, `/script panel`, `/script manage`\n**Administration** — `/set`, `/setstaff`, `/setadmin`, `/permissions`, `/logs`, `/export`\n**General** — `/profile`, `/serverinfo`, `/ping`, `/about`, `/botinfo`, `/support`, `/games`\n\nPrivate account and licence information is sent ephemerally. Restricted commands re-check permissions at execution time.')] }); }

client.once('ready', () => console.log(`OBSCURITY online as ${client.user.tag}`));
client.on('interactionCreate', async i => {
  try {
    if (i.isChatInputCommand()) return await handleCommand(i);
    if (i.isButton() && i.customId.startsWith('cookie:')) {
      const [, owner, start] = i.customId.split(':'); if (Date.now() < Number(start)) return i.reply({ content: 'Wait for GO!', flags: ephemeral }); const msg = i.message; if (msg.components.every(r => r.components.every(c => c.disabled))) return i.reply({ content: 'This round has ended.', flags: ephemeral }); await msg.edit({ embeds: [embed('🏆 Cookie Winner', `${i.user} won in **${Date.now() - Number(start)}ms**!`)], components: msg.components.map(r => new ActionRowBuilder().addComponents(r.components.map(c => ButtonBuilder.from(c).setDisabled(true)))) }); return i.reply({ content: 'You won!', flags: ephemeral });
    }
    if (i.isButton() && i.customId.startsWith('panel:')) {
      const [, action, id] = i.customId.split(':'), s = db.prepare('SELECT * FROM scripts WHERE id=? AND guild_id=?').get(id, i.guildId); if (!s) return i.reply({ content: 'Script not found.', flags: ephemeral }); const a = accessRow(i.guildId, i.user.id, s.id);
      if (action === 'view' || action === 'info') return i.reply({ embeds: [embed(s.name, `${s.description || 'No description set.'}\n\nYour access: **${a && !expired(a.expires_at) ? `Active until ${fmtDate(a.expires_at)}` : 'Not active'}**`)], flags: ephemeral });
      if (action === 'key') return i.reply({ content: `**${s.name}**\nKey status: ${a?.key_value ? 'Key-linked access' : 'No redeemed key recorded'}\nExpiry: ${fmtDate(a?.expires_at)}`, flags: ephemeral });
      if (action === 'hwid') { if (!a) return i.reply({ content: 'You do not have access to this script.', flags: ephemeral }); db.prepare('UPDATE access SET hwid="",updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND user_id=? AND script_id=?').run(i.guildId, i.user.id, s.id); audit(i.guildId, i.user.id, 'panel_hwid_reset', i.user.id, s.name); return i.reply({ content: 'Your HWID binding was cleared. The authentication system can bind a new device on the next login.', flags: ephemeral }); }
      if (action === 'role') { if (!a || expired(a.expires_at)) return i.reply({ content: 'You do not have active access to this script.', flags: ephemeral }); const role = i.guild.roles.cache.get(setting(i.guildId, 'buyer_role')); if (!role) return i.reply({ content: 'The buyer role is not configured.', flags: ephemeral }); await i.member.roles.add(role).catch(() => {}); return i.reply({ content: `Buyer role granted: ${role}`, flags: ephemeral }); }
    }
  } catch (e) { console.error(e); if (!i.replied && !i.deferred) await i.reply({ content: 'Something went wrong. Check the Railway logs for details.', flags: ephemeral }).catch(() => {}); }
});

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is missing. Copy .env.example to .env and add your bot token.');
client.login(process.env.DISCORD_TOKEN);
