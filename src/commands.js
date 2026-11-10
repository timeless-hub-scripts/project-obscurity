const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const commands = [];
const staff = c => c.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
const admin = c => c.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
const owner = c => c.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
const user = (o, description = 'Discord member') => o.addUserOption(x => x.setName('user').setDescription(description).setRequired(true));
const script = (o, description = 'Script name') => o.addStringOption(x => x.setName('script').setDescription(description).setRequired(true));

commands.push(staff(new SlashCommandBuilder().setName('whitelist').setDescription('Grant a member access to a script')
  .addUserOption(o => o.setName('user').setDescription('Member to whitelist').setRequired(true))
  .addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true))
  .addIntegerOption(o => o.setName('days').setDescription('Access duration in days; omit for permanent access').setMinValue(1))));
commands.push(staff(new SlashCommandBuilder().setName('unwhitelist').setDescription('Remove a member from a script')
  .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('blacklist').setDescription('Blacklist a member and suspend access')
  .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason'))));
commands.push(staff(new SlashCommandBuilder().setName('unblacklist').setDescription('Remove a member from the blacklist').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('whitelisted').setDescription('List active whitelist records').addStringOption(o => o.setName('script').setDescription('Optional script name'))));
commands.push(staff(new SlashCommandBuilder().setName('blacklisted').setDescription('List blacklisted members')));
commands.push(staff(new SlashCommandBuilder().setName('check').setDescription('Check a member access status').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true))));
commands.push(admin(new SlashCommandBuilder().setName('whitelistall').setDescription('Grant a member access to every script').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))));

commands.push(staff(new SlashCommandBuilder().setName('genkey').setDescription('Generate a licence key').addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true)).addIntegerOption(o => o.setName('days').setDescription('Duration in days').setMinValue(1).setRequired(true)).addIntegerOption(o => o.setName('uses').setDescription('Maximum redemptions; omit for unlimited').setMinValue(1))));
commands.push(new SlashCommandBuilder().setName('redeem').setDescription('Redeem a licence key').addStringOption(o => o.setName('key').setDescription('Licence key').setRequired(true)));
commands.push(staff(new SlashCommandBuilder().setName('revokekey').setDescription('Revoke a licence key').addStringOption(o => o.setName('key').setDescription('Licence key').setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('extendkey').setDescription('Extend a member script access').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true)).addIntegerOption(o => o.setName('days').setDescription('Additional days').setMinValue(1).setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('keyinfo').setDescription('Show licence key information').addStringOption(o => o.setName('key').setDescription('Licence key').setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('keylist').setDescription('List generated licence keys')));
commands.push(staff(new SlashCommandBuilder().setName('resetkey').setDescription('Reset a member key and HWID binding').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('transferkey').setDescription('Transfer script access to another member').addUserOption(o => o.setName('from').setDescription('Current owner').setRequired(true)).addUserOption(o => o.setName('to').setDescription('New owner').setRequired(true)).addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true))));

commands.push(staff(new SlashCommandBuilder().setName('userinfo').setDescription('Show a member OBSCURITY profile').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('lookup').setDescription('Look up a Discord user ID').addStringOption(o => o.setName('user_id').setDescription('Discord user ID').setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('userhistory').setDescription('Show a member audit history').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))));
commands.push(staff(new SlashCommandBuilder().setName('resethwid').setDescription('Clear a member HWID').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true))));

commands.push(owner(new SlashCommandBuilder().setName('lockdown').setDescription('Enable or disable security lockdown').addBooleanOption(o => o.setName('enabled').setDescription('Enable lockdown').setRequired(true))));
const setCommand = new SlashCommandBuilder().setName('set').setDescription('Configure OBSCURITY');
setCommand.addSubcommand(s => s.setName('logs').setDescription('Set the audit and announcement channel').addChannelOption(o => o.setName('channel').setDescription('Text channel').addChannelTypes(ChannelType.GuildText).setRequired(true)));
setCommand.addSubcommand(s => s.setName('buyer').setDescription('Set the buyer role').addRoleOption(o => o.setName('role').setDescription('Buyer role').setRequired(true)));
commands.push(admin(setCommand));
commands.push(owner(new SlashCommandBuilder().setName('setstaff').setDescription('Set the staff role').addRoleOption(o => o.setName('role').setDescription('Staff role').setRequired(true))));
commands.push(owner(new SlashCommandBuilder().setName('setadmin').setDescription('Set the administrator role').addRoleOption(o => o.setName('role').setDescription('Admin role').setRequired(true))));
commands.push(admin(new SlashCommandBuilder().setName('permissions').setDescription('Show configured roles')));

commands.push(new SlashCommandBuilder().setName('help').setDescription('Open the OBSCURITY help menu'));
commands.push(new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'));
commands.push(new SlashCommandBuilder().setName('about').setDescription('About OBSCURITY'));
commands.push(new SlashCommandBuilder().setName('botinfo').setDescription('Show bot runtime information'));
commands.push(new SlashCommandBuilder().setName('invite').setDescription('Show the bot invite link'));
commands.push(new SlashCommandBuilder().setName('support').setDescription('Show support information'));

commands.push(new SlashCommandBuilder().setName('games').setDescription('Play an OBSCURITY game')
  .addSubcommand(s => s.setName('cookie').setDescription('Start Tap The Cookie'))
  .addSubcommand(s => s.setName('guess').setDescription('Start a number guessing game').addChannelOption(o => o.setName('channel').setDescription('Game channel').addChannelTypes(ChannelType.GuildText).setRequired(true)).addIntegerOption(o => o.setName('number').setDescription('Secret number from 1 to 100').setMinValue(1).setMaxValue(100).setRequired(true))));

commands.push(staff(new SlashCommandBuilder().setName('create').setDescription('Create a script').addSubcommand(s => s.setName('script').setDescription('Create a script').addStringOption(o => o.setName('name').setDescription('Script name').setRequired(true)).addStringOption(o => o.setName('description').setDescription('Script description')))));
commands.push(new SlashCommandBuilder().setName('delete').setDescription('Delete a script').addSubcommand(s => s.setName('script').setDescription('Delete a script').addStringOption(o => o.setName('name').setDescription('Script name').setRequired(true))));
commands.push(new SlashCommandBuilder().setName('my').setDescription('Show your scripts and access').addSubcommand(s => s.setName('scripts').setDescription('List scripts')));
commands.push(new SlashCommandBuilder().setName('script').setDescription('Script tools')
  .addSubcommand(s => s.setName('info').setDescription('View script information').addStringOption(o => o.setName('name').setDescription('Script name').setRequired(true)))
  .addSubcommand(s => s.setName('manage').setDescription('Edit script details').addStringOption(o => o.setName('name').setDescription('Script name').setRequired(true)).addStringOption(o => o.setName('description').setDescription('New description')).addStringOption(o => o.setName('title').setDescription('New panel title')).addStringOption(o => o.setName('price').setDescription('Display price')))
  .addSubcommand(s => s.setName('panel').setDescription('Publish the customer panel').addStringOption(o => o.setName('name').setDescription('Script name').setRequired(true)))
  .addSubcommand(s => s.setName('transfer').setDescription('Transfer script ownership').addStringOption(o => o.setName('name').setDescription('Script name').setRequired(true)).addUserOption(o => o.setName('owner').setDescription('New owner').setRequired(true)))
  .addSubcommand(s => s.setName('publish').setDescription('Publish a script').addStringOption(o => o.setName('name').setDescription('Script name').setRequired(true)))
  .addSubcommand(s => s.setName('unpublish').setDescription('Unpublish a script').addStringOption(o => o.setName('name').setDescription('Script name').setRequired(true))));
commands.push(new SlashCommandBuilder().setName('owner').setDescription('Staff management tools').addSubcommand(s => s.setName('panel').setDescription('Open the private management panel')));
commands.push(admin(new SlashCommandBuilder().setName('modify').setDescription('Modify a script panel').addSubcommand(s => s.setName('panel').setDescription('Modify panel content').addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true)).addStringOption(o => o.setName('title').setDescription('New panel title')).addStringOption(o => o.setName('description').setDescription('New panel description')))));

commands.push(new SlashCommandBuilder().setName('profile').setDescription('Show your OBSCURITY profile'));
commands.push(new SlashCommandBuilder().setName('serverinfo').setDescription('Show server information'));
commands.push(staff(new SlashCommandBuilder().setName('logs').setDescription('Show recent audit history')));
commands.push(admin(new SlashCommandBuilder().setName('export').setDescription('Export a script access list').addStringOption(o => o.setName('script').setDescription('Script name').setRequired(true))));

module.exports = commands.map(c => c.toJSON());
