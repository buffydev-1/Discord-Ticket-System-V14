// =======================================
// 🛠️ Ticket Bot developed by Buffy
// 🌐 Discord: buffyzyd
// 📅 Created to enhance support systems
// =======================================


const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) fs.mkdirSync(path.join(__dirname, '..', 'data'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup_ticket')
    .setDescription('Setup ticket system (creates category + panel).')
    .addRoleOption(opt => opt.setName('staffrole').setDescription('Role that will act as staff').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(client, interaction, helpers) {
    await interaction.deferReply({ ephemeral: true });
    const staffRole = interaction.options.getRole('staffrole');

    // create category
    const category = await interaction.guild.channels.create({
      name: '🎫 Tickets',
      type: 4,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }
      ]
    }).catch(()=>null);

    // create panel channel
    const panel = await interaction.guild.channels.create({
      name: 'ticket-panel',
      type: 0,
      parent: category?.id
    }).catch(()=>null);

    const embed = new EmbedBuilder()
      .setTitle('Support — Open a Ticket')
      .setDescription('Click **Open Ticket** and choose a category to create a private ticket channel with our staff.')
      .setFooter({ text: 'Ticket system' });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('open_ticket').setLabel('Open Ticket').setStyle(ButtonStyle.Primary)
    );

    const panelMessage = await panel.send({ embeds: [embed], components: [button] });

    // save settings per guild
    let settings = {};
    try { settings = JSON.parse(fs.readFileSync(SETTINGS_FILE,'utf8') || '{}'); } catch(e){ settings = {}; }
    settings[interaction.guild.id] = { categoryId: category?.id, panelChannelId: panel.id, panelMessageId: panelMessage.id, staffRoleId: staffRole.id };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null,2));

    await interaction.editReply({ content: 'Ticket panel created!', ephemeral: true });
  }
};
