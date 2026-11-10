require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const db = require('./db');
const EMOJI = {
  check: '<:checkmark:1565775336439025674>', money: '<:money:1566131516428521692>',
  partnership: '<:partnership:1566131673811124247>', boosts: '<:boosts:1566721341040623646>',
  arrow: '<a:animatedarrowwhite:1566721629919248464>',
  paypal: '<:paypal:1566560375288369292>', crypto: '<:crypto:1566565904635007169>',
  spotify: '<:spotify:1566732232855388261>', appletv: '<:apple_tv:1566732344453496912>',
  adobe: '<:adobe:1566732393874989186>', capcut: '<:capcut:1566732435624828961>',
  steam: '<:steam:1566732478218113055>', offers: '<:offers:1566732538872078436>',
  nba: '<:nba:1566731946468450306>', chatgpt: '<:chatgpt:1566731997760725102>',
  ipvanish: '<:ipvanish:1566732040169332747>', gemini: '<:gemini:1566732099137048627>',
  claude: '<:claude:1566732147404968006>', nordvpn: '<:nordvpn:1566732190769746082>',
  netflix: '<:netflix:1566726633682108457>', prime: '<:amazon_prime:1566727206032379955>',
  paramount: '<:paramount:1566727250760568902>', youtube: '<:yt:1566727420738936932>',
  dazn: '<:dazn:1566731892840071228>', minecraft: '<:minecraft:1566725831504691220>',
  crunchyroll: '<:crunchy:1566726327124492358>'
};
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers], partials: [Partials.GuildMember] });
const getSetting = (g,k) => db.prepare('SELECT value FROM settings WHERE guild_id=? AND key=?').get(g,k)?.value;
const setSetting = (g,k,v) => db.prepare('INSERT INTO settings(guild_id,key,value) VALUES(?,?,?) ON CONFLICT(guild_id,key) DO UPDATE SET value=excluded.value').run(g,k,String(v));
const isStaff = i => (process.env.OWNER_IDS||'').split(',').map(x=>x.trim()).includes(i.user.id) || i.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
const getScript = id => db.prepare('SELECT * FROM scripts WHERE id=?').get(id);
const panelEmbed = () => new EmbedBuilder().setColor(0x7654d6).setTitle('OBSCURITY • Customer Panel')
  .setDescription('Select an action below to view your script access, retrieve your buyer role, or inspect your key and HWID information.')
  .setFooter({text:'OBSCURITY • Script Protection'});
const panelRows = () => [new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('customer:view').setLabel('View Script').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('customer:role').setLabel('Get Role').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('customer:hwid').setLabel('Reset HWID').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('customer:key').setLabel('Key Info').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('customer:info').setLabel('Script Info').setStyle(ButtonStyle.Secondary)
)];
async function chooseScript(i, action) {
  const rows = db.prepare(`SELECT s.id,s.name FROM scripts s JOIN access a ON a.script_id=s.id WHERE a.guild_id=? AND a.user_id=? AND a.status='whitelisted' ORDER BY s.name`).all(i.guildId,i.user.id);
  if (!rows.length) return i.reply({content:'You do not have any whitelisted scripts in this server.',flags:MessageFlags.Ephemeral});
  const menu = new StringSelectMenuBuilder().setCustomId(`pick:${action}`).setPlaceholder('Select your script').addOptions(rows.slice(0,25).map(s=>({label:s.name.slice(0,100),value:String(s.id)})));
  return i.reply({content:'Select which script you want to access:',components:[new ActionRowBuilder().addComponents(menu)],flags:MessageFlags.Ephemeral});
}
client.once('ready',()=>console.log(`OBSCURITY online as ${client.user.tag}`));
client.on('guildCreate', async guild=>{
  const channel = guild.systemChannel || guild.channels.cache.find(c=>c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'));
  if (!channel) return;
  const e = new EmbedBuilder().setColor(0x7654d6).setTitle('Thank You For Inviting Obscurity!')
    .setDescription('[Setup Guide](https://example.com/setup) • [Website](https://example.com) • [Support](https://example.com/support)\n\n🟢 OBSCURITY is ready to configure.')
    .setFooter({text:'OBSCURITY • Script Protection'});
  channel.send({embeds:[e]}).catch(()=>{});
});
client.on('interactionCreate', async i=>{
  try {
    if (i.isChatInputCommand()) {
      const g=i.guildId, name=i.commandName;
      if (name==='ping') return i.reply({content:`🏓 Pong! ${client.ws.ping}ms`,flags:MessageFlags.Ephemeral});
      if (name==='help') return i.reply({content:'**OBSCURITY**\n`/whitelist` `/blacklist` `/unwhitelist` `/unblacklist` `/set buyer` `/setlogs` `/create script` `/delete script` `/my scripts` `/script info` `/script panel` `/owner panel` `/check` `/lockdown` `/games` `/login`',flags:MessageFlags.Ephemeral});
      if (name==='set' && i.options.getSubcommand()==='buyer') { if(!isStaff(i)) return i.reply({content:'Staff only.',flags:MessageFlags.Ephemeral}); setSetting(g,'buyer_role',i.options.getRole('role').id); return i.reply({content:`${EMOJI.check} Buyer role set to <@&${i.options.getRole('role').id}>.`,flags:MessageFlags.Ephemeral}); }
      if (name==='setlogs') { if(!isStaff(i)) return i.reply({content:'Staff only.',flags:MessageFlags.Ephemeral}); setSetting(g,'announcement_channel',i.options.getChannel('channel').id); return i.reply({content:`${EMOJI.check} Announcements will be sent in <#${i.options.getChannel('channel').id}>.`,flags:MessageFlags.Ephemeral}); }
      if (name==='create' && i.options.getSubcommand()==='script') { const n=i.options.getString('name'); const r=db.prepare('INSERT INTO scripts(guild_id,owner_id,name,title) VALUES(?,?,?,?)').run(g,i.user.id,n,n); return i.reply({content:`${EMOJI.check} Created **${n}**. Script ID: [1m${r.lastInsertRowid}[0m`,flags:MessageFlags.Ephemeral}); }
      if (name==='my' && i.options.getSubcommand()==='scripts') { const a=db.prepare('SELECT id,name,mode,enabled FROM scripts WHERE guild_id=? AND owner_id=? ORDER BY id DESC').all(g,i.user.id); return i.reply({content:a.length?a.map(s=>`**${s.name}** • ID [1m${s.id}[0m • ${s.mode} • ${s.enabled?'Enabled':'Disabled'}`).join('\n'):'You have not created any scripts.',flags:MessageFlags.Ephemeral}); }
      if (name==='delete' && i.options.getSubcommand()==='script') { const id=i.options.getInteger('script_id'),s=getScript(id); if(!s||s.guild_id!==g||(!isStaff(i)&&s.owner_id!==i.user.id)) return i.reply({content:'Script not found or you do not own it.',flags:MessageFlags.Ephemeral}); db.prepare('DELETE FROM scripts WHERE id=?').run(id); return i.reply({content:`${EMOJI.check} Script #${id} deleted.`,flags:MessageFlags.Ephemeral}); }
      if (name==='script' && i.options.getSubcommand()==='info') { const s=getScript(i.options.getInteger('script_id')); if(!s||s.guild_id!==g) return i.reply({content:'Script not found.',flags:MessageFlags.Ephemeral}); return i.reply({embeds:[new EmbedBuilder().setColor(0x7654d6).setTitle(s.title||s.name).setDescription(s.description||'No description set.').addFields({name:'Script ID',value:String(s.id),inline:true},{name:'Mode',value:s.mode,inline:true},{name:'Status',value:s.enabled?'Enabled':'Disabled',inline:true})],flags:MessageFlags.Ephemeral}); }
      if (name==='script' && i.options.getSubcommand()==='panel') { const panel=await i.reply({embeds:[panelEmbed()],components:panelRows(),fetchReply:true}); setSetting(g,'customer_panel_url',panel.url); return; }
      if (name==='owner' && i.options.getSubcommand()==='panel') { if(!isStaff(i)) return i.reply({content:'OBSCURITY staff only.',flags:MessageFlags.Ephemeral}); const scripts=db.prepare('SELECT id,name,owner_id,mode,enabled FROM scripts WHERE guild_id=? ORDER BY id DESC LIMIT 20').all(g); return i.reply({content:scripts.length?'**OBSCURITY • Owner Panel**\n'+scripts.map(s=>`#${s.id} **${s.name}** • <@${s.owner_id}> • ${s.mode} • ${s.enabled?'Enabled':'Disabled'}`).join('\n'):'No scripts registered yet.',flags:MessageFlags.Ephemeral}); }
      if (name==='whitelist') {
        if(!isStaff(i)) return i.reply({content:'Staff only.',flags:MessageFlags.Ephemeral});
        if(getSetting(g,'lockdown')==='true') return i.reply({content:'🔒 Whitelist changes are currently locked down.',flags:MessageFlags.Ephemeral});
        const user=i.options.getUser('user'), id=i.options.getInteger('script_id'), s=getScript(id);
        if(!s||s.guild_id!==g) return i.reply({content:'Script ID not found in this server.',flags:MessageFlags.Ephemeral});
        if(db.prepare('SELECT 1 FROM blacklist WHERE guild_id=? AND user_id=?').get(g,user.id)) return i.reply({content:'This member is blacklisted. Remove the blacklist first.',flags:MessageFlags.Ephemeral});
        db.prepare(`INSERT INTO access(guild_id,user_id,script_id,status) VALUES(?,?,?,'whitelisted') ON CONFLICT(guild_id,user_id,script_id) DO UPDATE SET status='whitelisted',updated_at=CURRENT_TIMESTAMP`).run(g,user.id,id);
        await i.reply({content:`${EMOJI.check} Whitelisted ${user.tag} for **${s.name}**.`,flags:MessageFlags.Ephemeral});
        const ch= i.guild.channels.cache.get(getSetting(g,'announcement_channel')) || i.channel;
        const panelMsg=db.prepare("SELECT value FROM settings WHERE guild_id=? AND key='customer_panel_url'").get(g)?.value;
        await ch.send({content:`<@${user.id}> You Have Been Whitelisted 🟢\nAccess Your Script In: ${panelMsg||'Run /script panel to access the customer panel.'}`,allowedMentions:{users:[user.id]}}).catch(()=>{});
        const roleId=getSetting(g,'buyer_role'); if(roleId){ const m=await i.guild.members.fetch(user.id).catch(()=>null); if(m) await m.roles.add(roleId).catch(()=>{}); }
        return;
      }
      if (name==='blacklist') { if(!isStaff(i)) return i.reply({content:'Staff only.',flags:MessageFlags.Ephemeral}); const u=i.options.getUser('user'),reason=i.options.getString('reason')||'No reason supplied'; db.prepare('INSERT INTO blacklist(guild_id,user_id,reason) VALUES(?,?,?) ON CONFLICT(guild_id,user_id) DO UPDATE SET reason=excluded.reason').run(g,u.id,reason); db.prepare("UPDATE access SET status='blacklisted',updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND user_id=?").run(g,u.id); await i.reply({content:`${EMOJI.check} ${u.tag} blacklisted.`,flags:MessageFlags.Ephemeral}); const ch=i.guild.channels.cache.get(getSetting(g,'announcement_channel'))||i.channel; await ch.send({content:`<@${u.id}> You Have Been Blacklisted 🔴`,allowedMentions:{users:[u.id]}}).catch(()=>{}); return; }
      if (name==='unwhitelist') { if(!isStaff(i)) return i.reply({content:'Staff only.',flags:MessageFlags.Ephemeral}); db.prepare('DELETE FROM access WHERE guild_id=? AND user_id=? AND script_id=?').run(g,i.options.getUser('user').id,i.options.getInteger('script_id')); return i.reply({content:`${EMOJI.check} Whitelist entry removed.`,flags:MessageFlags.Ephemeral}); }
      if (name==='unblacklist') { if(!isStaff(i)) return i.reply({content:'Staff only.',flags:MessageFlags.Ephemeral}); db.prepare('DELETE FROM blacklist WHERE guild_id=? AND user_id=?').run(g,i.options.getUser('user').id); return i.reply({content:`${EMOJI.check} Blacklist entry removed.`,flags:MessageFlags.Ephemeral}); }
      if (name==='check') { if(!isStaff(i)) return i.reply({content:'Staff only.',flags:MessageFlags.Ephemeral}); const a=db.prepare('SELECT status FROM access WHERE guild_id=? AND user_id=? AND script_id=?').get(g,i.options.getUser('user').id,i.options.getInteger('script_id')); return i.reply({content:a?`Status: **${a.status}**`:'No whitelist record.',flags:MessageFlags.Ephemeral}); }
      if (name==='lockdown') { if(!i.memberPermissions.has(PermissionFlagsBits.Administrator)) return i.reply({content:'Administrators only.',flags:MessageFlags.Ephemeral}); setSetting(g,'lockdown',i.options.getBoolean('enabled')); return i.reply({content:`🔒 Lockdown ${i.options.getBoolean('enabled')?'enabled':'disabled'}.`,flags:MessageFlags.Ephemeral}); }
      if (name==='games') { const row=new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('game:select').setPlaceholder('Choose a game').addOptions([{label:'Tap The Cookie',value:'cookie',emoji:'🍪'},{label:'Guess The Number',value:'number',emoji:'🔢'}])); return i.reply({content:'**OBSCURITY Games**\nChoose a game:',components:[row],flags:MessageFlags.Ephemeral}); }
      if (name==='login') return i.reply({content:'Dashboard code verification is not connected yet. Configure the dashboard API endpoint before using `/login`.',flags:MessageFlags.Ephemeral});
    }
    if (i.isButton() && i.customId.startsWith('customer:')) return chooseScript(i,i.customId.split(':')[1]);
    if (i.isStringSelectMenu() && i.customId.startsWith('pick:')) {
      const action=i.customId.split(':')[1], id=Number(i.values[0]);
      const a=db.prepare("SELECT * FROM access WHERE guild_id=? AND user_id=? AND script_id=? AND status='whitelisted'").get(i.guildId,i.user.id,id);
      const s=getScript(id); if(!a||!s) return i.update({content:'You do not have access to that script.',components:[]});
      let content='';
      if(action==='view') content=`**${s.title||s.name}**\n${s.description||'No description available.'}\nScript ID: ${s.id}`;
      if(action==='info') content=`**${s.title||s.name}**\n${s.description||'No description available.'}\nMode: ${s.mode}\nStatus: ${s.enabled?'Enabled':'Disabled'}`;
      if(action==='key') content=`**Key Information**\nScript: ${s.name}\nKey: ${a.key_value?'||'+a.key_value+'||':'No key assigned'}\nStatus: ${a.status}\nExpiry: ${a.expires_at||'No expiry recorded'}`;
      if(action==='hwid') { db.prepare("UPDATE access SET hwid='',updated_at=CURRENT_TIMESTAMP WHERE guild_id=? AND user_id=? AND script_id=?").run(i.guildId,i.user.id,id); content='Your HWID has been cleared. You may need to execute the script again to register your device.'; }
      if(action==='role') { const rid=getSetting(i.guildId,'buyer_role'); if(!rid) content='The server has not configured a buyer role yet.'; else { const m=await i.guild.members.fetch(i.user.id); await m.roles.add(rid).catch(()=>{}); content=`Buyer role granted: <@&${rid}>`; } }
      return i.update({content,components:[]});
    }
    if(i.isStringSelectMenu() && i.customId==='game:select') {
      if(i.values[0]==='cookie') { const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('game:cookie').setLabel('🍪 Tap the Cookie').setStyle(ButtonStyle.Primary).setDisabled(true)); await i.reply({content:'🍪 Get ready... 3',flags:MessageFlags.Ephemeral}); setTimeout(async()=>{const m=await i.followUp({content:'GO! Tap the cookie!',components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`game:cookie:${i.id}`).setLabel('🍪 TAP!').setStyle(ButtonStyle.Success))],fetchReply:true}).catch(()=>null); if(m) setTimeout(()=>m.edit({content:'Game ended.',components:[]}).catch(()=>{}),30000)},3000); return; }
      if(i.values[0]==='number') return i.reply({content:'Guess The Number setup: this game needs a public channel and a secret number. A dedicated host setup flow is coming next.',flags:MessageFlags.Ephemeral});
    }
    if(i.isButton() && i.customId.startsWith('game:cookie:')) { const msg=i.message; if(msg.content.includes('Winner:')) return i.reply({content:'Someone already won!',flags:MessageFlags.Ephemeral}); await msg.edit({content:`🍪 Winner: <@${i.user.id}>!`,components:[]}); return i.reply({content:'You won!',flags:MessageFlags.Ephemeral}); }
  } catch(e) { console.error(e); const payload={content:'Something went wrong. Please try again or contact OBSCURITY staff.',flags:MessageFlags.Ephemeral}; if(i.deferred||i.replied) await i.followUp(payload).catch(()=>{}); else await i.reply(payload).catch(()=>{}); }
});
if(!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is missing. Copy .env.example to .env and add your bot token.');
client.login(process.env.DISCORD_TOKEN);
