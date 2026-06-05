require('dotenv').config();
const {
    Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder,
    ChannelType, PermissionFlagsBits
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const db = require('./database/database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
const verificationTemp = new Map();

// Role IDs for verification
const ROLES = {
    REGIONS: {
        'AS/AU': '1460669490911117432',
        'NA': '1460669655956848723',
        'EU': '1460888973122732128'
    },
    WAITLISTS: {
        'crystal': '1460669945783390260',
        'sword': '1460669995439755376',
        'netpot': '1460669995439755376',
        'mace': '1460670119553274050',
        'smp': '1460670177854230600',
        'uhc': '1460670232027988051',
        'dia_smp': '1460670415197438109',
        'dia_pot': '1460670493924528329',
        'axe': '1460670975975624735'
    },
    ACCOUNT_TYPES: {
        'premium': '1460671364045213912',
        'cracked': '1460671296554668287'
    }
};

// Category IDs for high test tickets
const HIGH_TEST_CATEGORIES = {
    'crystal': '1459849014752051375',
    'sword': '1459849136370352230',
    'netpot': '1459849252380348646',
    'uhc': '1459849335390077060',
    'dia_smp': '1459849429199749335',
    'smp': '1459849522556702792',
    'axe': '1459849609596637234',
    'dia_pot': '1459849732330356756',
    'mace': '1459849809321267261'
};

// Load Commands
function loadCommands() {
    client.commands.clear();
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
        }
    }
}

loadCommands();

client.once('ready', async () => {
    console.log(chalk.green(`[SUCCESS]`) + ` Logged in as ${client.user.tag}`);
    console.log(chalk.cyan(`[INFO]`) + ` Bot is online and loaded.`);

    // Update bot identity to Universal Tier
    try {
        if (client.user.username !== 'Universal tier') {
            await client.user.setUsername('Universal tier');
            console.log(chalk.yellow(`[AUTO]`) + ` Username updated to Universal tier`);
        }
    } catch (e) {
        console.warn(chalk.red(`[WARNING]`) + ` Could not update username: ${e.message}`);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Error.', ephemeral: true });
        }
    }

    else if (interaction.isButton()) {
        const { createQueueEmbed } = require('./commands/openq');

        if (interaction.customId === 'waitlist_enter') {
            const modal = new ModalBuilder().setCustomId('waitlist_modal').setTitle('Waitlist Application');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_ign').setLabel('Minecraft Username').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_region').setLabel('Region (AS/AU, NA, EU)').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        else if (interaction.customId.startsWith('q_unclaim_')) {
            const gm = interaction.customId.replace('q_unclaim_', '');
            db.removeTester(interaction.user.id, gm);
            await interaction.update({ embeds: [createQueueEmbed(gm)] });
        }

        else if (interaction.customId === 'request_high_tier') {
            const modal = new ModalBuilder().setCustomId('high_tier_modal').setTitle('High Tier Verification Request');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ht_ign').setLabel('Minecraft IGN').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ht_gm').setLabel('Gamemode(s)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ht_region').setLabel('Region (AS, NA, EU)').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ht_proof').setLabel('Proof (Clips/Previous Ranks)').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        else if (interaction.customId.startsWith('q_claim_')) {
            const gm = interaction.customId.replace('q_claim_', '');
            const { MAPPING } = require('./commands/openq');
            const config = MAPPING[gm];

            // Role check
            if (!interaction.member.roles.cache.has(config.role) && !interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: 'Only authorized testers can claim this slot!', ephemeral: true });
            }

            const testers = db.getTesters(gm);
            if (testers.length >= 3) return interaction.reply({ content: 'Tester slots are full!', ephemeral: true });
            if (testers.find(t => t.userId === interaction.user.id)) return interaction.reply({ content: 'You are already a tester!', ephemeral: true });

            db.addTester(interaction.user.id, interaction.user.username, gm);
            await interaction.update({ embeds: [createQueueEmbed(gm)] });
        }

        else if (interaction.customId.startsWith('q_join_')) {
            const gm = interaction.customId.replace('q_join_', '');
            const { MAPPING } = require('./commands/openq');
            const { notifyNewFirstPlayer } = require('./utils/notif');
            const config = MAPPING[gm];

            // Prevent testers from joining player queue
            if (interaction.member.roles.cache.has(config.role)) {
                return interaction.reply({ content: 'Testers cannot join the player queue!', ephemeral: true });
            }

            const queue = db.getQueue(gm);
            if (queue.length >= 20) return interaction.reply({ content: 'Queue is full!', ephemeral: true });
            if (queue.find(u => u.userId === interaction.user.id)) return interaction.reply({ content: 'You are already in the queue!', ephemeral: true });

            const user = db.getUser(interaction.user.id);
            if (user && user.ign) {
                db.addToQueue(interaction.user.id, user.ign, gm);
                const updatedQueue = db.getQueue(gm);
                if (updatedQueue[0].userId === interaction.user.id) {
                    await notifyNewFirstPlayer(client, gm, updatedQueue);
                }
                await interaction.update({ embeds: [createQueueEmbed(gm)] });
            } else {
                const modal = new ModalBuilder().setCustomId(`q_modal_${gm}`).setTitle('Join Queue');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ign_input').setLabel('Enter your Minecraft IGN').setStyle(TextInputStyle.Short).setRequired(true)));
                await interaction.showModal(modal);
            }
        }

        else if (interaction.customId === 'close_hightest_ticket') {
            // Check if user has permission to close tickets
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) &&
                !interaction.channel.name.includes(interaction.user.username.toLowerCase())) {
                return interaction.reply({ content: 'You do not have permission to close this ticket!', ephemeral: true });
            }

            await interaction.reply({ content: '🔒 Closing ticket and saving transcript...' });

            setTimeout(async () => {
                try {
                    const transcriptChannelId = '1460571216933818540';
                    const transcriptChannel = await client.channels.fetch(transcriptChannelId);

                    // Fetch all messages from the ticket
                    let allMessages = [];
                    let lastMessageId;

                    while (true) {
                        const options = { limit: 100 };
                        if (lastMessageId) options.before = lastMessageId;

                        const messages = await interaction.channel.messages.fetch(options);
                        if (messages.size === 0) break;

                        allMessages.push(...messages.values());
                        lastMessageId = messages.last().id;

                        if (messages.size < 100) break;
                    }

                    // Sort messages by timestamp (oldest first)
                    allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

                    // Create transcript text
                    let transcript = `**Ticket Transcript: ${interaction.channel.name}**\n`;
                    transcript += `**Closed by:** ${interaction.user.tag}\n`;
                    transcript += `**Date:** ${new Date().toLocaleString()}\n`;
                    transcript += `${'='.repeat(50)}\n\n`;

                    for (const msg of allMessages) {
                        const timestamp = new Date(msg.createdTimestamp).toLocaleTimeString();
                        transcript += `[${timestamp}] ${msg.author.tag}: ${msg.content}\n`;

                        // Add attachments if any
                        if (msg.attachments.size > 0) {
                            msg.attachments.forEach(att => {
                                transcript += `  📎 Attachment: ${att.url}\n`;
                            });
                        }

                        // Add embeds if any
                        if (msg.embeds.length > 0) {
                            msg.embeds.forEach(embed => {
                                if (embed.title) transcript += `  📋 Embed Title: ${embed.title}\n`;
                                if (embed.description) transcript += `  📋 Embed Description: ${embed.description}\n`;
                            });
                        }

                        transcript += '\n';
                    }

                    // Split transcript if too long (Discord limit 2000 chars per message)
                    const chunks = [];
                    for (let i = 0; i < transcript.length; i += 1900) {
                        chunks.push(transcript.slice(i, i + 1900));
                    }

                    // Send transcript to the channel
                    const transcriptEmbed = new EmbedBuilder()
                        .setTitle('📜 High Test Ticket Transcript')
                        .setDescription(`**Ticket:** ${interaction.channel.name}\n**Closed by:** ${interaction.user.tag}`)
                        .setColor('#ff0000')
                        .setTimestamp();

                    await transcriptChannel.send({ embeds: [transcriptEmbed] });

                    for (const chunk of chunks) {
                        await transcriptChannel.send({ content: `\`\`\`\n${chunk}\n\`\`\`` });
                    }

                    console.log(chalk.green(`[TRANSCRIPT]`) + ` Saved for ${interaction.channel.name}`);

                    // Delete the ticket channel
                    await interaction.channel.delete();
                    console.log(chalk.yellow(`[TICKET CLOSED]`) + ` ${interaction.channel.name} closed by ${interaction.user.tag}`);
                } catch (error) {
                    console.error(chalk.red('[TICKET DELETE ERROR]'), error);
                }
            }, 5000);
        }
    }

    // --- Modal Handling ---
    else if (interaction.isModalSubmit()) {
        const { createQueueEmbed } = require('./commands/openq');
        const { notifyNewFirstPlayer } = require('./utils/notif');

        if (interaction.customId.startsWith('q_modal_')) {
            const gm = interaction.customId.replace('q_modal_', '');
            const ign = interaction.fields.getTextInputValue('ign_input');
            db.addToQueue(interaction.user.id, ign, gm);

            const updatedQueue = db.getQueue(gm);
            if (updatedQueue[0].userId === interaction.user.id) {
                await notifyNewFirstPlayer(client, gm, updatedQueue);
            }

            await interaction.update({ embeds: [createQueueEmbed(gm)] });
        }

        else if (interaction.customId === 'waitlist_modal') {
            const ign = interaction.fields.getTextInputValue('w_ign');
            let region = interaction.fields.getTextInputValue('w_region').toUpperCase();
            if (region === 'AS' || region === 'AU') region = 'AS/AU';

            if (!ROLES.REGIONS[region]) return interaction.reply({ content: 'Invalid region!', ephemeral: true });

            verificationTemp.set(interaction.user.id, { ign, region });
            const select = new StringSelectMenuBuilder().setCustomId('w_gm').setPlaceholder('Select Gamemode').addOptions(
                { label: 'Crystal', value: 'crystal' }, { label: 'Sword', value: 'sword' }, { label: 'NetPot', value: 'netpot' },
                { label: 'Mace', value: 'mace' }, { label: 'UHC', value: 'uhc' }, { label: 'SMP', value: 'smp' },
                { label: 'Dia SMP', value: 'dia_smp' }, { label: 'Dia Pot', value: 'dia_pot' }, { label: 'Axe', value: 'axe' }
            );
            await interaction.reply({ content: 'Select Gamemode:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }
    }

    else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'hightest_select') {
            const selectedGamemode = interaction.values[0];
            const categoryId = HIGH_TEST_CATEGORIES[selectedGamemode];

            if (!categoryId) {
                return interaction.reply({ content: 'Invalid gamemode selected!', ephemeral: true });
            }

            try {
                // Defer the reply as ticket creation might take time
                await interaction.deferReply({ ephemeral: true });

                // Create the ticket channel
                const ticketChannel = await interaction.guild.channels.create({
                    name: `hightest-${selectedGamemode}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: categoryId,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory,
                                PermissionFlagsBits.AttachFiles
                            ]
                        },
                        {
                            id: client.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ManageChannels
                            ]
                        }
                    ]
                });

                // Get user's current tier from database
                const userData = db.getUser(interaction.user.id);
                const currentTier = userData && userData.tier ? userData.tier : 'Unranked';

                // Create welcome message in the ticket
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`🎫 High Test Ticket - ${selectedGamemode.toUpperCase()}`)
                    .setDescription(
                        `**User:** ${interaction.user}\n` +
                        `**Current Tier:** ${currentTier}`
                    )
                    .setColor('#00ff00')
                    .setTimestamp()
                    .setFooter({ text: `Ticket for ${interaction.user.tag}` });

                const closeButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_hightest_ticket')
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                await ticketChannel.send({
                    content: `${interaction.user}`,
                    embeds: [welcomeEmbed],
                    components: [closeButton]
                });

                await interaction.editReply({
                    content: `✅ Your high test ticket has been created: ${ticketChannel}`
                });

                console.log(chalk.green(`[HIGH TEST]`) + ` Ticket created for ${interaction.user.tag} - ${selectedGamemode}`);

            } catch (error) {
                console.error(chalk.red('[TICKET ERROR]'), error);
                await interaction.editReply({
                    content: '❌ Failed to create ticket. Please contact an administrator.'
                });
            }
            return;
        }

        const userData = verificationTemp.get(interaction.user.id);
        if (!userData) return interaction.reply({ content: 'Session expired.', ephemeral: true });

        if (interaction.customId === 'w_gm') {
            userData.gamemode = interaction.values[0];
            const select = new StringSelectMenuBuilder().setCustomId('w_acc').setPlaceholder('Select Account Type').addOptions(
                { label: 'Premium', value: 'premium' }, { label: 'Cracked', value: 'cracked' }
            );
            await interaction.update({ content: 'Select Account Type:', components: [new ActionRowBuilder().addComponents(select)] });
        }

        else if (interaction.customId === 'w_acc') {
            const acctype = interaction.values[0];
            const { ign, region, gamemode } = userData;

            try {
                await interaction.member.roles.add([ROLES.REGIONS[region], ROLES.WAITLISTS[gamemode], ROLES.ACCOUNT_TYPES[acctype]]);
                db.updateUser(interaction.user.id, ign, 'Unranked', region);
                verificationTemp.delete(interaction.user.id);
                await interaction.update({ content: `Applied Successfully!\nIGN: \`${ign}\` | Region: \`${region}\` | GM: \`${gamemode}\``, components: [] });
            } catch (err) {
                console.error(chalk.red('[ROLE ERROR]'), err);
                await interaction.update({ content: 'Role Error. Check Bot Role Position!', components: [] });
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
