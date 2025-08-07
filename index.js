// =======================================
// 🛠️ Ticket Bot developed by Buffy
// 🌐 Discord: buffyzyd
// 📅 Created to enhance support systems
// =======================================


require('dotenv').config();
const { 
  Client, Collection, GatewayIntentBits, Partials,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, EmbedBuilder, PermissionsBitField,
  ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.existsSync(commandsPath) ? fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')) : [];
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
}

const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
const TICKETS_FILE = path.join(__dirname, 'data', 'tickets.json');
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8') || '{}'); } catch (e) { return {}; }
}
function saveSettings(obj) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(obj, null,2)); }
function loadTickets() {
  try { return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8') || '{}'); } catch (e) { return {}; }
}
function saveTickets(obj) { fs.writeFileSync(TICKETS_FILE, JSON.stringify(obj, null,2)); }

client.once('ready', () => {
  console.log(`Ready as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  // Slash command handler
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;
    try { await cmd.execute(client, interaction, { loadSettings, saveSettings, loadTickets, saveTickets }); }
    catch (err) {
      console.error(err);
      if (interaction.replied || interaction.deferred) interaction.followUp({ content: 'Error executing command.', ephemeral: true });
      else interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
    return;
  }

  // Button: open ticket panel -> show category select (ephemeral)
  if (interaction.isButton() && interaction.customId === 'open_ticket') {
    const settings = loadSettings();
    const guildSettings = settings[interaction.guild.id];
    if (!guildSettings) return interaction.reply({ content: 'Ticket system not configured in this server.', ephemeral: true });

    const categories = [
      { label: 'Support', value: 'Support' },
      { label: 'Tech', value: 'Tech' },
      { label: 'Billing', value: 'Billing' },
      { label: 'Other', value: 'Other' }
    ];

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_ticket_category')
      .setPlaceholder('Choose a category for your ticket')
      .addOptions(categories.map(c=>({ label: c.label, value: c.value })));

    const row = new ActionRowBuilder().addComponents(select);

    return interaction.reply({ content: 'Please pick a category:', components: [row], ephemeral: true });
  }

  // Handle select menu choice -> create ticket
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_category') {
    await interaction.deferReply({ ephemeral: true });
    const category = interaction.values[0];
    const settings = loadSettings();
    const guildSettings = settings[interaction.guild.id];
    if (!guildSettings) return interaction.editReply({ content: 'Ticket system not configured for this server.' });

    // create unique name from username
    const rawName = interaction.user.username || `user-${interaction.user.id}`;
    const safe = rawName.toLowerCase().replace(/[^a-z0-9\\-]/g, '-').slice(0, 90);
    let channelName = `ticket-${safe}`;

    // ensure unique by appending short id if exists
    let suffix = 0;
    while (interaction.guild.channels.cache.find(c => c.name === channelName)) {
      suffix++;
      channelName = `ticket-${safe}-${suffix}`;
      if (suffix > 50) break;
    }

    const created = await interaction.guild.channels.create({
      name: channelName,
      type: 0,
      parent: guildSettings.categoryId,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: guildSettings.staffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
      ]
    }).catch(e=>{ console.error(e); return null; });

    if (!created) return interaction.editReply({ content: 'Failed to create ticket channel. Check bot permissions.' });

    // Save ticket info
    const tickets = loadTickets();
    tickets[created.id] = { openerId: interaction.user.id, openerTag: interaction.user.tag, category, channelId: created.id, createdAt: new Date().toISOString(), guildId: interaction.guild.id, claimedBy: null };
    saveTickets(tickets);

    // Send ticket embed
    const embed = new EmbedBuilder()
      .setTitle(`Ticket — ${category}`)
      .setDescription(`Hello <@${interaction.user.id}> — our team will be with you shortly.\n\nTicket opened by: <@${interaction.user.id}>`)
      .addFields(
        { name: 'Category', value: category, inline: true },
        { name: 'Opened by', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: 'Channel', value: `<#${created.id}>`, inline: false },
        { name: 'Status', value: 'Open', inline: true },
        { name: 'Claimed by', value: 'Not claimed', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${created.id}` })
      .setTimestamp();

    // Staff panel buttons (in-channel message)
    const staffRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`claim_${created.id}`).setLabel('Claim').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`close_${created.id}`).setLabel('Close').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`options_${created.id}`).setLabel('Staff Options').setStyle(ButtonStyle.Primary)
    );

    await created.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });
    await created.send({ content: `<@&${guildSettings.staffRoleId}> Staff panel:`, components: [staffRow] });

    await interaction.editReply({ content: `Ticket created: <#${created.id}>`, ephemeral: true });
    return;
  }

  // Modal submit handler for add/remove user
  if (interaction.type === InteractionType.ModalSubmit) {
    const tickets = loadTickets();
    const ticket = tickets[interaction.channelId];
    if (!ticket) return interaction.reply({ content: 'This modal is only for ticket channels.', ephemeral: true });

    const settings = loadSettings();
    const guildSettings = settings[interaction.guild.id];
    if (!guildSettings) return interaction.reply({ content: 'Ticket system not configured.', ephemeral: true });

    const isStaff = interaction.member.roles.cache.has(guildSettings.staffRoleId);
    if (!isStaff) return interaction.reply({ content: 'Only staff can do this.', ephemeral: true });

    if (interaction.customId === 'add_user_modal') {
      const userId = interaction.fields.getTextInputValue('add_user_id').replace(/[<@!>]/g, '').trim();
      const member = await interaction.guild.members.fetch(userId).catch(()=>null);
      if (!member) return interaction.reply({ content: `User ID invalid or not found: ${userId}`, ephemeral: true });

      try {
        await interaction.channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await interaction.reply({ content: `Added user <@${member.id}> to this ticket.`, ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: 'Failed to add user permissions.', ephemeral: true });
      }
      return;
    }

    if (interaction.customId === 'remove_user_modal') {
      const userId = interaction.fields.getTextInputValue('remove_user_id').replace(/[<@!>]/g, '').trim();
      const member = await interaction.guild.members.fetch(userId).catch(()=>null);
      if (!member) return interaction.reply({ content: `User ID invalid or not found: ${userId}`, ephemeral: true });

      try {
        await interaction.channel.permissionOverwrites.delete(member.id);
        await interaction.reply({ content: `Removed user <@${member.id}> from this ticket.`, ephemeral: true });
      } catch (e) {
        await interaction.reply({ content: 'Failed to remove user permissions.', ephemeral: true });
      }
      return;
    }
  }

  // Button interactions inside ticket channels (claim, close, options)
  if (interaction.isButton()) {
    const custom = interaction.customId;
    const tickets = loadTickets();
    const ticket = tickets[interaction.channelId];
    // Only allow these buttons inside known ticket channels
    if (!ticket) return interaction.reply({ content: 'This button can only be used inside ticket channels.', ephemeral: true });

    const settings = loadSettings();
    const guildSettings = settings[interaction.guild.id];
    const isStaff = interaction.member.roles.cache.has(guildSettings.staffRoleId);

    if (custom.startsWith('claim_')) {
      if (!isStaff) return interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });
      // Update ticket claimedBy and edit embed message
      ticket.claimedBy = interaction.user.id;
      saveTickets(tickets);

      // Find the embed message to edit (last embed in channel)
      const fetchedMessages = await interaction.channel.messages.fetch({ limit: 20 });
      const embedMsg = fetchedMessages.find(m => m.embeds.length > 0 && m.embeds[0].title?.startsWith('Ticket —'));
      if (embedMsg) {
        const embed = EmbedBuilder.from(embedMsg.embeds[0])
          .spliceFields(4, 1, { name: 'Claimed by', value: `<@${interaction.user.id}>`, inline: true })
          .spliceFields(3, 1, { name: 'Status', value: 'Claimed', inline: true });
        await embedMsg.edit({ embeds: [embed] }).catch(() => {});
      }

      await interaction.reply({ content: `<@${interaction.user.id}> claimed this ticket.`, ephemeral: false });
      return;
    }

    if (custom.startsWith('close_')) {
      if (!isStaff) return interaction.reply({ content: 'Only staff can close tickets.', ephemeral: true });
      await interaction.reply({ content: 'Closing ticket in 3 seconds...', ephemeral: false });
      setTimeout(async ()=> {
        try {
          await interaction.channel.delete();
          delete tickets[interaction.channelId];
          saveTickets(tickets);
        } catch(e){ console.error(e); }
      }, 3000);
      return;
    }

    if (custom.startsWith('options_')) {
      if (!isStaff) return interaction.reply({ content: 'Only staff can use staff options.', ephemeral: true });

      // Send a modal with text input for Add or Remove user
      const modal = new ModalBuilder()
        .setCustomId('staff_options_modal')
        .setTitle('Staff Options')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('staff_add_user')
              .setLabel('Add User')
              .setStyle(ButtonStyle.Success)
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('staff_remove_user')
              .setLabel('Remove User')
              .setStyle(ButtonStyle.Danger)
          )
        );
      
      // But buttons can't be added to modals, so we'll instead reply with two buttons as a followup message for staff options

      // Send ephemeral followup with add/remove user buttons
      const addRemoveRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('staff_add_user').setLabel('Add User').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('staff_remove_user').setLabel('Remove User').setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ content: 'Choose an option:', components: [addRemoveRow], ephemeral: true });
    }

    // Staff options buttons after reply
    if (custom === 'staff_add_user') {
      if (!isStaff) return interaction.reply({ content: 'Only staff can do this.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId('add_user_modal')
        .setTitle('Add User to Ticket')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('add_user_id')
              .setLabel('User ID or mention')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Enter user ID or @mention')
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }
    if (custom === 'staff_remove_user') {
      if (!isStaff) return interaction.reply({ content: 'Only staff can do this.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId('remove_user_modal')
        .setTitle('Remove User from Ticket')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('remove_user_id')
              .setLabel('User ID or mention')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Enter user ID or @mention')
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
