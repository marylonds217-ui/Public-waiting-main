const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionsBitField, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, AudioPlayerStatus, entersState, VoiceConnectionStatus, StreamType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

// إعداد مكتبة الصوت
try {
    require('@discordjs/opus');
    console.log('✅ مكتبة الصوت جاهزة باستخدام @discordjs/opus');
} catch (e1) {
    try {
        const OpusScript = require('opusscript');
        const encoder = new OpusScript(48000, 2);
        console.log('✅ مكتبة الصوت جاهزة باستخدام opusscript');
    } catch (e2) {
        console.warn('⚠️ لا توجد مكتبة opus متاحة:', e1.message);
    }
}

// الإعدادات الأساسية
const config = {
    token: process.env.DISCORD_TOKEN
};

// إضافة معرف المالك
const BOT_OWNER_ID = '1423320282281676878';
const OWNER_PREFIX = '!';
const CLIENT_ID = process.env.CLIENT_ID || '1481260302241759255';

// ملف الإعدادات
const SETTINGS_FILE = 'settings.json';

// دالة لتحميل الإعدادات
function loadSettings() {
    if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    }
    return { lockedServers: [] };
}

// دالة لحفظ الإعدادات
function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// تحميل الإعدادات الحالية
const serverSettings = loadSettings();

// تعريف مجموعات الصوت
const audioSets = [
    {
        id: 'set1',
        name: 'الطقم الأول',
        waiting: 'waiting_call.mp3',
        background: 'background_music.mp3'
    },
    {
        id: 'set2',
        name: 'الطقم الثاني',
        waiting: 'waiting2_call.mp3',
        background: 'background2_music.mp3'
    },
    {
        id: 'set3',
        name: 'طقم بدون انتظار',
        waiting: null,
        background: 'background_music.mp3'
    }
];

// دالة للتحقق من اكتمال إعدادات السيرفر
function isServerSetupComplete(guildId) {
    const settings = serverSettings[guildId];
    if (!settings) return false;
    return settings.categoryId && settings.voiceId && settings.textId && settings.adminRoleId;
}

// دالة للحصول على إعدادات سيرفر معين
function getServerSettings(guildId) {
    return serverSettings[guildId];
}

// دالة للحصول على مجموعة صوتية بالـ ID
function getAudioSetById(audioSetId) {
    return audioSets.find(set => set.id === audioSetId) || audioSets[0];
}

// دالة لعرض الإعدادات بشكل جميل
function formatSettings(guild, settings) {
    const audioSet = getAudioSetById(settings.audioSetId || 'set1');

    let categoryName = '❌ غير محدد';
    let voiceName = '❌ غير محدد';
    let textName = '❌ غير محدد';
    let roleName = '❌ غير محدد';

    try {
        if (settings.categoryId) {
            const category = guild.channels.cache.get(settings.categoryId);
            categoryName = category ? category.name : '❌ قناة غير موجودة';
        }
        if (settings.voiceId) {
            const voice = guild.channels.cache.get(settings.voiceId);
            voiceName = voice ? voice.name : '❌ قناة غير موجودة';
        }
        if (settings.textId) {
            const text = guild.channels.cache.get(settings.textId);
            textName = text ? text.name : '❌ قناة غير موجودة';
        }
        if (settings.adminRoleId) {
            const role = guild.roles.cache.get(settings.adminRoleId);
            roleName = role ? role.name : '❌ رتبة غير موجودة';
        }
    } catch (error) {
        console.log('خطأ في جلب البيانات:', error);
    }

    return `
**🎛️ إعدادات نظام الدعم**

**📂 التصنيف:** ${categoryName} \`(${settings.categoryId || 'غير محدد'})\`
**🎧 روم الانتظار:** ${voiceName} \`(${settings.voiceId || 'غير محدد'})\`
**💬 روم الإشعارات:** ${textName} \`(${settings.textId || 'غير محدد'})\`
**👑 رتبة الإدارة:** ${roleName} \`(${settings.adminRoleId || 'غير محدد'})\`
**🎵 مجموعة الصوت:** ${audioSet.name}

**📊 حالة الإعدادات:** ${isServerSetupComplete(guild.id) ? '✅ مكتملة' : '❌ غير مكتملة'}
    `;
}

// ================ البوت الأساسي ================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites
    ]
});

// تعريف الـ Slash Commands
const commands = [
    // أوامر النظام الأساسية
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('إعدادات نظام الدعم الصوتي')
        .addSubcommand(subcommand =>
            subcommand
                .setName('category')
                .setDescription('تحديد التصنيف للغرف الخاصة')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID التصنيف')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('voice')
                .setDescription('تحديد روم الانتظار الصوتي')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID روم الصوت')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('text')
                .setDescription('تحديد روم إرسال الإشعارات')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID روم النص')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('تحديد رتبة الإدارة')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID الرتبة')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('waiting')
                .setDescription('اختيار مجموعة الصوت')
                .addStringOption(option =>
                    option.setName('set')
                        .setDescription('اختر مجموعة الصوت')
                        .setRequired(true)
                        .addChoices(
                            { name: 'الطقم الأول', value: 'set1' },
                            { name: 'الطقم الثاني', value: 'set2' },
                            { name: 'طقم بدون انتظار', value: 'set3' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('عرض الإعدادات الحالية'))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('reset')
        .setDescription('مسح كل الإعدادات')
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('launch')
        .setDescription('🚀 تشغيل مشغل تطبيقات Vina')
        .setContexts([0, 1, 2])
        .setIntegrationTypes([0, 1])
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض كل الأوامر المتاحة')
        .toJSON(),
    
    // أوامر الحظر والطرد
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر مستخدم من السيرفر')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم المراد حظره')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الحظر')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('عدد أيام حذف الرسائل (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('إلغاء حظر مستخدم')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('ID المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب إلغاء الحظر')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد مستخدم من السيرفر')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الطرد')
                .setRequired(false))
        .toJSON(),
    
    // أوامر كتم الصوت
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('كتم صوت مستخدم مؤقتاً')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('المدة')
                .setRequired(true)
                .addChoices(
                    { name: '1 دقيقة', value: '60' },
                    { name: '5 دقائق', value: '300' },
                    { name: '10 دقائق', value: '600' },
                    { name: '1 ساعة', value: '3600' },
                    { name: '1 يوم', value: '86400' },
                    { name: '7 أيام', value: '604800' }
                ))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('إلغاء كتم الصوت')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    // أوامر القنوات
    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('قفل قناة')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('فتح قناة')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('hide')
        .setDescription('إخفاء قناة')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('show')
        .setDescription('إظهار قناة')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('الوضع البطيء')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('المدة بالثواني')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('تنظيف القناة')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    // أوامر المعلومات
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('معلومات عن مستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('معلومات عن السيرفر')
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('عرض صورة المستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(false))
        .toJSON(),
    
    // أوامر البوت
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('اختبار سرعة البوت')
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('مدة تشغيل البوت')
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('الرسالة')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('إنشاء رسالة منسقة')
        .addStringOption(option =>
            option.setName('description')
                .setDescription('الوصف')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('العنوان')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('اللون')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('إرسال إعلان')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('الرسالة')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('العنوان')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('ping')
                .setDescription('منشن @everyone')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('إنشاء استفتاء')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('السؤال')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('الخيار الأول')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('الخيار الثاني')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('الخيار الثالث')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('الخيار الرابع')
                .setRequired(false))
        .toJSON(),
    
    // أوامر التنظيف
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('حذف رسائل')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('عدد الرسائل (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('مستخدم محدد')
                .setRequired(false))
        .toJSON(),
    
    // أوامر الصوت
    new SlashCommandBuilder()
        .setName('vcmute')
        .setDescription('كتم صوت في الروم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('vcunmute')
        .setDescription('إلغاء كتم الصوت')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('vckick')
        .setDescription('طرد من الروم الصوتي')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('vcmove')
        .setDescription('نقل مستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('الروم المستهدف')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    // أوامر الرتب
    new SlashCommandBuilder()
        .setName('role')
        .setDescription('إدارة الرتب')
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('إعطاء رتبة')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('المستخدم')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الرتبة')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('إزالة رتبة')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('المستخدم')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الرتبة')
                        .setRequired(true)))
        .toJSON(),
    
    // أوامر التحذيرات
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('تحذير مستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(true))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض التحذيرات')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('clearwarns')
        .setDescription('مسح التحذيرات')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .toJSON(),
    
    // أوامر الأسماء
    new SlashCommandBuilder()
        .setName('nick')
        .setDescription('تغيير الاسم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('الاسم الجديد')
                .setRequired(true))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('resetnick')
        .setDescription('إعادة الاسم الأصلي')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .toJSON(),
    
    // أوامر متقدمة
    new SlashCommandBuilder()
        .setName('moveall')
        .setDescription('نقل كل الأعضاء')
        .addChannelOption(option =>
            option.setName('from')
                .setDescription('من الروم')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('to')
                .setDescription('إلى الروم')
                .setRequired(true))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('serverlock')
        .setDescription('قفل السيرفر')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('serverunlock')
        .setDescription('فتح السيرفر')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON()
];

// تخزين البيانات
const activeCalls = new Map();
const voiceConnections = new Map();
const privateRooms = new Map();
const guildAudioIndex = new Map();
const warnings = new Map();
const backups = new Map();

// ================ دوال الصوت ================

function getNextAudioSet(guildId) {
    const settings = getServerSettings(guildId);
    if (!settings || !settings.audioSetId) return audioSets[0];
    return getAudioSetById(settings.audioSetId);
}

async function getOrCreateConnection(channel) {
    try {
        const guildId = channel.guild.id;
        if (voiceConnections.has(guildId)) {
            const conn = voiceConnections.get(guildId);
            if (conn && conn.state && conn.state.status !== VoiceConnectionStatus.Destroyed) {
                return conn;
            }
        }

        console.log(`🔊 إنشاء اتصال صوتي جديد في ${channel.name}`);
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        voiceConnections.set(guildId, connection);
        return connection;
    } catch (error) {
        console.error('❌ خطأ في الاتصال الصوتي:', error);
        return null;
    }
}

function playAudio(connection, fileName, userId, shouldLoop = false) {
    try {
        const soundPath = path.join(__dirname, fileName);
        if (!fs.existsSync(soundPath)) {
            console.log(`❌ ملف ${fileName} مش موجود`);
            return null;
        }

        const resource = createAudioResource(soundPath, {
            inlineVolume: true
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        player.play(resource);
        connection.subscribe(player);

        if (shouldLoop) {
            player.on(AudioPlayerStatus.Idle, () => {
                if (activeCalls.has(userId)) {
                    const callData = activeCalls.get(userId);
                    if (!callData.isBotMuted) {
                        playAudio(connection, fileName, userId, true);
                    }
                }
            });
        }

        return player;
    } catch (error) {
        console.error(`❌ خطأ في تشغيل ${fileName}:`, error);
        return null;
    }
}

function stopAllAudioForUser(userId) {
    const callData = activeCalls.get(userId);
    if (!callData) return;
    if (callData.musicPlayer) callData.musicPlayer.stop();
    if (callData.waitingPlayer) callData.waitingPlayer.stop();
}

// ================ دوال الإشعارات ================

async function sendNewCallNotification(guild, settings, userId, userName) {
    try {
        const textChannel = await guild.channels.fetch(settings.textId);
        if (!textChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📞 طلب دعم صوتي جديد')
            .setDescription(`**يوجد عميل في انتظار الدعم**`)
            .addFields(
                { name: '👤 العميل', value: `${userName}\n<@${userId}>`, inline: true },
                { name: '🕐 الوقت', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
                { name: '📍 المكان', value: `<#${settings.voiceId}>`, inline: true }
            )
            .setFooter({ text: 'الرجاء التوجه للروم الصوتي' })
            .setTimestamp();

        await textChannel.send({
            content: `<@&${settings.adminRoleId}> 📢 عميل في انتظار الدعم!`,
            embeds: [embed]
        });
    } catch (error) {
        console.error('❌ خطأ في إرسال الإشعار:', error);
    }
}

async function sendAdminAcceptNotification(guild, settings, userId, adminId, adminName, clientName) {
    try {
        const textChannel = await guild.channels.fetch(settings.textId);
        if (!textChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ تم استلام الطلب')
            .setDescription(`**تم تولي طلب الدعم بنجاح**`)
            .addFields(
                { name: '👤 العميل', value: `${clientName}\n<@${userId}>`, inline: true },
                { name: '👑 المشرف', value: `${adminName}\n<@${adminId}>`, inline: true },
                { name: '⏰ الوقت', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            )
            .setTimestamp();

        await textChannel.send({ 
            content: `📢 **تم استلام الطلب**\nالمشرف <@${adminId}> استلم طلب <@${userId}>`,
            embeds: [embed] 
        });
    } catch (error) {
        console.error('❌ خطأ في إرسال الإشعار:', error);
    }
}

// ================ دوال المساعدة ================

function canUseSetupCommands(member, guild, settings) {
    if (guild.ownerId === member.id) return true;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId)) return true;
    return false;
}

function canUseModerationCommands(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator) || 
           member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
           member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
           member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
           member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
           member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
           member.permissions.has(PermissionsBitField.Flags.MuteMembers);
}

function getAdminInVoice(channel, settings) {
    if (!channel || !settings || !settings.adminRoleId) return null;
    return channel.members.find(member => 
        member.roles.cache.has(settings.adminRoleId) && !member.user.bot
    );
}

async function warnAdminIfNotSetup(guild) {
    const settings = getServerSettings(guild.id);
    if (!isServerSetupComplete(guild.id)) {
        const admin = guild.members.cache.find(member => 
            member.permissions.has(PermissionsBitField.Flags.Administrator)
        );
        if (admin) {
            try {
                await admin.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xe74c3c)
                            .setTitle('⚠️ تنبيه مهم!')
                            .setDescription(`**نظام الدعم في ${guild.name} غير مكتمل الإعداد!**`)
                            .addFields({
                                name: 'الأوامر المطلوبة',
                                value: '`/setup category`\n`/setup voice`\n`/setup text`\n`/setup role`'
                            })
                    ]
                });
            } catch (error) {}
        }
    }
}

// ================ دالة تسجيل الأوامر المعدلة ================

async function registerCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(config.token);
        
        console.log('🔄 جاري تسجيل الـ Slash Commands...');
        console.log(`📝 عدد الأوامر: ${commands.length}`);
        
        // جلب الأوامر الموجودة حالياً
        let existingCommands = [];
        try {
            existingCommands = await rest.get(
                Routes.applicationCommands(CLIENT_ID)
            );
            console.log(`📋 الأوامر الموجودة: ${existingCommands.length}`);
        } catch (error) {
            console.log('⚠️ لا يمكن جلب الأوامر الموجودة');
        }

        // البحث عن Entry Point Command
        const entryPointCommand = existingCommands.find(cmd => 
            cmd.type === 1 && cmd.name === 'launch'
        );

        let commandsToRegister = [...commands];

        // التأكد من وجود أمر launch
        const hasLaunchCommand = commandsToRegister.some(cmd => 
            cmd.name === 'launch' || (cmd.name && cmd.name === 'launch')
        );

        if (!hasLaunchCommand) {
            // إضافة أمر launch إذا لم يكن موجوداً
            commandsToRegister.push({
                name: 'launch',
                description: '🚀 تشغيل مشغل تطبيقات Vina',
                type: 1,
                contexts: [0, 1, 2],
                integration_types: [0, 1]
            });
            console.log('➕ تم إضافة أمر launch');
        }

        // إذا كان فيه Entry Point Command موجود، نضيفه للقائمة
        if (entryPointCommand && !hasLaunchCommand) {
            commandsToRegister.push(entryPointCommand);
            console.log('➕ تم الاحتفاظ بـ Entry Point Command');
        }

        // تسجيل الأوامر
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commandsToRegister }
        );
        
        console.log('✅ تم تسجيل الـ Slash Commands بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الـ Slash Commands:', error);
        
        // محاولة بديلة - تسجيل أمر واحد فقط
        if (error.code === 50240) {
            console.log('🔄 محاولة طريقة بديلة...');
            try {
                const rest = new REST({ version: '10' }).setToken(config.token);
                
                // حذف كل الأوامر أولاً
                await rest.put(
                    Routes.applicationCommands(CLIENT_ID),
                    { body: [] }
                );
                console.log('✅ تم حذف جميع الأوامر');
                
                // ثم تسجيل الأوامر الجديدة
                await rest.put(
                    Routes.applicationCommands(CLIENT_ID),
                    { body: commands }
                );
                console.log('✅ تم تسجيل الأوامر بنجاح (الطريقة البديلة)');
            } catch (retryError) {
                console.error('❌ فشلت المحاولة البديلة:', retryError);
            }
        }
    }
}

// ================ أحداث البوت ================

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options, guild, member, user } = interaction;

    // التحقق من القفل
    const lockedServers = serverSettings.lockedServers || [];
    if (lockedServers.includes(guild.id)) {
        return interaction.reply({ 
            content: '❌ **البوت مقفل في هذا السيرفر**\n\nللتجديد: https://vina-bot.pages.dev/',
            ephemeral: true 
        });
    }

    // الحصول على الإعدادات
    let settings = getServerSettings(guild.id);
    if (!settings) {
        settings = { audioSetId: 'set1' };
        serverSettings[guild.id] = settings;
    }

    // أمر launch
    if (commandName === 'launch') {
        const launchEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle('🚀 Vina App Launcher')
            .setDescription('**مرحباً بك في مشغل تطبيقات Vina**\nاختر التطبيق الذي تريد تشغيله:')
            .addFields(
                { name: '🎮 **Vina Games**', value: 'تشغيل الألعاب', inline: true },
                { name: '🎵 **Vina Music**', value: 'تشغيل الموسيقى', inline: true },
                { name: '📊 **Vina Stats**', value: 'عرض الإحصائيات', inline: true },
                { name: '⚙️ **Vina Tools**', value: 'أدوات مفيدة', inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('launch_games')
                    .setLabel('🎮 Games')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('launch_music')
                    .setLabel('🎵 Music')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('launch_stats')
                    .setLabel('📊 Stats')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('launch_tools')
                    .setLabel('⚙️ Tools')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({ 
            embeds: [launchEmbed], 
            components: [row],
            ephemeral: true 
        });
        return;
    }

    // أمر help
    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🆘 مركز المساعدة')
            .setDescription('**قائمة الأوامر المتاحة**')
            .addFields(
                { name: '⚙️ **الإعداد**', value: '`/setup` - إعداد النظام\n`/reset` - مسح الإعدادات', inline: true },
                { name: '🚀 **التشغيل**', value: '`/launch` - تشغيل التطبيقات', inline: true },
                { name: '🔨 **الإدارة**', value: '`/ban` - حظر\n`/kick` - طرد\n`/timeout` - كتم', inline: true },
                { name: '📝 **القنوات**', value: '`/lock` - قفل\n`/unlock` - فتح\n`/nuke` - تنظيف', inline: true },
                { name: 'ℹ️ **المعلومات**', value: '`/userinfo` - معلومات\n`/serverinfo` - السيرفر', inline: true },
                { name: '🤖 **البوت**', value: '`/ping` - سرعة\n`/uptime` - مدة التشغيل', inline: true }
            )
            .setFooter({ text: `السيرفر: ${guild.name}` });

        return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    // أمر setup
    if (commandName === 'setup') {
        if (!canUseSetupCommands(member, guild, settings)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية!**',
                ephemeral: true 
            });
        }

        const subcommand = options.getSubcommand();

        if (subcommand === 'show') {
            const settingsText = formatSettings(guild, settings);
            const embed = new EmbedBuilder()
                .setColor(isServerSetupComplete(guild.id) ? 0x2ecc71 : 0xe74c3c)
                .setTitle('⚙️ الإعدادات الحالية')
                .setDescription(settingsText)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'waiting') {
            const audioSetId = options.getString('set');
            settings.audioSetId = audioSetId;
            serverSettings[guild.id] = settings;
            saveSettings(serverSettings);

            return interaction.reply({ 
                content: `✅ **تم تحديث مجموعة الصوت!**`,
                ephemeral: true 
            });
        }

        // باقي أوامر الإعداد
        const id = options.getString('id');
        let target, type;

        if (subcommand === 'category') {
            target = await guild.channels.fetch(id).catch(() => null);
            type = 'التصنيف';
            if (!target || target.type !== ChannelType.GuildCategory) {
                return interaction.reply({ content: '❌ **تصنيف غير صالح!**', ephemeral: true });
            }
            settings.categoryId = id;
        } else if (subcommand === 'voice') {
            target = await guild.channels.fetch(id).catch(() => null);
            type = 'روم الانتظار';
            if (!target || target.type !== ChannelType.GuildVoice) {
                return interaction.reply({ content: '❌ **روم صوتي غير صالح!**', ephemeral: true });
            }
            settings.voiceId = id;
        } else if (subcommand === 'text') {
            target = await guild.channels.fetch(id).catch(() => null);
            type = 'روم الإشعارات';
            if (!target || target.type !== ChannelType.GuildText) {
                return interaction.reply({ content: '❌ **روم نصي غير صالح!**', ephemeral: true });
            }
            settings.textId = id;
        } else if (subcommand === 'role') {
            target = await guild.roles.fetch(id).catch(() => null);
            type = 'رتبة الإدارة';
            if (!target) {
                return interaction.reply({ content: '❌ **رتبة غير صالحة!**', ephemeral: true });
            }
            settings.adminRoleId = id;
        }

        serverSettings[guild.id] = settings;
        saveSettings(serverSettings);

        if (isServerSetupComplete(guild.id)) {
            return interaction.reply({ 
                content: `✅ **تم تحديث ${type} بنجاح!**\n\n🎉 **النظام جاهز للعمل!**`,
                ephemeral: true 
            });
        } else {
            return interaction.reply({ 
                content: `✅ **تم تحديث ${type} بنجاح!**`,
                ephemeral: true 
            });
        }
    }

    // أمر reset
    if (commandName === 'reset') {
        if (!canUseSetupCommands(member, guild, settings)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        delete serverSettings[guild.id];
        saveSettings(serverSettings);

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ تم مسح الإعدادات')
            .setDescription('تم حذف كل إعدادات السيرفر');

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // أمر ping
    if (commandName === 'ping') {
        const sent = await interaction.reply({ content: '🏓 جاري القياس...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor(latency < 200 ? 0x2ecc71 : 0xf39c12)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📊 الزمن', value: `\`${latency}ms\``, inline: true },
                { name: '🌐 API', value: `\`${apiLatency}ms\``, inline: true }
            );

        await interaction.editReply({ content: null, embeds: [embed] });
        return;
    }

    // أمر uptime
    if (commandName === 'uptime') {
        const uptime = Date.now() - client.readyTimestamp;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor(uptime / 3600000) % 24;
        const minutes = Math.floor(uptime / 60000) % 60;
        const seconds = Math.floor(uptime / 1000) % 60;

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('⏰ مدة التشغيل')
            .setDescription(`**البوت يعمل منذ:** <t:${Math.floor(client.readyTimestamp / 1000)}:R>`)
            .addFields(
                { name: '📊 المدة', value: `${days} يوم, ${hours} س, ${minutes} د, ${seconds} ث` }
            );

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر userinfo
    if (commandName === 'userinfo') {
        const targetUser = options.getUser('user') || user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        const roles = targetMember.roles.cache
            .filter(role => role.id !== guild.id)
            .map(role => `<@&${role.id}>`)
            .join(', ') || 'لا يوجد';

        const embed = new EmbedBuilder()
            .setColor(targetMember.displayHexColor || 0x3498db)
            .setTitle(`ℹ️ ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '🆔 ID', value: targetUser.id, inline: true },
                { name: '🤖 بوت؟', value: targetUser.bot ? 'نعم' : 'لا', inline: true },
                { name: '📅 الانضمام', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '📅 الحساب', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                { name: `🎭 الرتب (${targetMember.roles.cache.size - 1})`, value: roles.slice(0, 1024) }
            );

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر serverinfo
    if (commandName === 'serverinfo') {
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`ℹ️ ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '🆔 ID', value: guild.id, inline: true },
                { name: '👑 المالك', value: owner.user.tag, inline: true },
                { name: '👥 الأعضاء', value: `${guild.memberCount}`, inline: true },
                { name: '📅 الإنشاء', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 الرتب', value: `${guild.roles.cache.size}`, inline: true },
                { name: '😀 الرموز', value: `${guild.emojis.cache.size}`, inline: true }
            );

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر avatar
    if (commandName === 'avatar') {
        const targetUser = options.getUser('user') || user;

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`🖼️ صورة ${targetUser.tag}`)
            .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }));

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر say
    if (commandName === 'say') {
        if (!canUseModerationCommands(member)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const message = options.getString('message');
        const targetChannel = options.getChannel('channel') || interaction.channel;

        try {
            await targetChannel.send(message);
            await interaction.reply({ content: `✅ تم الإرسال إلى ${targetChannel}`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الإرسال!**', ephemeral: true });
        }
        return;
    }

    // أمر embed
    if (commandName === 'embed') {
        if (!canUseModerationCommands(member)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const title = options.getString('title');
        const description = options.getString('description');
        const color = options.getString('color') || '#3498db';

        const embed = new EmbedBuilder()
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        if (title) embed.setTitle(title);

        try {
            await interaction.channel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ تم الإرسال!', ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الإرسال!**', ephemeral: true });
        }
        return;
    }

    // أمر announce
    if (commandName === 'announce') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetChannel = options.getChannel('channel');
        const title = options.getString('title');
        const message = options.getString('message');
        const ping = options.getBoolean('ping') || false;

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setColor(0xFFFFFF)
            .setTimestamp();

        if (title) embed.setTitle(title);

        try {
            const content = ping ? '@everyone' : '';
            await targetChannel.send({ content, embeds: [embed] });
            await interaction.reply({ content: `✅ تم الإعلان في ${targetChannel}`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الإرسال!**', ephemeral: true });
        }
        return;
    }

    // أمر poll
    if (commandName === 'poll') {
        if (!canUseModerationCommands(member)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const question = options.getString('question');
        const option1 = options.getString('option1');
        const option2 = options.getString('option2');
        const option3 = options.getString('option3');
        const option4 = options.getString('option4');

        const optionsList = [option1, option2];
        if (option3) optionsList.push(option3);
        if (option4) optionsList.push(option4);

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

        let description = `**${question}**\n\n`;
        optionsList.forEach((opt, i) => {
            description += `${emojis[i]} ${opt}\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📊 استفتاء')
            .setDescription(description)
            .setFooter({ text: `بواسطة: ${member.user.tag}` })
            .setTimestamp();

        try {
            const pollMessage = await interaction.channel.send({ embeds: [embed] });
            for (let i = 0; i < optionsList.length; i++) {
                await pollMessage.react(emojis[i]);
            }
            await interaction.reply({ content: '✅ تم إنشاء الاستفتاء!', ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الإنشاء!**', ephemeral: true });
        }
        return;
    }

    // أمر ban
    if (commandName === 'ban') {
        if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';
        const days = options.getInteger('days') || 0;

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        try {
            await targetMember.ban({ 
                deleteMessageSeconds: days * 86400,
                reason: `بواسطة: ${member.user.tag} | ${reason}`
            });

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔨 تم الحظر')
                .setDescription(`**تم حظر ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag}`, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الحظر!**', ephemeral: true });
        }
        return;
    }

    // أمر unban
    if (commandName === 'unban') {
        if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const userId = options.getString('userid');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await guild.bans.remove(userId, `بواسطة: ${member.user.tag} | ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ تم إلغاء الحظر')
                .setDescription(`**تم إلغاء حظر مستخدم**`)
                .addFields(
                    { name: '🆔 المستخدم', value: `\`${userId}\``, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل إلغاء الحظر!**', ephemeral: true });
        }
        return;
    }

    // أمر kick
    if (commandName === 'kick') {
        if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        try {
            await targetMember.kick(`بواسطة: ${member.user.tag} | ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle('👢 تم الطرد')
                .setDescription(`**تم طرد ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag}`, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الطرد!**', ephemeral: true });
        }
        return;
    }

    // أمر timeout
    if (commandName === 'timeout') {
        if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const durationSeconds = parseInt(options.getString('duration'));
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        try {
            await targetMember.timeout(durationSeconds * 1000, `بواسطة: ${member.user.tag} | ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('🔇 تم كتم الصوت')
                .setDescription(`**تم كتم صوت ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag}`, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '⏰ المدة', value: `${Math.floor(durationSeconds / 60)} دقيقة`, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل كتم الصوت!**', ephemeral: true });
        }
        return;
    }

    // أمر untimeout
    if (commandName === 'untimeout') {
        if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        try {
            await targetMember.timeout(null, `بواسطة: ${member.user.tag} | ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔊 تم إلغاء كتم الصوت')
                .setDescription(`**تم إلغاء كتم صوت ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag}`, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل إلغاء كتم الصوت!**', ephemeral: true });
        }
        return;
    }

    // أمر lock
    if (commandName === 'lock') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await targetChannel.permissionOverwrites.edit(guild.id, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔒 تم القفل')
                .setDescription(`**تم قفل ${targetChannel}**`)
                .addFields(
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل القفل!**', ephemeral: true });
        }
        return;
    }

    // أمر unlock
    if (commandName === 'unlock') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await targetChannel.permissionOverwrites.edit(guild.id, {
                SendMessages: null
            });

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔓 تم الفتح')
                .setDescription(`**تم فتح ${targetChannel}**`)
                .addFields(
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الفتح!**', ephemeral: true });
        }
        return;
    }

    // أمر hide
    if (commandName === 'hide') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await targetChannel.permissionOverwrites.edit(guild.id, {
                ViewChannel: false
            });

            const embed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('👁️ تم الإخفاء')
                .setDescription(`**تم إخفاء ${targetChannel}**`)
                .addFields(
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الإخفاء!**', ephemeral: true });
        }
        return;
    }

    // أمر show
    if (commandName === 'show') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await targetChannel.permissionOverwrites.edit(guild.id, {
                ViewChannel: null
            });

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('👁️ تم الإظهار')
                .setDescription(`**تم إظهار ${targetChannel}**`)
                .addFields(
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الإظهار!**', ephemeral: true });
        }
        return;
    }

    // أمر slowmode
    if (commandName === 'slowmode') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const seconds = options.getInteger('seconds');
        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await targetChannel.setRateLimitPerUser(seconds, reason);

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('⏱️ تم تعديل الوضع البطيء')
                .setDescription(`**تم ${seconds === 0 ? 'تعطيل' : 'تفعيل'} الوضع البطيء**`)
                .addFields(
                    { name: '⏱️ المدة', value: seconds === 0 ? 'معطل' : `${seconds} ث`, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل التعديل!**', ephemeral: true });
        }
        return;
    }

    // أمر nuke
    if (commandName === 'nuke') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            const position = targetChannel.position;
            const clonedChannel = await targetChannel.clone({ reason });
            await targetChannel.delete(`Nuked by ${member.user.tag} | ${reason}`);
            await clonedChannel.setPosition(position);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🧹 تم التنظيف')
                .setDescription(`**تم تنظيف القناة**`)
                .addFields(
                    { name: '🆕 القناة', value: `${clonedChannel}`, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await clonedChannel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ تم التنظيف!', ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل التنظيف!**', ephemeral: true });
        }
        return;
    }

    // أمر purge
    if (commandName === 'purge') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const amount = options.getInteger('amount');
        const targetUser = options.getUser('user');

        try {
            let messages = await interaction.channel.messages.fetch({ limit: 100 });

            if (targetUser) {
                messages = messages.filter(m => m.author.id === targetUser.id);
            }

            messages = messages.first(amount);

            if (messages.length === 0) {
                return interaction.reply({ content: '❌ **لا توجد رسائل!**', ephemeral: true });
            }

            await interaction.channel.bulkDelete(messages, true);
            await interaction.reply({ content: `✅ تم حذف **${messages.length}** رسالة!`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الحذف!**', ephemeral: true });
        }
        return;
    }

    // أمر vcmute
    if (commandName === 'vcmute') {
        if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember || !targetMember.voice.channel) {
            return interaction.reply({ content: '❌ **المستخدم ليس في روم صوتي!**', ephemeral: true });
        }

        try {
            await targetMember.voice.setMute(true, reason);

            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('🔇 تم كتم الصوت')
                .setDescription(`**تم كتم صوت ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل كتم الصوت!**', ephemeral: true });
        }
        return;
    }

    // أمر vcunmute
    if (commandName === 'vcunmute') {
        if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember || !targetMember.voice.channel) {
            return interaction.reply({ content: '❌ **المستخدم ليس في روم صوتي!**', ephemeral: true });
        }

        try {
            await targetMember.voice.setMute(false, reason);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔊 تم إلغاء كتم الصوت')
                .setDescription(`**تم إلغاء كتم صوت ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل إلغاء كتم الصوت!**', ephemeral: true });
        }
        return;
    }

    // أمر vckick
    if (commandName === 'vckick') {
        if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember || !targetMember.voice.channel) {
            return interaction.reply({ content: '❌ **المستخدم ليس في روم صوتي!**', ephemeral: true });
        }

        try {
            await targetMember.voice.disconnect(reason);

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('👢 تم الطرد من الصوت')
                .setDescription(`**تم طرد ${targetUser.tag} من الروم الصوتي**`)
                .addFields(
                    { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل الطرد!**', ephemeral: true });
        }
        return;
    }

    // أمر vcmove
    if (commandName === 'vcmove') {
        if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const targetChannel = options.getChannel('channel');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        if (targetChannel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ content: '❌ **الروم المستهدف ليس صوتياً!**', ephemeral: true });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember || !targetMember.voice.channel) {
            return interaction.reply({ content: '❌ **المستخدم ليس في روم صوتي!**', ephemeral: true });
        }

        try {
            await targetMember.voice.setChannel(targetChannel, reason);

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🚚 تم النقل')
                .setDescription(`**تم نقل ${targetUser.tag} إلى ${targetChannel}**`)
                .addFields(
                    { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل النقل!**', ephemeral: true });
        }
        return;
    }

    // أمر role give
    if (commandName === 'role' && options.getSubcommand() === 'give') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const targetRole = options.getRole('role');

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        try {
            await targetMember.roles.add(targetRole);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ تم إعطاء الرتبة')
                .setDescription(`**تم إعطاء ${targetRole} لـ ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                    { name: '🎭 الرتبة', value: targetRole.name, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل إعطاء الرتبة!**', ephemeral: true });
        }
        return;
    }

    // أمر role remove
    if (commandName === 'role' && options.getSubcommand() === 'remove') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const targetRole = options.getRole('role');

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        try {
            await targetMember.roles.remove(targetRole);

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ تم إزالة الرتبة')
                .setDescription(`**تم إزالة ${targetRole} من ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                    { name: '🎭 الرتبة', value: targetRole.name, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل إزالة الرتبة!**', ephemeral: true });
        }
        return;
    }

    // أمر warn
    if (commandName === 'warn') {
        if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason');

        if (!warnings.has(guild.id)) warnings.set(guild.id, new Map());
        const guildWarnings = warnings.get(guild.id);

        if (!guildWarnings.has(targetUser.id)) {
            guildWarnings.set(targetUser.id, []);
        }

        const userWarnings = guildWarnings.get(targetUser.id);
        userWarnings.push({
            moderator: member.user.tag,
            reason: reason,
            date: new Date().toISOString()
        });

        const embed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('⚠️ تم التحذير')
            .setDescription(`**تم تحذير ${targetUser.tag}**`)
            .addFields(
                { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                { name: '👑 بواسطة', value: member.user.tag, inline: true },
                { name: '📊 عدد التحذيرات', value: `${userWarnings.length}`, inline: true },
                { name: '📝 السبب', value: reason }
            );

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر warnings
    if (commandName === 'warnings') {
        if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');

        if (!warnings.has(guild.id)) {
            return interaction.reply({ content: `✅ **لا توجد تحذيرات لـ ${targetUser.tag}**`, ephemeral: true });
        }

        const userWarnings = warnings.get(guild.id).get(targetUser.id) || [];

        if (userWarnings.length === 0) {
            return interaction.reply({ content: `✅ **لا توجد تحذيرات لـ ${targetUser.tag}**`, ephemeral: true });
        }

        const warningsList = userWarnings.map((w, i) => {
            return `**${i + 1}.** ⚠️ بواسطة: ${w.moderator}\n📝 السبب: ${w.reason}\n📅 التاريخ: <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>\n`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle(`⚠️ تحذيرات ${targetUser.tag}`)
            .setDescription(warningsList.slice(0, 4096))
            .addFields({ name: '📊 الإجمالي', value: `${userWarnings.length}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // أمر clearwarns
    if (commandName === 'clearwarns') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');

        if (!warnings.has(guild.id) || !warnings.get(guild.id).has(targetUser.id)) {
            return interaction.reply({ content: `✅ **لا توجد تحذيرات لـ ${targetUser.tag}**`, ephemeral: true });
        }

        warnings.get(guild.id).delete(targetUser.id);

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ تم مسح التحذيرات')
            .setDescription(`**تم مسح تحذيرات ${targetUser.tag}**`)
            .addFields(
                { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                { name: '👑 بواسطة', value: member.user.tag, inline: true }
            );

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر nick
    if (commandName === 'nick') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');
        const nickname = options.getString('nickname');

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        try {
            await targetMember.setNickname(nickname);

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('📛 تم تغيير الاسم')
                .setDescription(`**تم تغيير اسم ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                    { name: '📛 الاسم الجديد', value: nickname, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل تغيير الاسم!**', ephemeral: true });
        }
        return;
    }

    // أمر resetnick
    if (commandName === 'resetnick') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const targetUser = options.getUser('user');

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ **المستخدم غير موجود!**', ephemeral: true });
        }

        try {
            await targetMember.setNickname(null);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('📛 تم إعادة الاسم الأصلي')
                .setDescription(`**تم إعادة الاسم الأصلي لـ ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: targetUser.tag, inline: true },
                    { name: '👑 بواسطة', value: member.user.tag, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل إعادة الاسم!**', ephemeral: true });
        }
        return;
    }

    // أمر moveall
    if (commandName === 'moveall') {
        if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const fromChannel = options.getChannel('from');
        const toChannel = options.getChannel('to');

        if (fromChannel.type !== ChannelType.GuildVoice || toChannel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ content: '❌ **الرومات يجب أن تكون صوتية!**', ephemeral: true });
        }

        const members = fromChannel.members.filter(m => !m.user.bot);

        if (members.size === 0) {
            return interaction.reply({ content: '❌ **لا يوجد أعضاء في الروم!**', ephemeral: true });
        }

        let successCount = 0;
        for (const [_, targetMember] of members) {
            try {
                await targetMember.voice.setChannel(toChannel);
                successCount++;
            } catch (error) {}
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ تم نقل الأعضاء')
            .setDescription(`**تم نقل ${successCount} عضو من ${fromChannel} إلى ${toChannel}**`)
            .addFields({ name: '👑 بواسطة', value: member.user.tag });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر serverlock
    if (commandName === 'serverlock') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await guild.setInvitesDisabled(true, reason);

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔒 تم قفل السيرفر')
                .setDescription(`**تم تعطيل إنشاء الدعوات**`)
                .addFields(
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل قفل السيرفر!**', ephemeral: true });
        }
        return;
    }

    // أمر serverunlock
    if (commandName === 'serverunlock') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ **ليس لديك الصلاحية!**', ephemeral: true });
        }

        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await guild.setInvitesDisabled(false, reason);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔓 تم فتح السيرفر')
                .setDescription(`**تم تفعيل إنشاء الدعوات**`)
                .addFields(
                    { name: '👑 بواسطة', value: member.user.tag, inline: true },
                    { name: '📝 السبب', value: reason }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await interaction.reply({ content: '❌ **فشل فتح السيرفر!**', ephemeral: true });
        }
        return;
    }
});

// ================ أحداث الصوت ================

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const member = newState.member;
        if (!member || member.user.bot) return;

        const guildId = newState.guild.id;
        const settings = getServerSettings(guildId);

        if (!isServerSetupComplete(guildId)) return;

        const supportVoiceId = settings.voiceId;
        const adminRoleId = settings.adminRoleId;

        // دخول روم الانتظار
        if (newState.channelId === supportVoiceId && newState.channelId !== oldState.channelId) {
            if (member.roles.cache.has(adminRoleId)) {
                console.log(`👑 ${member.user.tag} دخل روم الانتظار`);
                
                // تحقق من وجود عملاء في الروم
                const clientsInRoom = newState.channel.members.filter(m => 
                    !m.user.bot && !m.roles.cache.has(adminRoleId)
                );

                if (clientsInRoom.size > 0) {
                    // جلب أول عميل
                    const clientMember = clientsInRoom.first();
                    
                    // إرسال إشعار
                    await sendAdminAcceptNotification(
                        newState.guild,
                        settings,
                        clientMember.id,
                        member.id,
                        member.user.tag,
                        clientMember.user.tag
                    );
                }
                
                return;
            }

            console.log(`👤 ${member.user.tag} دخل روم الانتظار`);

            // إنشاء اتصال صوتي
            const connection = await getOrCreateConnection(newState.channel);
            if (!connection) return;

            await entersState(connection, VoiceConnectionStatus.Ready, 10000);

            // إرسال إشعار
            await sendNewCallNotification(newState.guild, settings, member.id, member.user.tag);

            // تشغيل الصوت بعد 4 ثواني
            setTimeout(async () => {
                if (!member.voice.channelId || member.voice.channelId !== supportVoiceId) return;

                const audioSet = getNextAudioSet(guildId);
                
                if (audioSet.waiting) {
                    const waitingPlayer = playAudio(connection, audioSet.waiting, member.id);
                    
                    const callData = {
                        connection,
                        waitingPlayer,
                        userId: member.id,
                        isBotMuted: false,
                        hasAdmin: false,
                        userName: member.user.tag,
                        joinedAt: Date.now()
                    };

                    if (waitingPlayer) {
                        waitingPlayer.once(AudioPlayerStatus.Idle, () => {
                            if (member.voice.channelId === supportVoiceId) {
                                const musicPlayer = playAudio(connection, audioSet.background, member.id, true);
                                callData.musicPlayer = musicPlayer;
                                callData.waitingPlayer = null;
                            }
                        });
                    }

                    activeCalls.set(member.id, callData);
                } else {
                    const musicPlayer = playAudio(connection, audioSet.background, member.id, true);
                    
                    activeCalls.set(member.id, {
                        connection,
                        musicPlayer,
                        userId: member.id,
                        isBotMuted: false,
                        hasAdmin: false,
                        userName: member.user.tag,
                        joinedAt: Date.now()
                    });
                }
            }, 4000);
        }

        // خروج من روم الانتظار
        if (oldState.channelId === supportVoiceId && newState.channelId !== oldState.channelId) {
            if (member.roles.cache.has(adminRoleId)) {
                console.log(`👑 ${member.user.tag} خرج من روم الانتظار`);
                return;
            }

            console.log(`👤 ${member.user.tag} خرج من روم الانتظار`);

            const callData = activeCalls.get(member.id);
            if (callData) {
                stopAllAudioForUser(member.id);
                activeCalls.delete(member.id);
            }

            // قطع الاتصال إذا كان الروم فارغاً
            setTimeout(async () => {
                try {
                    const channel = await client.channels.fetch(supportVoiceId);
                    if (channel && channel.members.filter(m => !m.user.bot).size === 0) {
                        const conn = voiceConnections.get(guildId);
                        if (conn) {
                            conn.destroy();
                            voiceConnections.delete(guildId);
                        }
                    }
                } catch (error) {}
            }, 3000);
        }
    } catch (error) {
        console.error('❌ خطأ في voiceStateUpdate:', error);
    }
});

// ================ أحداث البوت الأساسية ================

client.on('ready', async () => {
    console.log('=================================');
    console.log(`✅ ${client.user.tag} يعمل بنجاح!`);
    console.log(`📁 السيرفرات: ${client.guilds.cache.size}`);

    const lockedServers = serverSettings.lockedServers || [];
    const activeLocked = lockedServers.filter(id => client.guilds.cache.has(id)).length;
    console.log(`🔐 السيرفرات المقفلة: ${lockedServers.length} (${activeLocked} موجودة)`);

    await registerCommands();

    client.guilds.cache.forEach(guild => {
        if (isServerSetupComplete(guild.id)) {
            console.log(`✅ سيرفر ${guild.name} مكتمل الإعداد`);
        } else {
            console.log(`⚠️ سيرفر ${guild.name} غير مكتمل الإعداد`);
            warnAdminIfNotSetup(guild);
        }
    });

    console.log('=================================');

    client.user.setPresence({
        activities: [{
            name: 'Vina Support | /help',
            type: 2
        }],
        status: 'online'
    });
});

client.on('guildCreate', async (guild) => {
    console.log(`➕ تم إضافة البوت لسيرفر: ${guild.name}`);

    const lockedServers = serverSettings.lockedServers || [];
    if (lockedServers.includes(guild.id)) {
        try {
            const owner = await guild.fetchOwner();
            if (owner) {
                await owner.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xe74c3c)
                            .setTitle('🔒 البوت غير متاح')
                            .setDescription('**البوت مقفل في هذا السيرفر**\n\nللتجديد: https://vina-bot.pages.dev/')
                    ]
                });
            }
        } catch (error) {}

        setTimeout(async () => {
            try {
                await guild.leave();
                console.log(`🚫 البوت خرج من سيرفر مقفل: ${guild.name}`);
            } catch (error) {}
        }, 5000);

        return;
    }

    try {
        const owner = await guild.fetchOwner();
        if (owner) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle('Holaa :>')
                .setDescription('اهلا بك في خدمات Vina')
                .addFields({
                    name: ' ',
                    value: 'استخدم `/help` لعرض الأوامر'
                })
                .setThumbnail(client.user.displayAvatarURL());

            await owner.send({ embeds: [welcomeEmbed] });
        }
    } catch (error) {}
});

// ================ أحداث المالك (Prefix Commands) ================

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (message.author.id !== BOT_OWNER_ID) return;
    if (!message.content.startsWith(OWNER_PREFIX)) return;

    const args = message.content.slice(OWNER_PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // أمر panel
    if (command === 'panel') {
        const panelEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle('👑 لوحة تحكم المالك')
            .setDescription(`**البادئة:** \`${OWNER_PREFIX}\``)
            .addFields(
                { name: '📊 الإحصائيات', value: `\`${OWNER_PREFIX}stats\` - إحصائيات البوت\n\`${OWNER_PREFIX}servers\` - قائمة السيرفرات`, inline: true },
                { name: '🔒 القفل', value: `\`${OWNER_PREFIX}lock <ID>\` - قفل سيرفر\n\`${OWNER_PREFIX}unlock <ID>\` - فتح سيرفر`, inline: true },
                { name: '📢 البث', value: `\`${OWNER_PREFIX}broadcast <رسالة>\` - إرسال للجميع`, inline: true }
            );

        await message.reply({ embeds: [panelEmbed] });
        return;
    }

    // أمر stats
    if (command === 'stats') {
        const totalServers = client.guilds.cache.size;
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const lockedServers = serverSettings.lockedServers || [];

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📊 إحصائيات البوت')
            .addFields(
                { name: '🏠 السيرفرات', value: `${totalServers}`, inline: true },
                { name: '👥 الأعضاء', value: `${totalMembers.toLocaleString()}`, inline: true },
                { name: '🔐 المقفلة', value: `${lockedServers.length}`, inline: true },
                { name: '⏰ وقت التشغيل', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            );

        await message.reply({ embeds: [embed] });
        return;
    }

    // أمر servers
    if (command === 'servers') {
        const servers = client.guilds.cache.map(guild => {
            return `**${guild.name}**\n🆔 \`${guild.id}\`\n👥 ${guild.memberCount}\n👑 <@${guild.ownerId}>`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`🏠 قائمة السيرفرات (${client.guilds.cache.size})`)
            .setDescription(servers.slice(0, 4096));

        await message.reply({ embeds: [embed] });
        return;
    }

    // أمر lock
    if (command === 'lock') {
        const serverId = args[0];
        if (!serverId) {
            return message.reply('❌ يرجى إدخال ID السيرفر!');
        }

        if (!serverSettings.lockedServers) serverSettings.lockedServers = [];
        if (!serverSettings.lockedServers.includes(serverId)) {
            serverSettings.lockedServers.push(serverId);
            saveSettings(serverSettings);
        }

        await message.reply(`✅ تم قفل السيرفر \`${serverId}\``);
        return;
    }

    // أمر unlock
    if (command === 'unlock') {
        const serverId = args[0];
        if (!serverId) {
            return message.reply('❌ يرجى إدخال ID السيرفر!');
        }

        if (serverSettings.lockedServers) {
            serverSettings.lockedServers = serverSettings.lockedServers.filter(id => id !== serverId);
            saveSettings(serverSettings);
        }

        await message.reply(`✅ تم فتح السيرفر \`${serverId}\``);
        return;
    }

    // أمر broadcast
    if (command === 'broadcast') {
        const broadcastMessage = args.join(' ');
        if (!broadcastMessage) {
            return message.reply('❌ يرجى كتابة الرسالة!');
        }

        let success = 0;
        let failed = 0;

        for (const guild of client.guilds.cache.values()) {
            try {
                const owner = await guild.fetchOwner();
                const embed = new EmbedBuilder()
                    .setColor(0xFFFFFF)
                    .setTitle('📢 إشعار من المالك')
                    .setDescription(broadcastMessage)
                    .setTimestamp();

                await owner.send({ embeds: [embed] });
                success++;
            } catch (error) {
                failed++;
            }
        }

        await message.reply(`✅ تم الإرسال!\n✅ نجاح: ${success}\n❌ فشل: ${failed}`);
        return;
    }
});

// ================ تشغيل البوت ================

if (!config.token) {
    console.error('❌ المتغير DISCORD_TOKEN غير موجود!');
    process.exit(1);
}

client.login(config.token).catch(err => {
    console.error('❌ فشل تسجيل الدخول:', err);
    process.exit(1);
});

// معالجة الأخطاء
process.on('unhandledRejection', error => {
    console.error('❌ خطأ غير معالج:', error);
});

process.on('SIGINT', () => {
    console.log('🛑 إغلاق البوت...');
    for (const [_, conn] of voiceConnections) {
        try { conn.destroy(); } catch (e) {}
    }
    process.exit(0);
});