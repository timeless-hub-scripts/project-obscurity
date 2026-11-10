const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const cmd = [];
const add = c => cmd.push(c);

add(new SlashCommandBuilder().setName('whitelist').setDescription('Whitelist a member for a script')
  .addUserOption(o=>o.setName('user').setDescription('Member to whitelist').setRequired(true))
  .addIntegerOption(o=>o.setName('script_id').setDescription('Registered script ID').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild));
add(new SlashCommandBuilder().setName('blacklist').setDescription('Blacklist a member')
  .addUserOption(o=>o.setName('user').setDescription('Member to blacklist').setRequired(true))
  .addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild));
add(new SlashCommandBuilder().setName('unwhitelist').setDescription('Remove a member from a script whitelist')
  .addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))
  .addIntegerOption(o=>o.setName('script_id').setDescription('Script ID').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild));
add(new SlashCommandBuilder().setName('unblacklist').setDescription('Remove a member from the blacklist')
  .addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild));
add(new SlashCommandBuilder().setName('set').setDescription('Configure OBSCURITY')
  .addSubcommand(s=>s.setName('buyer').setDescription('Set the buyer role')
    .addRoleOption(o=>o.setName('role').setDescription('Role assigned to whitelisted buyers').setRequired(true)))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild));
add(new SlashCommandBuilder().setName('setlogs').setDescription('Set the channel for whitelist and blacklist announcements')
  .addChannelOption(o=>o.setName('channel').setDescription('Announcement channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild));
add(new SlashCommandBuilder().setName('create').setDescription('Create a script')
  .addSubcommand(s=>s.setName('script').setDescription('Register a script')
    .addStringOption(o=>o.setName('name').setDescription('Script name').setRequired(true)))
  );
add(new SlashCommandBuilder().setName('delete').setDescription('Delete one of your scripts')
  .addSubcommand(s=>s.setName('script').setDescription('Delete a script')
    .addIntegerOption(o=>o.setName('script_id').setDescription('Script ID').setRequired(true))));
add(new SlashCommandBuilder().setName('my').setDescription('Show your scripts')
  .addSubcommand(s=>s.setName('scripts').setDescription('List your scripts')));
add(new SlashCommandBuilder().setName('script').setDescription('Script tools')
  .addSubcommand(s=>s.setName('info').setDescription('View script information')
    .addIntegerOption(o=>o.setName('script_id').setDescription('Script ID').setRequired(true)))
  .addSubcommand(s=>s.setName('panel').setDescription('Post the public customer panel')));
add(new SlashCommandBuilder().setName('owner').setDescription('OBSCURITY staff tools')
  .addSubcommand(s=>s.setName('panel').setDescription('Open the private staff management panel')));
add(new SlashCommandBuilder().setName('check').setDescription('Check a member’s whitelist status')
  .addUserOption(o=>o.setName('user').setDescription('Member').setRequired(true))
  .addIntegerOption(o=>o.setName('script_id').setDescription('Script ID').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild));
add(new SlashCommandBuilder().setName('lockdown').setDescription('Temporarily block whitelist changes')
  .addBooleanOption(o=>o.setName('enabled').setDescription('Enable lockdown').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator));
add(new SlashCommandBuilder().setName('games').setDescription('Open the private games menu'));
add(new SlashCommandBuilder().setName('login').setDescription('Verify this server for dashboard access')
  .addStringOption(o=>o.setName('code').setDescription('Your dashboard server code').setRequired(true)));
add(new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'));
add(new SlashCommandBuilder().setName('help').setDescription('Show OBSCURITY commands'));
module.exports = cmd.map(c=>c.toJSON());
