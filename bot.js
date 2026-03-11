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
        const encoder = new OpusScript(48000, 2, OpusScript.Application.AUDIO);
        console.log('✅ مكتبة الصوت جاهزة باستخدام opusscript');
    } catch (e2) {
        console.warn('⚠️  لا توجد مكتبة opus متاحة:', e1.message, '/', e2.message);
    }
}

// الإعدادات الأساسية
const config = {
    token: process.env.DISCORD_TOKEN
};

// إضافة معرف المالك
const BOT_OWNER_ID = '1423320282281676878';
const OWNER_PREFIX = '!';

// ملف الإعدادات
const SETTINGS_FILE = 'settings.json';

// دالة لتحميل الإعدادات
function loadSettings() {
    if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    }
    return {};
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

    // مطلوب: category, voice, text, role
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

    // محاولة جلب أسماء القنوات والرتب
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

**📝 طريقة الاستخدام:**
1. العميل يدخل روم الانتظار
2. البوت يشغل موسيقى انتظار
3. يرسل إشعار في روم الإشعارات
4. المشرف (اللي معاه الرتبة) يدخل روم الانتظار
5. ينشئ البوت روم خاص وينقل الجميع إليه
    `;
}

// دالة للتحذير إذا النظام غير مكتمل
async function warnAdminIfNotSetup(guild) {
    const settings = getServerSettings(guild.id);
    if (!isServerSetupComplete(guild.id)) {
        // البحث عن الإدمن الأول
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
                            .setDescription(`**نظام الدعم في ${guild.name} غير مكتمل الإعداد!**\n\nالرجاء استخدام الأمر \`/help\` في سيرفر ${guild.name} لعرض أوامر الإعداد.`)
                            .addFields({
                                name: 'الأوامر الأساسية المطلوبة',
                                value: `\`/setup category\`\n\`/setup voice\`\n\`/setup text\`\n\`/setup role\``
                            })
                            .setFooter({ text: 'البوت لن يعمل بشكل صحيح حتى تكتمل الإعدادات' })
                    ]
                });
                console.log(`📩 تم إرسال تحذير للإدمن في ${guild.name}`);
            } catch (error) {
                console.log(`❌ لم أستطع إرسال رسالة للإدمن في ${guild.name}`);
            }
        }
    }
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
        .setDescription('تشغيل تطبيق Sienna')
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
                .setDescription('عدد أيام دورة الرسائل للحذف (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('إلغاء حظر مستخدم')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('ID المستخدم المراد إلغاء حظره')
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
                .setDescription('المستخدم المراد طرده')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الطرد')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('softban')
        .setDescription('طرد وحذف رسائل المستخدم (حظر ناعم)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('عدد أيام الرسائل للحذف (1-7)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(7))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    // أوامر كتم الصوت
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('كتم صوت مستخدم مؤقتاً')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم المراد كتم صوته')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('مدة كتم الصوت')
                .setRequired(true)
                .addChoices(
                    { name: '1 دقيقة', value: '60' },
                    { name: '5 دقائق', value: '300' },
                    { name: '10 دقائق', value: '600' },
                    { name: '1 ساعة', value: '3600' },
                    { name: '12 ساعة', value: '43200' },
                    { name: '1 يوم', value: '86400' },
                    { name: '3 أيام', value: '259200' },
                    { name: '7 أيام', value: '604800' },
                    { name: '28 يوم', value: '2419200' }
                ))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب كتم الصوت')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('إلغاء كتم الصوت عن مستخدم')
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
        .setDescription('قفل قناة (منع إرسال رسائل)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة المراد قفلها')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب القفل')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('فتح قناة مقفلة')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة المراد فتحها')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الفتح')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('hide')
        .setDescription('إخفاء قناة عن الأعضاء')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة المراد إخفاؤها')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الإخفاء')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('show')
        .setDescription('إظهار قناة مخفية')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة المراد إظهارها')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب الإظهار')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('تفعيل الوضع البطيء في قناة')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('المدة بالثواني (0 لتعطيل)')
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
        .setName('clone')
        .setDescription('نسخ قناة (مع كل الإعدادات)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة المراد نسخها')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('الاسم الجديد (اختياري)')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('نسخ القناة وحذف القديمة (تنظيف كامل)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة المراد تنظيفها')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    // أوامر الرتب
    new SlashCommandBuilder()
        .setName('role')
        .setDescription('إدارة الرتب (إعطاء/إزالة)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('إعطاء رتبة لمستخدم')
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
                .setDescription('إزالة رتبة من مستخدم')
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
                .setName('list')
                .setDescription('عرض كل رتب المستخدم')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('المستخدم')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removeall')
                .setDescription('إزالة كل الرتب من جميع الأعضاء (أو رتبة محددة)')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الرتبة المراد إزالتها من الجميع (اختياري)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('إنشاء رتبة جديدة')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('اسم الرتبة')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('اللون (مثل #FF0000)')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('hoist')
                        .setDescription('عرض الرتبة منفصلة؟')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('mentionable')
                        .setDescription('قابلة للمنشن؟')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('حذف رتبة')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الرتبة المراد حذفها')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('تغيير اسم رتبة')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الرتبة')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('newname')
                        .setDescription('الاسم الجديد')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('color')
                .setDescription('تغيير لون رتبة')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الرتبة')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('اللون (مثل #FF0000)')
                        .setRequired(true)))
        .toJSON(),
    
    // أوامر التنظيف
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('حذف رسائل من القناة')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('عدد الرسائل المراد حذفها (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة (اختياري)')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('حذف رسائل مستخدم محدد فقط')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('contains')
                .setDescription('حذف الرسائل التي تحتوي على كلمة محددة')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('purgebot')
        .setDescription('حذف رسائل البوتات فقط')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('عدد الرسائل')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('purgeuser')
        .setDescription('حذف رسائل مستخدم محدد')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('عدد الرسائل')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('purgeattachments')
        .setDescription('حذف الرسائل التي تحتوي على مرفقات')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('عدد الرسائل')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
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
        .setName('roleinfo')
        .setDescription('معلومات عن رتبة')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('الرتبة')
                .setRequired(true))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('معلومات عن قناة')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('معلومات عن البوت')
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('عرض صورة المستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('banner')
        .setDescription('عرض بانر المستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(false))
        .toJSON(),
    
    // أوامر الصوت
    new SlashCommandBuilder()
        .setName('vcmute')
        .setDescription('كتم صوت مستخدم في الروم الصوتي')
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
        .setDescription('إلغاء كتم الصوت في الروم الصوتي')
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
        .setName('vcdeafen')
        .setDescription('تعطيل السماع لمستخدم في الروم الصوتي')
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
        .setName('vcundeafen')
        .setDescription('إلغاء تعطيل السماع')
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
        .setDescription('طرد مستخدم من الروم الصوتي')
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
        .setDescription('نقل مستخدم إلى روم صوتي آخر')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('الروم الصوتي المستهدف')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('vcdisconnect')
        .setDescription('فصل جميع المستخدمين من الروم الصوتي')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('الروم الصوتي')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    // أوامر الرموز (Emoji) - تم تعديل ترتيب الخيارات
    new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('إدارة الرموز')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('إضافة رمز جديد')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('اسم الرمز')
                        .setRequired(true))
                .addAttachmentOption(option =>
                    option.setName('file')
                        .setDescription('رفع ملف الصورة')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('رابط الصورة (بديل عن رفع الملف)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('حذف رمز')
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('الرمز')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('تغيير اسم رمز')
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('الرمز')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('newname')
                        .setDescription('الاسم الجديد')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('عرض كل الرموز'))
        .toJSON(),
    
    // أوامر الـ Webhook - تم تعديل ترتيب الخيارات
    new SlashCommandBuilder()
        .setName('webhook')
        .setDescription('إدارة الـ Webhooks')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('إنشاء Webhook جديد')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('القناة')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('الاسم')
                        .setRequired(true))
                .addAttachmentOption(option =>
                    option.setName('avatar')
                        .setDescription('صورة الـ Webhook')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('حذف Webhook')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID الـ Webhook')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('عرض Webhooks القناة')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('القناة')
                        .setRequired(false)))
        .toJSON(),
    
    // أوامر الدعوات
    new SlashCommandBuilder()
        .setName('invite')
        .setDescription('إنشاء دعوة للسيرفر')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة المستهدفة')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('maxuses')
                .setDescription('الحد الأقصى للاستخدامات')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100))
        .addIntegerOption(option =>
            option.setName('maxage')
                .setDescription('مدة الصلاحية بالثواني')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(86400))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('invites')
        .setDescription('عرض دعوات السيرفر')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('عرض دعوات مستخدم محدد')
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
        .setName('announce')
        .setDescription('إرسال إعلان في قناة')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('نص الإعلان')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('عنوان الإعلان')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('اللون (مثل #FF0000)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('ping')
                .setDescription('منشن @everyone؟')
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
                .setDescription('الخيار الثالث (اختياري)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('الخيار الرابع (اختياري)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة (اختياري)')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة كـ البوت')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('الرسالة')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة (اختياري)')
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
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('تذييل')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(false))
        .toJSON(),
    
    // أوامر النظام المتقدمة
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('تحذير مستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('سبب التحذير')
                .setRequired(true))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض تحذيرات مستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('clearwarns')
        .setDescription('مسح تحذيرات مستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('nick')
        .setDescription('تغيير اسم مستخدم')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('المستخدم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('الاسم الجديد')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('resetnick')
        .setDescription('إعادة اسم المستخدم الأصلي')
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
        .setName('moveall')
        .setDescription('نقل جميع الأعضاء من روم صوتي إلى آخر')
        .addChannelOption(option =>
            option.setName('from')
                .setDescription('من الروم')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('to')
                .setDescription('إلى الروم')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('voicekickall')
        .setDescription('طرد جميع الأعضاء من الرومات الصوتية')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('السبب')
                .setRequired(false))
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('serverlock')
        .setDescription('قفل السيرفر (منع دخول أعضاء جدد)')
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
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('backup')
        .setDescription('إنشاء نسخة احتياطية من إعدادات السيرفر')
        .toJSON(),
    
    new SlashCommandBuilder()
        .setName('restore')
        .setDescription('استعادة نسخة احتياطية')
        .addStringOption(option =>
            option.setName('backupid')
                .setDescription('ID النسخة الاحتياطية')
                .setRequired(true))
        .toJSON()
];

// تخزين البيانات
const activeCalls = new Map();
const voiceConnections = new Map();
const privateRooms = new Map();
const guildAudioIndex = new Map();
const warnings = new Map(); // تخزين التحذيرات
const backups = new Map(); // تخزين النسخ الاحتياطية

// دالة لاختيار مجموعة صوت
function getNextAudioSet(guildId) {
    const settings = getServerSettings(guildId);
    if (!settings || !settings.audioSetId) return audioSets[0];

    const audioSet = getAudioSetById(settings.audioSetId);

    if (!audioSet.waiting) {
        return audioSet;
    }

    if (!guildAudioIndex.has(guildId)) {
        guildAudioIndex.set(guildId, 0);
    }

    const availableSets = audioSets.filter(set => set.waiting);
    const index = guildAudioIndex.get(guildId) % availableSets.length;
    const selected = availableSets[index];
    guildAudioIndex.set(guildId, (index + 1) % availableSets.length);

    return selected;
}

// دالة لإنشاء اتصال صوتي
async function getOrCreateConnection(channel) {
    try {
        const guildId = channel.guild.id;

        if (voiceConnections.has(guildId)) {
            const conn = voiceConnections.get(guildId);
            try {
                if (conn && conn.state && conn.state.status !== VoiceConnectionStatus.Destroyed) {
                    return conn;
                }
            } catch (err) {}
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

// دالة تشغيل الصوت
function playAudio(connection, fileName, userId, shouldLoop = false, audioSet = null) {
    try {
        const soundPath = path.join(__dirname, fileName);
        if (!fs.existsSync(soundPath)) {
            console.log(`❌ ملف ${fileName} مش موجود`);
            return null;
        }

        const input = fs.createReadStream(soundPath);
        const resource = createAudioResource(input, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        player.play(resource);
        try { connection.subscribe(player); } catch (err) { console.warn('⚠️ فشل الاشتراك بالمشغل:', err.message); }

        if (shouldLoop) {
            player.on(AudioPlayerStatus.Idle, () => {
                if (activeCalls.has(userId)) {
                    const callData = activeCalls.get(userId);
                    if (!callData.isBotMuted && callData.audioSet) {
                        console.log(`🔄 تكرار موسيقى ${callData.audioSet.name} للعميل ${userId}`);
                        playAudio(connection, callData.audioSet.background, userId, true, callData.audioSet);
                    } else if (!callData || !callData.audioSet) {
                        playAudio(connection, fileName, userId, true, audioSet);
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

// دالة لوقف الصوت
function stopAllAudioForUser(userId) {
    const callData = activeCalls.get(userId);
    if (!callData) return;

    if (callData.musicPlayer) {
        callData.musicPlayer.stop();
    }
    if (callData.waitingPlayer) {
        callData.waitingPlayer.stop();
    }
}

// دالة لإنشاء روم صوتي خاص
async function createPrivateVoiceRoom(guild, settings, userId, clientName, adminId, adminName) {
    try {
        console.log(`🆕 إنشاء روم صوتي خاص للعميل ${clientName}`);

        let category;
        try {
            category = await guild.channels.fetch(settings.categoryId);
        } catch (error) {
            category = null;
        }

        const cleanClientName = clientName.replace(/[^\w\u0600-\u06FF]/g, '-').substring(0, 15);
        const roomNumber = Math.floor(Math.random() * 1000);

        const voiceChannel = await guild.channels.create({
            name: `Supp-${cleanClientName}-${roomNumber}`,
            type: ChannelType.GuildVoice,
            parent: category ? category.id : null,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
                },
                {
                    id: userId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
                },
                {
                    id: adminId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.MoveMembers]
                },
                {
                    id: settings.adminRoleId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
                }
            ]
        });

        console.log(`✅ تم إنشاء الروم: ${voiceChannel.name}`);
        return voiceChannel;

    } catch (error) {
        console.error('❌ خطأ في إنشاء الروم الخاص:', error);
        return null;
    }
}

// دالة لنقل الأعضاء للروم الخاص
async function moveToPrivateRoom(guild, userId, adminId, privateRoomId) {
    try {
        console.log(`🚚 نقل الأعضاء للروم الخاص`);

        const privateRoom = await guild.channels.fetch(privateRoomId);
        if (!privateRoom) {
            throw new Error('❌ الروم الخاص مش موجود');
        }

        // نقل العميل
        const clientMember = await guild.members.fetch(userId);
        if (clientMember.voice.channel) {
            await clientMember.voice.setChannel(privateRoomId);
            console.log(`✅ تم نقل العميل ${clientMember.user.tag}`);
        }

        // نقل المشرف
        const adminMember = await guild.members.fetch(adminId);
        if (adminMember.voice.channel) {
            await adminMember.voice.setChannel(privateRoomId);
            console.log(`✅ تم نقل المشرف ${adminMember.user.tag}`);
        }

        return true;

    } catch (error) {
        console.error('❌ خطأ في نقل الأعضاء:', error);
        return false;
    }
}

// دالة لحذف الروم الخاص
async function deletePrivateRoom(guild, roomId) {
    try {
        const room = await guild.channels.fetch(roomId);
        if (room) {
            await room.delete('انتهت المكالمة');
            console.log(`🗑️ تم حذف الروم الخاص: ${room.name}`);
            return true;
        }
    } catch (error) {
        return false;
    }
}

// دالة لإرسال إشعار طلب جديد
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
            .setFooter({ text: 'الرجاء التوجه للروم الصوتي لتولي الطلب' })
            .setTimestamp();

        await textChannel.send({
            content: `<@&${settings.adminRoleId}> 📢 عميل في انتظار الدعم!`,
            embeds: [embed]
        });

        console.log(`📤 تم إرسال إشعار طلب جديد للعميل ${userName}`);

    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار الطلب:', error);
    }
}

// دالة لإرسال إشعار استلام الطلب
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

        console.log(`📤 تم إرسال إشعار استلام الطلب`);

    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار الاستلام:', error);
    }
}

// دالة للتحقق من وجود مشرف في الروم
function getAdminInVoice(channel, settings) {
    if (!channel || !settings || !settings.adminRoleId) return null;

    // فقط الرتبة المحددة في الإعدادات
    return channel.members.find(member => 
        member.roles.cache.has(settings.adminRoleId) && 
        !member.user.bot
    );
}

// دالة للتحقق من صلاحيات استخدام الأوامر
function canUseSetupCommands(member, guild, settings) {
    // 1. Owner للسيرفر
    if (guild.ownerId === member.id) return true;

    // 2. عنده Admin Permission
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

    // 3. عنده الرتبة المحددة للإدارة (إذا تم إعدادها)
    if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId)) return true;

    return false;
}

// دالة للتحقق من صلاحيات استخدام أوامر الإدارة
function canUseModerationCommands(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator) || 
           member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
           member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
           member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
           member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
           member.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
           member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
           member.permissions.has(PermissionsBitField.Flags.MuteMembers) ||
           member.permissions.has(PermissionsBitField.Flags.DeafenMembers) ||
           member.permissions.has(PermissionsBitField.Flags.MoveMembers);
}

// دالة لتنسيق الوقت
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    return `${days} يوم, ${hours % 24} ساعة, ${minutes % 60} دقيقة, ${seconds % 60} ثانية`;
}

// دالة لتسجيل الـ Slash Commands
async function registerCommands() {
    try {
        console.log('🔄 بدء عملية تسجيل الأوامر...');
        console.log(`📝 عدد الأوامر: ${commands.length}`);
        console.log(`🆔 Client ID: ${client.user.id}`);
        console.log(`🔑 Token موجود: ${!!config.token}`);
        
        const rest = new REST({ version: '10' }).setToken(config.token);
        
        // محاولة تسجيل الأوامر
        console.log('📤 إرسال الطلب إلى Discord API...');
        
        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        
        console.log(`✅ تم تسجيل ${data.length} Slash Commands بنجاح!`);
        console.log(`📋 الأوامر: ${data.map(cmd => cmd.name).join(', ')}`);
        
    } catch (error) {
        console.error('❌❌❌ خطأ في تسجيل الـ Slash Commands ❌❌❌');
        console.error('رسالة الخطأ:', error.message);
        console.error('كود الخطأ:', error.code);
        console.error('Status:', error.status);
        
        if (error.code === 50035) {
            console.error('⚠️ خطأ في هيكلة الأوامر. تفاصيل:');
            if (error.rawErrors) {
                error.rawErrors.forEach((err, index) => {
                    console.error(`الخطأ في الأمر رقم ${index}:`, JSON.stringify(err, null, 2));
                });
            }
        }
        
        if (error.response) {
            console.error('تفاصيل الاستجابة:', error.response.data);
        }
        
        // محاولة تحديد الأمر المشكل
        console.log('🔄 محاولة تحديد الأمر المشكل...');
        
        for (let i = 0; i < commands.length; i++) {
            try {
                const testRest = new REST({ version: '10' }).setToken(config.token);
                await testRest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: [commands[i]] }
                );
                console.log(`✅ الأمر ${i + 1} (${commands[i].name}) تم تسجيله بنجاح`);
            } catch (cmdError) {
                console.error(`❌ الأمر ${i + 1} (${commands[i]?.name || 'غير معروف'}) به مشكلة:`);
                console.error('رسالة الخطأ:', cmdError.message);
                if (cmdError.rawErrors) {
                    console.error('تفاصيل:', JSON.stringify(cmdError.rawErrors, null, 2));
                }
                break; // نتوقف عند أول خطأ
            }
        }
    }
}

// ================ نظام Control Panel للمالك ================

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // فقط المالك يستخدم Prefix Commands
    if (message.author.id !== BOT_OWNER_ID) return;

    // التحقق من البادئة
    if (!message.content.startsWith(OWNER_PREFIX)) return;

    const args = message.content.slice(OWNER_PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // أمر panel لعرض لوحة التحكم
    if (command === 'panel') {
        const panelEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle('👑 لوحة تحكم المالك - بدون حذف تلقائي')
            .setDescription(`**مرحباً ${message.author.username}**\nالبادئة: \`${OWNER_PREFIX}\``)
            .addFields(
                {
                    name: '📊 **أوامر الإحصائيات**',
                    value: `\`${OWNER_PREFIX}stats\` - إحصائيات البوت\n\`${OWNER_PREFIX}servers [صفحة]\` - قائمة السيرفرات (مع ID السيرفر ومالكه)\n\`${OWNER_PREFIX}server <ID>\` - معلومات سيرفر محدد\n\`${OWNER_PREFIX}locklist\` - قائمة السيرفرات المقفلة`
                },
                {
                    name: '📢 **أوامر البث**',
                    value: `\`${OWNER_PREFIX}broadcast <رسالة>\` - إرسال للجميع\n\`${OWNER_PREFIX}dm <ID_السيرفر> <رسالة>\` - إرسال لمالك سيرفر`
                },
                {
                    name: '⚙️ **أوامر التحكم**',
                    value: `\`${OWNER_PREFIX}lock <ID_السيرفر>\` - قفل البوت في سيرفر محدد\n\`${OWNER_PREFIX}unlock <ID_السيرفر>\` - فتح البوت في سيرفر\n\`${OWNER_PREFIX}leave <ID_السيرفر>\` - طلع البوت\n\`${OWNER_PREFIX}clearsettings <ID_السيرفر>\` - مسح إعدادات\n\`${OWNER_PREFIX}clearownerdm\` - مسح الشات الخاص مع المالك`
                },
                {
                    name: '👑 **أوامر عامة**',
                    value: `\`${OWNER_PREFIX}panel\` - عرض هذه اللوحة\n\`${OWNER_PREFIX}help\` - المساعدة`
                }
            )
            .setFooter({ text: `ID المالك: ${BOT_OWNER_ID} | ${client.guilds.cache.size} سيرفر\nالرسالة ماتحذفش تلقائياً - انت قرر متى تحذفها` })
            .setTimestamp();

        await message.reply({ embeds: [panelEmbed] });
        return;
    }

    // أمر stats
    if (command === 'stats') {
        const totalServers = client.guilds.cache.size;
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const totalActiveCalls = activeCalls.size;
        const totalPrivateRooms = privateRooms.size;
        const completedSetups = client.guilds.cache.filter(g => isServerSetupComplete(g.id)).size;

        // السيرفرات المقفلة
        const lockedServers = serverSettings.lockedServers || [];
        const allLockedCount = lockedServers.length; // كل السيرفرات المقفلة حتى اللي البوت مش فيها
        const activeLocked = lockedServers.filter(id => client.guilds.cache.has(id)).length; // بس اللي البوت موجود فيها

        const statsEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📊 إحصائيات البوت')
            .addFields(
                { name: '🏠 السيرفرات', value: `\`${totalServers}\` سيرفر`, inline: true },
                { name: '👥 الأعضاء', value: `\`${totalMembers.toLocaleString()}\` عضو`, inline: true },
                { name: '✅ الإعدادات المكتملة', value: `\`${completedSetups}\` سيرفر`, inline: true },
                { name: '📞 المكالمات النشطة', value: `\`${totalActiveCalls}\` مكالمة`, inline: true },
                { name: '🔒 الرومات الخاصة', value: `\`${totalPrivateRooms}\` روم`, inline: true },
                { name: '🚫 السيرفرات المقفلة', value: `\`${allLockedCount}\` سيرفر (${activeLocked} موجودة)`, inline: true },
                { name: '🟢 وقت التشغيل', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
            )
            .setFooter({ text: `مالك البوت: ${message.author.tag}` })
            .setTimestamp();

        await message.reply({ embeds: [statsEmbed] });
        return;
    }

    // أمر servers
    if (command === 'servers') {
        const servers = client.guilds.cache.map(guild => {
            const settings = getServerSettings(guild.id);
            const lockedServers = serverSettings.lockedServers || [];
            const isLocked = lockedServers.includes(guild.id);

            return {
                name: guild.name,
                id: guild.id,
                members: guild.memberCount,
                setup: isServerSetupComplete(guild.id) ? '✅' : '❌',
                owner: guild.ownerId,
                locked: isLocked ? '🔒' : '🔓'
            };
        });

        const itemsPerPage = 8;
        const totalPages = Math.ceil(servers.length / itemsPerPage);

        let page = parseInt(args[0]) || 1;
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const currentServers = servers.slice(start, end);

        let description = '📋 **قائمة السيرفرات بالتفصيل:**\n\n';
        currentServers.forEach((server, index) => {
            const serverNum = start + index + 1;
            description += `**${serverNum}. ${server.name}**\n`;
            description += `├─ 🆔 **السيرفر:** \`${server.id}\`\n`;
            description += `├─ 👑 **المالك:** <@${server.owner}> (\`${server.owner}\`)\n`;
            description += `├─ 👥 **الأعضاء:** ${server.members.toLocaleString()}\n`;
            description += `├─ ⚙️ **الإعدادات:** ${server.setup}\n`;
            description += `└─ 🔐 **القفل:** ${server.locked}\n\n`;
        });

        const serversEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`🏠 قائمة السيرفرات - الصفحة ${page}/${totalPages}`)
            .setDescription(description || 'لا توجد سيرفرات')
            .addFields({
                name: '📊 إحصائيات مفصلة',
                value: `• **إجمالي السيرفرات:** ${servers.length}\n• **المكتملة:** ${servers.filter(s => s.setup === '✅').length}\n• **الناقصة:** ${servers.filter(s => s.setup === '❌').length}\n• **المقفلة:** ${servers.filter(s => s.locked === '🔒').length}\n• **إجمالي الأعضاء:** ${servers.reduce((acc, s) => acc + s.members, 0).toLocaleString()}`
            })
            .setFooter({ 
                text: `أمر: ${OWNER_PREFIX}servers <رقم الصفحة>\nعرض ${start+1}-${Math.min(end, servers.length)} من ${servers.length}` 
            })
            .setTimestamp();

        await message.reply({ embeds: [serversEmbed] });
        return;
    }

    // أمر locklist - لعرض قائمة السيرفرات المقفلة فقط
    if (command === 'locklist') {
        const lockedServers = serverSettings.lockedServers || [];

        if (lockedServers.length === 0) {
            const locklistEmbed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle('📋 قائمة السيرفرات المقفلة')
                .setDescription('**لا توجد سيرفرات مقفلة حالياً.**')
                .setFooter({ text: 'استخدم !lock <ID> لقفل سيرفر' })
                .setTimestamp();

            await message.reply({ embeds: [locklistEmbed] });
            return;
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(lockedServers.length / itemsPerPage);

        let page = parseInt(args[0]) || 1;
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const currentLocks = lockedServers.slice(start, end);

        let description = '🔒 **قائمة السيرفرات المقفلة:**\n\n';

        for (const serverId of currentLocks) {
            const guild = client.guilds.cache.get(serverId);

            if (guild) {
                // السيرفر موجود عند البوت
                const owner = await guild.fetchOwner().catch(() => null);
                description += `🔴 **${guild.name}**\n`;
                description += `├─ 🆔 السيرفر: \`${serverId}\`\n`;
                description += `├─ 👑 المالك: ${owner ? `<@${owner.id}> (\`${owner.id}\`)` : 'غير معروف'}\n`;
                description += `├─ 👥 الأعضاء: ${guild.memberCount.toLocaleString()}\n`;
                description += `└─ 📍 البوت موجود في السيرفر\n\n`;
            } else {
                // السيرفر مش موجود عند البوت (خرج البوت منه)
                description += `⚫ **سيرفر غير موجود**\n`;
                description += `├─ 🆔 السيرفر: \`${serverId}\`\n`;
                description += `├─ 👑 المالك: غير معروف\n`;
                description += `├─ 👥 الأعضاء: غير معروف\n`;
                description += `└─ 📍 البوت غير موجود في السيرفر\n\n`;
            }
        }

        const locklistEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`📋 قائمة السيرفرات المقفلة - الصفحة ${page}/${totalPages}`)
            .setDescription(description)
            .addFields({
                name: '📊 إحصائيات القفل',
                value: `• **إجمالي السيرفرات المقفلة:** ${lockedServers.length}\n• **البوت موجود في:** ${lockedServers.filter(id => client.guilds.cache.has(id)).length}\n• **البوت غير موجود في:** ${lockedServers.filter(id => !client.guilds.cache.has(id)).length}`
            })
            .setFooter({ 
                text: `أمر: ${OWNER_PREFIX}unlock <ID> لفتح السيرفر\nعرض ${start+1}-${Math.min(end, lockedServers.length)} من ${lockedServers.length}` 
            })
            .setTimestamp();

        await message.reply({ embeds: [locklistEmbed] });
        return;
    }

    // أمر server
    if (command === 'server') {
        const serverId = args[0];

        if (!serverId) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ خطأ')
                .setDescription(`**يجب إدخال ID السيرفر!**\n\nمثال: \`${OWNER_PREFIX}server 123456789012345678\``)
                .setFooter({ text: 'استخدم !servers لرؤية قائمة السيرفرات' });

            return message.reply({ embeds: [errorEmbed] });
        }

        const guild = client.guilds.cache.get(serverId);

        // التحقق إذا السيرفر مقفل حتى لو مش موجود
        const lockedServers = serverSettings.lockedServers || [];
        const isLocked = lockedServers.includes(serverId);

        if (!guild) {
            const serverEmbed = new EmbedBuilder()
                .setColor(isLocked ? 0xe74c3c : 0x95a5a6)
                .setTitle('🏠 سيرفر غير موجود في البوت')
                .setDescription(`**البوت غير موجود في هذا السيرفر حالياً**`)
                .addFields(
                    { name: '🆔 **معرف السيرفر**', value: `\`${serverId}\``, inline: false },
                    { name: '🔐 **حالة القفل**', value: isLocked ? '🔒 مقفل (يمكن فتحه بالرغم من أن البوت مش موجود)' : '🔓 غير مقفل', inline: false }
                )
                .setFooter({ text: isLocked ? 'استخدم !unlock <ID> لفتح السيرفر' : 'السيرفر ليس مقفلاً' })
                .setTimestamp();

            await message.reply({ embeds: [serverEmbed] });
            return;
        }

        const settings = getServerSettings(guild.id);
        const isComplete = isServerSetupComplete(guild.id);
        const owner = await guild.fetchOwner();

        const serverEmbed = new EmbedBuilder()
            .setColor(isLocked ? 0xe74c3c : (isComplete ? 0x2ecc71 : 0xf39c12))
            .setTitle(`🏠 ${guild.name}`)
            .setDescription(`**معلومات مفصلة عن السيرفر**`)
            .addFields(
                { name: '🆔 **معرف السيرفر**', value: `\`${guild.id}\``, inline: false },
                { name: '👑 **المالك**', value: owner ? `${owner.user.tag}\n<@${owner.id}> (\`${owner.id}\`)` : 'غير معروف', inline: false },
                { name: '👥 **الأعضاء**', value: `${guild.memberCount.toLocaleString()} عضو`, inline: true },
                { name: '📅 **تاريخ الإنشاء**', value: `<t:${Math.floor(guild.createdTimestamp/1000)}:D>`, inline: true },
                { name: '📅 **تاريخ دخول البوت**', value: `<t:${Math.floor(guild.joinedTimestamp/1000)}:D>`, inline: true },
                { name: '⚙️ **حالة الإعدادات**', value: isComplete ? '✅ مكتملة' : '❌ غير مكتملة', inline: true },
                { name: '🔐 **حالة القفل**', value: isLocked ? '🔒 مقفل' : '🔓 مفتوح', inline: true }
            )
            .setFooter({ text: `استخدم ${OWNER_PREFIX}servers لعرض كل السيرفرات` })
            .setTimestamp();

        await message.reply({ embeds: [serverEmbed] });
        return;
    }

    // أمر broadcast
    if (command === 'broadcast') {
        const messageContent = args.join(' ');

        if (!messageContent) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ خطأ')
                .setDescription(`**يجب كتابة الرسالة!**\n\nمثال: \`${OWNER_PREFIX}broadcast هناك تحديث جديد للبوت...\``);

            return message.reply({ embeds: [errorEmbed] });
        }

        // رسالة تأكيد
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️ تأكيد إرسال رسالة للجميع')
            .setDescription(`**هل أنت متأكد من إرسال هذه الرسالة لجميع مالكي السيرفرات؟**\n\n${messageContent}`)
            .addFields({
                name: 'الإحصاءات',
                value: `• عدد السيرفرات: ${client.guilds.cache.size}\n• العدد التقديري للأعضاء: ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`
            })
            .setFooter({ text: 'اكتب "نعم" خلال 30 ثانية للمتابعة' });

        const confirmMessage = await message.reply({ embeds: [confirmEmbed] });

        const filter = m => m.author.id === BOT_OWNER_ID;
        try {
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'نعم') {
                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('📤 جاري الإرسال...')
                            .setDescription('جاري إرسال الرسالة لجميع مالكي السيرفرات...')
                            .setFooter({ text: 'قد يستغرق هذا بعض الوقت' })
                    ]
                });

                let successCount = 0;
                let failCount = 0;
                let totalServers = client.guilds.cache.size;
                let current = 0;

                // إرسال لكل سيرفر
                for (const guild of client.guilds.cache.values()) {
                    current++;
                    try {
                        const owner = await guild.fetchOwner();
                        if (owner && owner.user) {
                            const broadcastEmbed = new EmbedBuilder()
                                .setColor(0xFFFFFF)
                                .setTitle('📢 إشعار من مالك بوت Sienna')
                                .setDescription(messageContent)
                                .addFields({
                                    name: 'معلومات الإرسال',
                                    value: `• السيرفر: ${guild.name}\n• التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n• الوقت: ${new Date().toLocaleTimeString('ar-SA')}`
                                })
                                .setFooter({ 
                                    text: `Sienna Support Bot`, 
                                    iconURL: 'https://cdn.discordapp.com/attachments/1449057765397106830/1459265170584109067/8ed9b44c0b845fd2d1b092949bc83411.jpg?ex=69898a58&is=698838d8&hm=e64f57cb8ba535d347da7ea478c1400ff5da0d71018f631fc176bc96d51b9889&' 
                                })
                                .setTimestamp();

                            await owner.send({ embeds: [broadcastEmbed] });
                            successCount++;
                            console.log(`✅ تم إرسال رسالة لمالك ${guild.name} (${owner.user.tag})`);
                        } else {
                            failCount++;
                        }
                    } catch (error) {
                        failCount++;
                        console.log(`❌ فشل إرسال رسالة لمالك ${guild.name}:`, error.message);
                    }
                }

                // النتيجة النهائية
                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setTitle('✅ تم الإرسال بنجاح!')
                            .setDescription(`**تم إرسال الرسالة بنجاح**\n\n${messageContent}`)
                            .addFields(
                                { name: '📊 النتائج', value: `• السيرفرات: ${totalServers}\n• الناجح: ${successCount}\n• الفاشل: ${failCount}`, inline: true },
                                { name: '📈 النسبة', value: `• النجاح: ${Math.round((successCount / totalServers) * 100)}%\n• الفشل: ${Math.round((failCount / totalServers) * 100)}%`, inline: true }
                            )
                            .setFooter({ text: 'تم الإرسال بنجاح' })
                            .setTimestamp()
                    ]
                });
            } else {
                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم إرسال الرسالة.')
                    ]
                });
            }
        } catch (error) {
            await confirmMessage.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // أمر dm
    if (command === 'dm') {
        const serverId = args[0];
        const dmMessage = args.slice(1).join(' ');

        if (!serverId || !dmMessage) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ خطأ')
                .setDescription(`**يجب إدخال ID السيرفر والرسالة!**\n\nمثال: \`${OWNER_PREFIX}dm 123456789012345678 مرحباً، هناك تحديث جديد...\``);

            return message.reply({ embeds: [errorEmbed] });
        }

        const guild = client.guilds.cache.get(serverId);

        if (!guild) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ سيرفر غير موجود')
                .setDescription(`**لا يوجد سيرفر بالـ ID:** \`${serverId}\``);

            return message.reply({ embeds: [errorEmbed] });
        }

        try {
            const owner = await guild.fetchOwner();
            if (!owner || !owner.user) {
                throw new Error('لا يمكن الوصول لمالك السيرفر');
            }

            const dmEmbed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle('رساله من مطور بوت  Sienna :>')
                .setDescription(dmMessage)
                .addFields({
                    name: 'معلومات الإرسال',
                    value: `• السيرفر: ${guild.name}\n• التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n• المرسل: ${message.author.tag}`
                })
                .setFooter({ 
                    text: `Sienna Support Bot`, 
                    iconURL: 'https://cdn.discordapp.com/attachments/1449057765397106830/1459265170584109067/8ed9b44c0b845fd2d1b092949bc83411.jpg?ex=69898a58&is=698838d8&hm=e64f57cb8ba535d347da7ea478c1400ff5da0d71018f631fc176bc96d51b9889&' 
                })
                .setTimestamp();

            await owner.send({ embeds: [dmEmbed] });

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ تم الإرسال بنجاح!')
                .setDescription(`**تم إرسال الرسالة لمالك ${guild.name}!**`)
                .addFields(
                    { name: '👑 **المالك**', value: owner.user.tag, inline: true },
                    { name: '🏠 **السيرفر**', value: guild.name, inline: true },
                    { name: '📨 **محتوى الرسالة**', value: dmMessage.substring(0, 100) + (dmMessage.length > 100 ? '...' : ''), inline: false }
                );

            await message.reply({ embeds: [successEmbed] });

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ فشل إرسال الرسالة!')
                .setDescription(`**حدث خطأ:**\n\`${error.message}\``);

            await message.reply({ embeds: [errorEmbed] });
        }
        return;
    }

    // أمر clearownerdm - مسح الشات الخاص مع المالك
    if (command === 'clearownerdm') {
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️ تأكيد مسح الشات الخاص')
            .setDescription('**هل أنت متأكد من مسح كل رسائل الشات الخاص مع المالك؟**\n\n**سيتم:**\n• حذف كل رسائل البوت في الخاص معك\n• هذه العملية لا يمكن التراجع عنها\n• قد تستغرق بعض الوقت')
            .setFooter({ text: 'اكتب "تأكيد" خلال 30 ثانية للمتابعة' });

        const confirmMessage = await message.reply({ embeds: [confirmEmbed] });

        const filter = m => m.author.id === BOT_OWNER_ID;
        try {
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('🔄 جاري المسح...')
                            .setDescription('جاري مسح رسائل الشات الخاص...')
                            .setFooter({ text: 'قد يستغرق هذا بعض الوقت' })
                    ]
                });

                try {
                    // الحصول على DM channel مع المالك
                    const ownerDM = await message.author.createDM();

                    // جلب كل الرسائل (بحد 100 رسالة لكل مرة)
                    let deletedCount = 0;
                    let hasMore = true;

                    while (hasMore) {
                        const messages = await ownerDM.messages.fetch({ limit: 100 });

                        if (messages.size === 0) {
                            hasMore = false;
                            break;
                        }

                        // تصفية رسائل البوت فقط
                        const botMessages = messages.filter(m => m.author.id === client.user.id);

                        // حذف الرسائل
                        for (const msg of botMessages.values()) {
                            try {
                                await msg.delete();
                                deletedCount++;
                            } catch (error) {
                                console.log(`❌ لم أستطع حذف رسالة: ${error.message}`);
                            }
                        }

                        // إذا كان عدد الرسائل أقل من 100، معناه خلصنا
                        if (messages.size < 100) {
                            hasMore = false;
                        }
                    }

                    await confirmMessage.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x2ecc71)
                                .setTitle('✅ تم المسح بنجاح!')
                                .setDescription(`**تم مسح الشات الخاص مع المالك بنجاح**`)
                                .addFields({
                                    name: '📊 النتائج',
                                    value: `• **عدد الرسائل المحذوفة:** ${deletedCount}\n• **المسح:** رسائل البوت فقط\n• **الحالة:** تم التنظيف بنجاح`
                                })
                                .setFooter({ text: 'يمكنك الآن البدء بشات نظيف' })
                                .setTimestamp()
                        ]
                    });

                    console.log(`✅ تم مسح ${deletedCount} رسالة من الشات الخاص مع المالك`);

                } catch (error) {
                    await confirmMessage.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xe74c3c)
                                .setTitle('❌ فشل المسح!')
                                .setDescription(`**حدث خطأ أثناء محاولة مسح الرسائل:**\n\`${error.message}\``)
                        ]
                    });
                }
            } else {
                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم مسح رسائل الشات الخاص.')
                    ]
                });
            }
        } catch (error) {
            await confirmMessage.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // أمر leave
    if (command === 'leave') {
        const serverId = args[0];

        if (!serverId) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ خطأ')
                .setDescription(`**يجب إدخال ID السيرفر!**\n\nمثال: \`${OWNER_PREFIX}leave 123456789012345678\``);

            return message.reply({ embeds: [errorEmbed] });
        }

        const guild = client.guilds.cache.get(serverId);

        if (!guild) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ سيرفر غير موجود')
                .setDescription(`**لا يوجد سيرفر بالـ ID:** \`${serverId}\``);

            return message.reply({ embeds: [errorEmbed] });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️ تأكيد خروج البوت')
            .setDescription(`**هل أنت متأكد من إخراج البوت من ${guild.name}؟**\n\n**سيتم:**\n• حذف كل إعدادات السيرفر\n• إزالة البوت من السيرفر\n• لا يمكن التراجع عن هذه العملية`)
            .setFooter({ text: 'اكتب "تأكيد" خلال 30 ثانية للمتابعة' });

        const confirmMessage = await message.reply({ embeds: [confirmEmbed] });

        const filter = m => m.author.id === BOT_OWNER_ID;
        try {
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                // مسح إعدادات السيرفر
                delete serverSettings[guild.id];

                // إزالة من القائمة المقفلة إذا موجود
                if (serverSettings.lockedServers) {
                    serverSettings.lockedServers = serverSettings.lockedServers.filter(id => id !== guild.id);
                }

                saveSettings(serverSettings);

                // خروج البوت من السيرفر
                await guild.leave();

                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setTitle('✅ تم خروج البوت بنجاح!')
                            .setDescription(`تم إخراج البوت من **${guild.name}** بنجاح.\n\n**تم حذف:**\n• كل إعدادات السيرفر\n• بيانات النظام`)
                            .setFooter({ text: 'تم الخروج بنجاح' })
                    ]
                });

                console.log(`✅ البوت خرج من سيرفر: ${guild.name} (${guild.id})`);
            } else {
                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم إخراج البوت.')
                    ]
                });
            }
        } catch (error) {
            await confirmMessage.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // أمر clearsettings
    if (command === 'clearsettings') {
        const serverId = args[0];

        if (!serverId) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ خطأ')
                .setDescription(`**يجب إدخال ID السيرفر!**\n\nمثال: \`${OWNER_PREFIX}clearsettings 123456789012345678\``);

            return message.reply({ embeds: [errorEmbed] });
        }

        const guild = client.guilds.cache.get(serverId);

        if (!guild) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ سيرفر غير موجود')
                .setDescription(`**لا يوجد سيرفر بالـ ID:** \`${serverId}\``);

            return message.reply({ embeds: [errorEmbed] });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️ تأكيد مسح الإعدادات')
            .setDescription(`**هل أنت متأكد من مسح إعدادات ${guild.name}؟**\n\n**سيتم:**\n• حذف كل الإعدادات المخصصة\n• البوت سيتوقف عن العمل في هذا السيرفر حتى يتم إعادة الإعداد\n• يمكن إعادة الإعداد لاحقاً`)
            .setFooter({ text: 'اكتب "تأكيد" خلال 30 ثانية للمتابعة' });

        const confirmMessage = await message.reply({ embeds: [confirmEmbed] });

        const filter = m => m.author.id === BOT_OWNER_ID;
        try {
            const collected = await message.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                delete serverSettings[guild.id];
                saveSettings(serverSettings);

                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setTitle('✅ تم مسح الإعدادات بنجاح!')
                            .setDescription(`تم مسح إعدادات **${guild.name}** بنجاح.\n\n**لمساعدة المالك:**\nيمكنه استخدام \`/help\` لعرض أوامر الإعداد من جديد.`)
                            .setFooter({ text: 'استخدم /help للإعداد من جديد' })
                    ]
                });

                console.log(`✅ تم مسح إعدادات سيرفر: ${guild.name} (${guild.id})`);
            } else {
                await confirmMessage.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم مسح الإعدادات.')
                    ]
                });
            }
        } catch (error) {
            await confirmMessage.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // أمر lock للسيرفر المحدد
    if (command === 'lock') {
        const serverId = args[0];

        if (!serverId) {
            const lockEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔒 قفل البوت في سيرفر محدد')
                .setDescription('**استخدام:**\n`!lock <ID_السيرفر>`\n\n**مثال:**\n`!lock 123456789012345678`\n\nلرؤية قائمة السيرفرات: `!servers`')
                .setFooter({ text: 'هذا الأمر بيقفل البوت في سيرفر محدد فقط' });

            return message.reply({ embeds: [lockEmbed] });
        }

        const guild = client.guilds.cache.get(serverId);

        // إضافة السيرفر للقائمة المغلقة حتى لو مش موجود
        if (!serverSettings.lockedServers) serverSettings.lockedServers = [];

        if (!serverSettings.lockedServers.includes(serverId)) {
            serverSettings.lockedServers.push(serverId);
            saveSettings(serverSettings);
        }

        const lockEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ تم قفل البوت في السيرفر')
            .setDescription(`**تم قفل البوت بنجاح في السيرفر:**`)
            .addFields(
                { 
                    name: '🔐 **حالة القفل**', 
                    value: `تم إضافة السيرفر للقائمة المقفلة بنجاح.\n\n**معرف السيرفر:** \`${serverId}\``,
                    inline: false 
                }
            );

        if (guild) {
            lockEmbed.addFields(
                { name: '🏠 **السيرفر**', value: guild.name, inline: true },
                { name: '👑 **المالك**', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 **الأعضاء**', value: guild.memberCount.toLocaleString(), inline: true }
            );
            lockEmbed.setDescription(`**تم قفل البوت بنجاح في:**\n\n🏠 **السيرفر:** ${guild.name}`);
        } else {
            lockEmbed.addFields(
                { name: '📌 **ملاحظة**', value: 'البوت غير موجود في هذا السيرفر حالياً، لكن تم إضافته للقائمة المقفلة.', inline: false }
            );
        }

        lockEmbed.addFields({
            name: '💡 **معلومة**',
            value: 'لإعادة تفعيل البوت في هذا السيرفر، استخدم:\n`!unlock ' + serverId + '`\n\nلعرض قائمة السيرفرات المقفلة: `!locklist`'
        })
        .setFooter({ text: `تم القفل بواسطة: ${message.author.tag}` })
        .setTimestamp();

        await message.reply({ embeds: [lockEmbed] });
        return;
    }

    // أمر unlock للسيرفر المحدد (حتى لو البوت مش موجود)
    if (command === 'unlock') {
        const serverId = args[0];

        if (!serverId) {
            const unlockEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔓 فتح البوت في سيرفر محدد')
                .setDescription('**استخدام:**\n`!unlock <ID_السيرفر>`\n\n**مثال:**\n`!unlock 123456789012345678`\n\nلرؤية قائمة السيرفرات: `!servers`')
                .setFooter({ text: 'هذا الأمر بيفتح البوت في سيرفر محدد (حتى لو البوت مش موجود)' });

            return message.reply({ embeds: [unlockEmbed] });
        }

        const guild = client.guilds.cache.get(serverId);

        // إزالة السيرفر من القائمة المغلقة (حتى لو مش موجود)
        if (!serverSettings.lockedServers) serverSettings.lockedServers = [];

        const wasLocked = serverSettings.lockedServers.includes(serverId);

        if (wasLocked) {
            serverSettings.lockedServers = serverSettings.lockedServers.filter(id => id !== serverId);
            saveSettings(serverSettings);
        }

        const unlockEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ تم فتح البوت في السيرفر')
            .setDescription(`**تم فتح البوت بنجاح في السيرفر:**`);

        if (guild) {
            unlockEmbed.addFields(
                { name: '🏠 **السيرفر**', value: guild.name, inline: true },
                { name: '👑 **المالك**', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 **الأعضاء**', value: guild.memberCount.toLocaleString(), inline: true },
                { name: '🔓 **الحالة**', value: wasLocked ? '✅ تم الفتح' : '⚠️ لم يكن مقفلاً', inline: false }
            );
            unlockEmbed.setDescription(`**تم فتح البوت بنجاح في:**\n\n🏠 **السيرفر:** ${guild.name}`);
        } else {
            unlockEmbed.addFields(
                { name: '🔑 **المعرف**', value: `\`${serverId}\``, inline: false },
                { name: '🔓 **الحالة**', value: wasLocked ? '✅ تم الفتح (البوت غير موجود)' : '⚠️ لم يكن مقفلاً', inline: false },
                { name: '📌 **ملاحظة**', value: 'البوت غير موجود في هذا السيرفر حالياً، لكن تم إزالته من القائمة المقفلة.', inline: false }
            );
        }

        unlockEmbed.setFooter({ text: `تم الفتح بواسطة: ${message.author.tag}` })
        .setTimestamp();

        await message.reply({ embeds: [unlockEmbed] });
        return;
    }

    // أمر help للمالك
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🆘 مركز مساعدة المالك')
            .setDescription(`**أوامر لوحة التحكم - البادئة: \`${OWNER_PREFIX}\`**\n\n**فقط أنت (${message.author.tag}) يمكنك استخدام هذه الأوامر**`)
            .addFields(
                {
                    name: '📊 **أوامر الإحصائيات**',
                    value: `\`${OWNER_PREFIX}stats\` - إحصائيات البوت الكاملة\n\`${OWNER_PREFIX}servers [صفحة]\` - قائمة السيرفرات مع كل التفاصيل\n\`${OWNER_PREFIX}server <ID>\` - معلومات سيرفر محدد\n\`${OWNER_PREFIX}locklist [صفحة]\` - قائمة السيرفرات المقفلة فقط`
                },
                {
                    name: '📢 **أوامر البث والمراسلة**',
                    value: `\`${OWNER_PREFIX}broadcast <رسالة>\` - إرسال رسالة لجميع المالكين\n\`${OWNER_PREFIX}dm <ID_السيرفر> <رسالة>\` - إرسال رسالة لمالك سيرفر محدد\n\`${OWNER_PREFIX}clearownerdm\` - مسح الشات الخاص مع المالك`
                },
                {
                    name: '⚙️ **أوامر التحكم**',
                    value: `\`${OWNER_PREFIX}lock <ID_السيرفر>\` - قفل البوت في سيرفر محدد (حتى لو البوت مش موجود)\n\`${OWNER_PREFIX}unlock <ID_السيرفر>\` - فتح البوت في سيرفر محدد (حتى لو البوت مش موجود)\n\`${OWNER_PREFIX}leave <ID_السيرفر>\` - إخراج البوت من سيرفر\n\`${OWNER_PREFIX}clearsettings <ID_السيرفر>\` - مسح إعدادات سيرفر`
                },
                {
                    name: '👑 **أوامر عامة**',
                    value: `\`${OWNER_PREFIX}panel\` - عرض لوحة التحكم\n\`${OWNER_PREFIX}help\` - عرض هذه القائمة`
                }
            )
            .addFields({
                name: '💡 **ملاحظات هامة**',
                value: '• يمكنك قفل سيرفرات حتى لو البوت مش موجود فيها\n• يمكنك فتح سيرفرات مقفلة حتى لو البوت مش موجود فيها\n• قائمة `!locklist` تظهر كل السيرفرات المقفلة\n• `!clearownerdm` يمسح كل رسائل البوت في الخاص معك'
            })
            .setFooter({ text: `ID المالك: ${BOT_OWNER_ID} | ${client.guilds.cache.size} سيرفر` })
            .setTimestamp();

        await message.reply({ embeds: [helpEmbed] });
        return;
    }
});

// ================ نظام Slash Commands ================

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options, guild, member, user } = interaction;

    // التحقق إذا السيرفر مقفل
    const lockedServers = serverSettings.lockedServers || [];
    if (lockedServers.includes(guild.id)) {
        return interaction.reply({ 
            content: '❌ **يجب تجديد الاشتراك :<**\n\nموقع تجديد الاشتراك: [ https://siennaai.pages.dev/ ]',
            ephemeral: true 
        });
    }

    // الحصول على إعدادات السيرفر
    let settings = getServerSettings(guild.id);
    if (!settings) {
        settings = {
            audioSetId: 'set1'
        };
        serverSettings[guild.id] = settings;
    }

    // أمر launch
    if (commandName === 'launch') {
        const launchEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle('🚀 Sienna App Launcher')
            .setDescription('**مرحباً بك في مشغل تطبيقات Sienna**\nاختر التطبيق الذي تريد تشغيله:')
            .addFields(
                { name: '🎮 **Sienna Games**', value: 'تشغيل الألعاب المصغرة', inline: true },
                { name: '🎵 **Sienna Music**', value: 'تشغيل الموسيقى', inline: true },
                { name: '📊 **Sienna Stats**', value: 'عرض الإحصائيات', inline: true },
                { name: '⚙️ **Sienna Tools**', value: 'أدوات مفيدة', inline: true },
                { name: '🤖 **Sienna AI**', value: 'المساعد الذكي', inline: true },
                { name: '🎨 **Sienna Customizer**', value: 'تخصيص البوت', inline: true }
            )
            .setFooter({ text: 'Sienna App Launcher v1.0' })
            .setTimestamp();

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

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('launch_ai')
                    .setLabel('🤖 AI Assistant')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('launch_customizer')
                    .setLabel('🎨 Customizer')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setURL('https://siennaai.pages.dev/')
                    .setLabel('🌐 Website')
                    .setStyle(ButtonStyle.Link)
            );

        await interaction.reply({ 
            embeds: [launchEmbed], 
            components: [row, row2],
            ephemeral: true 
        });
        return;
    }

    // التحقق من الصلاحيات لأوامر الإعداد
    if (commandName === 'setup' || commandName === 'reset') {
        if (!canUseSetupCommands(member, guild, settings)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذه الأوامر!**\n\nفقط مالك السيرفر والمشرفون يمكنهم استخدام أوامر الإعداد.',
                ephemeral: true 
            });
        }
    }

    // أمر المساعدة
    if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🆘 مركز المساعدة - بوت Sienna')
            .setDescription('**قائمة الأوامر المتاحة**\n\n**📍 استخدم `/` ثم اكتب اسم الأمر**')
            .addFields(
                { 
                    name: '⚙️ **أوامر الإعداد**', 
                    value: `
\`/setup category\` - تحديد التصنيف
\`/setup voice\` - تحديد روم الانتظار
\`/setup text\` - تحديد روم الإشعارات
\`/setup role\` - تحديد رتبة الإدارة
\`/setup waiting\` - اختيار مجموعة الصوت
\`/setup show\` - عرض الإعدادات
\`/reset\` - مسح كل الإعدادات
                    `
                },
                { 
                    name: '🚀 **أوامر التشغيل**', 
                    value: `
\`/launch\` - تشغيل تطبيق Sienna
                    `
                },
                {
                    name: '🔨 **أوامر الحظر والطرد**',
                    value: `
\`/ban\` - حظر مستخدم
\`/unban\` - إلغاء حظر
\`/kick\` - طرد مستخدم
\`/softban\` - حظر ناعم (طرد + حذف رسائل)
                    `
                },
                {
                    name: '🔇 **أوامر كتم الصوت**',
                    value: `
\`/timeout\` - كتم صوت مؤقت
\`/untimeout\` - إلغاء كتم الصوت
                    `
                },
                {
                    name: '📝 **أوامر القنوات**',
                    value: `
\`/lock\` - قفل قناة
\`/unlock\` - فتح قناة
\`/hide\` - إخفاء قناة
\`/show\` - إظهار قناة
\`/slowmode\` - تفعيل الوضع البطيء
\`/clone\` - نسخ قناة
\`/nuke\` - تنظيف قناة
                    `
                },
                {
                    name: '🎭 **أوامر الرتب**',
                    value: `
\`/role give\` - إعطاء رتبة
\`/role remove\` - إزالة رتبة
\`/role list\` - عرض رتب المستخدم
\`/role removeall\` - إزالة كل الرتب
\`/role create\` - إنشاء رتبة
\`/role delete\` - حذف رتبة
\`/role rename\` - تغيير اسم رتبة
\`/role color\` - تغيير لون رتبة
                    `
                },
                {
                    name: '🧹 **أوامر التنظيف**',
                    value: `
\`/purge\` - حذف رسائل
\`/purgebot\` - حذف رسائل البوتات
\`/purgeuser\` - حذف رسائل مستخدم
\`/purgeattachments\` - حذف المرفقات
                    `
                },
                {
                    name: 'ℹ️ **أوامر المعلومات**',
                    value: `
\`/userinfo\` - معلومات مستخدم
\`/serverinfo\` - معلومات سيرفر
\`/roleinfo\` - معلومات رتبة
\`/channelinfo\` - معلومات قناة
\`/botinfo\` - معلومات البوت
\`/avatar\` - عرض صورة المستخدم
\`/banner\` - عرض بانر المستخدم
                    `
                },
                {
                    name: '🎤 **أوامر الصوت**',
                    value: `
\`/vcmute\` - كتم صوت في الروم
\`/vcunmute\` - إلغاء كتم الصوت
\`/vcdeafen\` - تعطيل السماع
\`/vcundeafen\` - إلغاء تعطيل السماع
\`/vckick\` - طرد من الروم الصوتي
\`/vcmove\` - نقل بين الرومات
\`/vcdisconnect\` - فصل الكل
                    `
                },
                {
                    name: '😀 **أوامر الرموز**',
                    value: `
\`/emoji add\` - إضافة رمز
\`/emoji delete\` - حذف رمز
\`/emoji rename\` - تغيير اسم رمز
\`/emoji list\` - عرض الرموز
                    `
                },
                {
                    name: '🔗 **أوامر الـ Webhook**',
                    value: `
\`/webhook create\` - إنشاء Webhook
\`/webhook delete\` - حذف Webhook
\`/webhook list\` - عرض Webhooks
                    `
                },
                {
                    name: '📨 **أوامر الدعوات**',
                    value: `
\`/invite\` - إنشاء دعوة
\`/invites\` - عرض الدعوات
                    `
                },
                {
                    name: '🤖 **أوامر البوت**',
                    value: `
\`/ping\` - اختبار السرعة
\`/uptime\` - مدة التشغيل
\`/announce\` - إرسال إعلان
\`/poll\` - إنشاء استفتاء
\`/say\` - إرسال رسالة
\`/embed\` - إنشاء رسالة منسقة
                    `
                },
                {
                    name: '⚠️ **أوامر التحذيرات**',
                    value: `
\`/warn\` - تحذير مستخدم
\`/warnings\` - عرض التحذيرات
\`/clearwarns\` - مسح التحذيرات
                    `
                },
                {
                    name: '📛 **أوامر الأسماء**',
                    value: `
\`/nick\` - تغيير اسم مستخدم
\`/resetnick\` - إعادة الاسم الأصلي
                    `
                },
                {
                    name: '⚡ **أوامر متقدمة**',
                    value: `
\`/moveall\` - نقل كل الأعضاء
\`/voicekickall\` - طرد الكل من الصوت
\`/serverlock\` - قفل السيرفر
\`/serverunlock\` - فتح السيرفر
\`/backup\` - إنشاء نسخة احتياطية
\`/restore\` - استعادة نسخة
                    `
                }
            )
            .setFooter({ 
                text: `السيرفر: ${guild.name} | إجمالي الأوامر: 70+` 
            })
            .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }

    // أمر عرض الإعدادات
    if (commandName === 'setup' && options.getSubcommand() === 'show') {
        const settingsText = formatSettings(guild, settings);

        const embed = new EmbedBuilder()
            .setColor(isServerSetupComplete(guild.id) ? 0x2ecc71 : 0xe74c3c)
            .setTitle('⚙️ الإعدادات الحالية')
            .setDescription(settingsText)
            .setFooter({ 
                text: isServerSetupComplete(guild.id) 
                    ? '✅ النظام جاهز للعمل' 
                    : '❌ النظام غير مكتمل - استخدم أوامر الإعداد' 
            })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // أمر إعداد الصوت
    if (commandName === 'setup' && options.getSubcommand() === 'waiting') {
        const audioSetId = options.getString('set');
        const audioSet = audioSets.find(set => set.id === audioSetId);

        settings.audioSetId = audioSetId;
        serverSettings[guild.id] = settings;
        saveSettings(serverSettings);

        return interaction.reply({ 
            content: `✅ **تم تحديث مجموعة الصوت بنجاح!**\n🎵 **المجموعة الجديدة:** ${audioSet.name}`,
            ephemeral: true 
        });
    }

    // أمر إعداد التصنيف
    if (commandName === 'setup' && options.getSubcommand() === 'category') {
        const categoryId = options.getString('id');

        const category = await guild.channels.fetch(categoryId).catch(() => null);

        if (!category || category.type !== ChannelType.GuildCategory) {
            return interaction.reply({ 
                content: '❌ **التصنيف غير موجود أو ليس تصنيفاً صالحاً!**',
                ephemeral: true 
            });
        }

        settings.categoryId = categoryId;
        serverSettings[guild.id] = settings;
        saveSettings(serverSettings);

        if (isServerSetupComplete(guild.id)) {
            return interaction.reply({ 
                content: `✅ **تم تحديث التصنيف بنجاح!**\n📂 **التصنيف:** ${category.name}\n\n🎉 **تهانينا!** النظام أصبح جاهزاً للعمل!`,
                ephemeral: true 
            });
        } else {
            return interaction.reply({ 
                content: `✅ **تم تحديث التصنيف بنجاح!**\n📂 **التصنيف:** ${category.name}\n\n⚠️ **مطلوب:** لا تزال تحتاج إلى إعداد روم الصوت وروم النص ورتبة الإدارة.`,
                ephemeral: true 
            });
        }
    }

    // أمر إعداد روم الصوت
    if (commandName === 'setup' && options.getSubcommand() === 'voice') {
        const voiceId = options.getString('id');

        const voiceChannel = await guild.channels.fetch(voiceId).catch(() => null);

        if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ 
                content: '❌ **القناة غير موجودة أو ليست روم صوت!**',
                ephemeral: true 
            });
        }

        settings.voiceId = voiceId;
        serverSettings[guild.id] = settings;
        saveSettings(serverSettings);

        if (isServerSetupComplete(guild.id)) {
            return interaction.reply({ 
                content: `✅ **تم تحديث روم الانتظار بنجاح!**\n🎧 **الروم:** ${voiceChannel.name}\n\n🎉 **تهانينا!** النظام أصبح جاهزاً للعمل!`,
                ephemeral: true 
            });
        } else {
            return interaction.reply({ 
                content: `✅ **تم تحديث روم الانتظار بنجاح!**\n🎧 **الروم:** ${voiceChannel.name}\n\n⚠️ **مطلوب:** لا تزال تحتاج إلى إعداد التصنيف وروم النص ورتبة الإدارة.`,
                ephemeral: true 
            });
        }
    }

    // أمر إعداد روم النص
    if (commandName === 'setup' && options.getSubcommand() === 'text') {
        const textId = options.getString('id');

        const textChannel = await guild.channels.fetch(textId).catch(() => null);

        if (!textChannel || textChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **القناة غير موجودة أو ليست روم نص!**',
                ephemeral: true 
            });
        }

        settings.textId = textId;
        serverSettings[guild.id] = settings;
        saveSettings(serverSettings);

        if (isServerSetupComplete(guild.id)) {
            return interaction.reply({ 
                content: `✅ **تم تحديث روم الإشعارات بنجاح!**\n💬 **الروم:** ${textChannel.name}\n\n🎉 **تهانينا!** النظام أصبح جاهزاً للعمل!`,
                ephemeral: true 
            });
        } else {
            return interaction.reply({ 
                content: `✅ **تم تحديث روم الإشعارات بنجاح!**\n💬 **الروم:** ${textChannel.name}\n\n⚠️ **مطلوب:** لا تزال تحتاج إلى إعداد التصنيف وروم الصوت ورتبة الإدارة.`,
                ephemeral: true 
            });
        }
    }

    // أمر إعداد رتبة الإدارة
    if (commandName === 'setup' && options.getSubcommand() === 'role') {
        const roleId = options.getString('id');

        const role = await guild.roles.fetch(roleId).catch(() => null);

        if (!role) {
            return interaction.reply({ 
                content: '❌ **الرتبة غير موجودة!**',
                ephemeral: true 
            });
        }

        settings.adminRoleId = roleId;
        serverSettings[guild.id] = settings;
        saveSettings(serverSettings);

        if (isServerSetupComplete(guild.id)) {
            return interaction.reply({ 
                content: `✅ **تم تحديث رتبة الإدارة بنجاح!**\n👑 **الرتبة:** ${role.name}\n\n🎉 **تهانينا!** النظام أصبح جاهزاً للعمل!`,
                ephemeral: true 
            });
        } else {
            return interaction.reply({ 
                content: `✅ **تم تحديث رتبة الإدارة بنجاح!**\n👑 **الرتبة:** ${role.name}\n\n⚠️ **مطلوب:** لا تزال تحتاج إلى إعداد التصنيف وروم الصوت وروم النص.`,
                ephemeral: true 
            });
        }
    }

    // أمر المسح
    if (commandName === 'reset') {
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️ تأكيد مسح الإعدادات')
            .setDescription('هل أنت متأكد من مسح **كل إعدادات** هذا السيرفر؟\n\n**سيتم:**\n• حذف كل الإعدادات المخصصة\n• البوت سيتوقف عن العمل حتى تقوم بالإعداد من جديد')
            .setFooter({ text: 'اكتب "تأكيد" كرد على هذه الرسالة خلال 30 ثانية' });

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        const reply = await interaction.fetchReply();

        const filter = m => m.author.id === user.id && m.channel.id === interaction.channelId;
        try {
            const collected = await interaction.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                delete serverSettings[guild.id];
                saveSettings(serverSettings);

                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ تم مسح الإعدادات بنجاح')
                    .setDescription('تم حذف كل الإعدادات المخصصة لهذا السيرفر.\n\n**يجب الآن إعادة الإعداد باستخدام:**')
                    .addFields(
                        { name: '1. إعداد التصنيف', value: '`/setup category`', inline: false },
                        { name: '2. إعداد روم الصوت', value: '`/setup voice`', inline: false },
                        { name: '3. إعداد روم النص', value: '`/setup text`', inline: false },
                        { name: '4. إعداد رتبة الإدارة', value: '`/setup role`', inline: false }
                    )
                    .setFooter({ text: 'استخدم /help لعرض كل الأوامر' });

                await interaction.editReply({ embeds: [successEmbed] });
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم مسح الإعدادات.')
                    ]
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // ================ أوامر الحظر والطرد ================

    // أمر ban
    if (commandName === 'ban') {
        if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Ban Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';
        const days = options.getInteger('days') || 0;

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (targetMember.roles.highest.position >= member.roles.highest.position && member.id !== guild.ownerId) {
            return interaction.reply({ 
                content: '❌ **لا يمكنك حظر هذا المستخدم!**\n\nرتبته أعلى أو تساوي رتبتك.',
                ephemeral: true 
            });
        }

        try {
            await targetMember.ban({ 
                deleteMessageSeconds: days * 86400,
                reason: `بواسطة: ${member.user.tag} | السبب: ${reason}`
            });

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔨 تم حظر مستخدم')
                .setDescription(`**تم حظر ${targetUser.tag} بنجاح**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false },
                    { name: '🗑️ حذف الرسائل', value: `${days} يوم`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر ban:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة حظر المستخدم!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر unban
    if (commandName === 'unban') {
        if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Ban Members**.',
                ephemeral: true 
            });
        }

        const userId = options.getString('userid');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await guild.bans.remove(userId, `بواسطة: ${member.user.tag} | السبب: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ تم إلغاء الحظر')
                .setDescription(`**تم إلغاء حظر المستخدم بنجاح**`)
                .addFields(
                    { name: '🆔 المستخدم', value: `\`${userId}\``, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر unban:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إلغاء الحظر!**\n\nتأكد من أن الـ ID صحيح وأن المستخدم محظور بالفعل.',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر kick
    if (commandName === 'kick') {
        if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Kick Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (targetMember.roles.highest.position >= member.roles.highest.position && member.id !== guild.ownerId) {
            return interaction.reply({ 
                content: '❌ **لا يمكنك طرد هذا المستخدم!**\n\nرتبته أعلى أو تساوي رتبتك.',
                ephemeral: true 
            });
        }

        try {
            await targetMember.kick(`بواسطة: ${member.user.tag} | السبب: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle('👢 تم طرد مستخدم')
                .setDescription(`**تم طرد ${targetUser.tag} بنجاح**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر kick:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة طرد المستخدم!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر softban
    if (commandName === 'softban') {
        if (!member.permissions.has(PermissionsBitField.Flags.BanMembers) || !member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحيتي **Ban Members** و **Kick Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';
        const days = options.getInteger('days') || 7;

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (targetMember.roles.highest.position >= member.roles.highest.position && member.id !== guild.ownerId) {
            return interaction.reply({ 
                content: '❌ **لا يمكنك حظر هذا المستخدم!**\n\nرتبته أعلى أو تساوي رتبتك.',
                ephemeral: true 
            });
        }

        try {
            await targetMember.ban({ 
                deleteMessageSeconds: days * 86400,
                reason: `[SOFTBAN] بواسطة: ${member.user.tag} | السبب: ${reason}`
            });

            await guild.bans.remove(targetUser.id, `Softban completed - بواسطة: ${member.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('🔨 تم تطبيق Softban')
                .setDescription(`**تم طرد وحذف رسائل ${targetUser.tag} بنجاح**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false },
                    { name: '🗑️ حذف رسائل', value: `${days} يوم`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر softban:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة تطبيق Softban!**',
                ephemeral: true 
            });
        }
        return;
    }

    // ================ أوامر كتم الصوت ================

    // أمر timeout
    if (commandName === 'timeout') {
        if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Moderate Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const durationSeconds = parseInt(options.getString('duration'));
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (targetMember.roles.highest.position >= member.roles.highest.position && member.id !== guild.ownerId) {
            return interaction.reply({ 
                content: '❌ **لا يمكنك كتم صوت هذا المستخدم!**\n\nرتبته أعلى أو تساوي رتبتك.',
                ephemeral: true 
            });
        }

        if (targetMember.communicationDisabledUntil) {
            return interaction.reply({ 
                content: '❌ **هذا المستخدم مكتوم الصوت بالفعل!**',
                ephemeral: true 
            });
        }

        try {
            await targetMember.timeout(durationSeconds * 1000, `بواسطة: ${member.user.tag} | السبب: ${reason}`);

            let durationText = '';
            if (durationSeconds < 60) durationText = `${durationSeconds} ثانية`;
            else if (durationSeconds < 3600) durationText = `${Math.floor(durationSeconds / 60)} دقيقة`;
            else if (durationSeconds < 86400) durationText = `${Math.floor(durationSeconds / 3600)} ساعة`;
            else durationText = `${Math.floor(durationSeconds / 86400)} يوم`;

            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('🔇 تم كتم صوت مستخدم')
                .setDescription(`**تم كتم صوت ${targetUser.tag} بنجاح**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '⏰ المدة', value: durationText, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر timeout:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة كتم صوت المستخدم!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر untimeout
    if (commandName === 'untimeout') {
        if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Moderate Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (!targetMember.communicationDisabledUntil) {
            return interaction.reply({ 
                content: '❌ **هذا المستخدم ليس مكتوم الصوت!**',
                ephemeral: true 
            });
        }

        try {
            await targetMember.timeout(null, `بواسطة: ${member.user.tag} | السبب: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔊 تم إلغاء كتم الصوت')
                .setDescription(`**تم إلغاء كتم صوت ${targetUser.tag} بنجاح**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر untimeout:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إلغاء كتم الصوت!**',
                ephemeral: true 
            });
        }
        return;
    }

    // ================ أوامر القنوات ================

    // أمر lock
    if (commandName === 'lock') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Channels**.',
                ephemeral: true 
            });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **يمكن قفل القنوات النصية فقط!**',
                ephemeral: true 
            });
        }

        try {
            await targetChannel.permissionOverwrites.edit(guild.id, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔒 تم قفل القناة')
                .setDescription(`**تم قفل القناة ${targetChannel} بنجاح**`)
                .addFields(
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر lock:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة قفل القناة!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر unlock
    if (commandName === 'unlock') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Channels**.',
                ephemeral: true 
            });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **يمكن فتح القنوات النصية فقط!**',
                ephemeral: true 
            });
        }

        try {
            await targetChannel.permissionOverwrites.edit(guild.id, {
                SendMessages: null
            });

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔓 تم فتح القناة')
                .setDescription(`**تم فتح القناة ${targetChannel} بنجاح**`)
                .addFields(
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر unlock:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة فتح القناة!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر hide
    if (commandName === 'hide') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Channels**.',
                ephemeral: true 
            });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await targetChannel.permissionOverwrites.edit(guild.id, {
                ViewChannel: false
            });

            const embed = new EmbedBuilder()
                .setColor(0x95a5a6)
                .setTitle('👁️ تم إخفاء القناة')
                .setDescription(`**تم إخفاء القناة ${targetChannel} عن الأعضاء**`)
                .addFields(
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر hide:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إخفاء القناة!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر show
    if (commandName === 'show') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Channels**.',
                ephemeral: true 
            });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            await targetChannel.permissionOverwrites.edit(guild.id, {
                ViewChannel: null
            });

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('👁️ تم إظهار القناة')
                .setDescription(`**تم إظهار القناة ${targetChannel} للأعضاء**`)
                .addFields(
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر show:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إظهار القناة!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر slowmode
    if (commandName === 'slowmode') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Channels**.',
                ephemeral: true 
            });
        }

        const seconds = options.getInteger('seconds');
        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **يمكن تفعيل الوضع البطيء في القنوات النصية فقط!**',
                ephemeral: true 
            });
        }

        try {
            await targetChannel.setRateLimitPerUser(seconds, reason);

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('⏱️ تم تعديل الوضع البطيء')
                .setDescription(`**تم ${seconds === 0 ? 'تعطيل' : 'تفعيل'} الوضع البطيء في ${targetChannel}**`)
                .addFields(
                    { name: '⏱️ المدة', value: seconds === 0 ? 'معطل' : `${seconds} ثانية`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر slowmode:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة تعديل الوضع البطيء!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر clone
    if (commandName === 'clone') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Channels**.',
                ephemeral: true 
            });
        }

        const targetChannel = options.getChannel('channel');
        const newName = options.getString('name');

        try {
            const clonedChannel = await targetChannel.clone();

            if (newName) {
                await clonedChannel.setName(newName);
            }

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('📋 تم نسخ القناة')
                .setDescription(`**تم نسخ القناة ${targetChannel} بنجاح**`)
                .addFields(
                    { name: '📋 القناة الأصلية', value: `${targetChannel.name} (<#${targetChannel.id}>)`, inline: true },
                    { name: '🆕 القناة الجديدة', value: `${clonedChannel.name} (<#${clonedChannel.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر clone:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة نسخ القناة!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر nuke
    if (commandName === 'nuke') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Channels**.',
                ephemeral: true 
            });
        }

        const targetChannel = options.getChannel('channel') || interaction.channel;
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **يمكن تنظيف القنوات النصية فقط!**',
                ephemeral: true 
            });
        }

        // رسالة تأكيد
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️⚠️ تحذير شديد الخطورة ⚠️⚠️')
            .setDescription(`**هل أنت متأكد من تنظيف القناة ${targetChannel}؟**\n\n**سيتم:**\n• حذف كل الرسائل\n• إنشاء نسخة جديدة من القناة\n• لا يمكن التراجع عن هذه العملية`)
            .setFooter({ text: 'اكتب "تأكيد" خلال 30 ثانية للمتابعة' });

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        const reply = await interaction.fetchReply();

        const filter = m => m.author.id === user.id && m.channel.id === interaction.channelId;
        try {
            const collected = await interaction.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('🔄 جاري تنظيف القناة...')
                            .setDescription('جاري إنشاء نسخة جديدة...')
                    ]
                });

                const position = targetChannel.position;
                const clonedChannel = await targetChannel.clone({
                    reason: `Nuked by ${member.user.tag} | السبب: ${reason}`
                });

                await targetChannel.delete(`Nuked by ${member.user.tag} | السبب: ${reason}`);
                await clonedChannel.setPosition(position);

                const nukeEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('🧹 تم تنظيف القناة')
                    .setDescription(`**تم تنظيف القناة بنجاح**`)
                    .addFields(
                        { name: '🆕 القناة الجديدة', value: `${clonedChannel}`, inline: true },
                        { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                        { name: '📝 السبب', value: reason, inline: false }
                    )
                    .setImage('https://media.tenor.com/gRqr-8EvS9EAAAAC/cleaning- clean.gif')
                    .setTimestamp();

                await clonedChannel.send({ embeds: [nukeEmbed] });

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x2ecc71)
                            .setTitle('✅ تم تنظيف القناة بنجاح!')
                            .setDescription(`تم تنظيف القناة وإنشاء نسخة جديدة: ${clonedChannel}`)
                    ]
                });
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم تنظيف القناة.')
                    ]
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // ================ أوامر المعلومات ================

    // أمر userinfo
    if (commandName === 'userinfo') {
        const targetUser = options.getUser('user') || user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        const roles = targetMember.roles.cache
            .filter(role => role.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => `<@&${role.id}>`)
            .join(', ') || 'لا يوجد رتب';

        const permissions = targetMember.permissions.toArray()
            .map(perm => perm.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' '))
            .join(', ') || 'لا يوجد صلاحيات خاصة';

        const embed = new EmbedBuilder()
            .setColor(targetMember.displayHexColor || 0x3498db)
            .setTitle(`ℹ️ معلومات ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '👤 اسم المستخدم', value: targetUser.tag, inline: true },
                { name: '🆔 ID', value: targetUser.id, inline: true },
                { name: '🤖 بوت؟', value: targetUser.bot ? 'نعم' : 'لا', inline: true },
                { name: '📅 تاريخ الانضمام للسيرفر', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`, inline: true },
                { name: '📅 تاريخ إنشاء الحساب', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '🎭 أعلى رتبة', value: `${targetMember.roles.highest}`, inline: true },
                { name: `🎭 الرتب (${targetMember.roles.cache.size - 1})`, value: roles.slice(0, 1024), inline: false },
                { name: '🔑 الصلاحيات المميزة', value: permissions.slice(0, 1024) || 'لا يوجد', inline: false }
            )
            .setFooter({ text: `طلب بواسطة: ${user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر serverinfo
    if (commandName === 'serverinfo') {
        const owner = await guild.fetchOwner();

        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const totalChannels = guild.channels.cache.size;

        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = guild.members.cache.filter(m => !m.user.bot).size;

        const roles = guild.roles.cache.size;
        const emojis = guild.emojis.cache.size;
        const boosts = guild.premiumSubscriptionCount || 0;

        const verificationLevels = {
            0: 'لا يوجد',
            1: 'منخفض',
            2: 'متوسط',
            3: 'عالي',
            4: 'عالي جداً'
        };

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`ℹ️ معلومات السيرفر: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '📛 اسم السيرفر', value: guild.name, inline: true },
                { name: '🆔 ID', value: guild.id, inline: true },
                { name: '👑 المالك', value: `${owner.user.tag}\n<@${owner.id}>`, inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '📅 تاريخ دخول البوت', value: `<t:${Math.floor(guild.joinedTimestamp / 1000)}:F>`, inline: true },
                { name: '🔐 مستوى التحقق', value: verificationLevels[guild.verificationLevel] || 'غير معروف', inline: true },
                { name: '👥 الأعضاء', value: `👤 البشر: ${humans}\n🤖 البوتات: ${bots}\n📊 الإجمالي: ${guild.memberCount}`, inline: true },
                { name: '📊 القنوات', value: `📁 تصنيفات: ${categories}\n💬 نصية: ${textChannels}\n🔊 صوتية: ${voiceChannels}\n📊 الإجمالي: ${totalChannels}`, inline: true },
                { name: '🎭 الرتب', value: `${roles} رتبة`, inline: true },
                { name: '😀 الرموز', value: `${emojis} رمز`, inline: true },
                { name: '🚀 البوستات', value: `${boosts} Boost`, inline: true }
            )
            .setFooter({ text: `طلب بواسطة: ${user.tag}` })
            .setTimestamp();

        if (guild.banner) {
            embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
        }

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر avatar
    if (commandName === 'avatar') {
        const targetUser = options.getUser('user') || user;

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`🖼️ صورة ${targetUser.tag}`)
            .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: 'رابط الصورة', value: `[PNG](${targetUser.displayAvatarURL({ extension: 'png', size: 1024 })}) | [JPG](${targetUser.displayAvatarURL({ extension: 'jpg', size: 1024 })}) | [WEBP](${targetUser.displayAvatarURL({ extension: 'webp', size: 1024 })})` }
            )
            .setFooter({ text: `طلب بواسطة: ${user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر ping
    if (commandName === 'ping') {
        const sent = await interaction.reply({ 
            content: '🏓 جاري قياس السرعة...', 
            fetchReply: true 
        });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor(latency < 200 ? 0x2ecc71 : latency < 500 ? 0xf39c12 : 0xe74c3c)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📊 زمن الاستجابة', value: `\`${latency}ms\``, inline: true },
                { name: '🌐 زمن الـ API', value: `\`${apiLatency}ms\``, inline: true }
            )
            .setFooter({ text: `طلب بواسطة: ${user.tag}` })
            .setTimestamp();

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
            .setTitle('⏰ مدة تشغيل البوت')
            .setDescription(`**البوت يعمل منذ:** <t:${Math.floor(client.readyTimestamp / 1000)}:F>`)
            .addFields(
                { name: '📊 المدة', value: `${days} يوم, ${hours} ساعة, ${minutes} دقيقة, ${seconds} ثانية`, inline: false },
                { name: '🏠 السيرفرات', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 المستخدمين', value: `${client.users.cache.size}`, inline: true }
            )
            .setFooter({ text: `طلب بواسطة: ${user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // أمر say
    if (commandName === 'say') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Messages**.',
                ephemeral: true 
            });
        }

        const messageContent = options.getString('message');
        const targetChannel = options.getChannel('channel') || interaction.channel;

        try {
            await targetChannel.send(messageContent);

            await interaction.reply({ 
                content: `✅ تم إرسال الرسالة بنجاح إلى ${targetChannel}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('❌ خطأ في أمر say:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إرسال الرسالة!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر embed
    if (commandName === 'embed') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Messages**.',
                ephemeral: true 
            });
        }

        const title = options.getString('title');
        const description = options.getString('description');
        const color = options.getString('color') || '#3498db';
        const footer = options.getString('footer');
        const targetChannel = options.getChannel('channel') || interaction.channel;

        const embed = new EmbedBuilder()
            .setDescription(description)
            .setColor(color);

        if (title) embed.setTitle(title);
        if (footer) embed.setFooter({ text: footer });

        embed.setTimestamp();

        try {
            await targetChannel.send({ embeds: [embed] });

            await interaction.reply({ 
                content: `✅ تم إرسال الـ Embed بنجاح إلى ${targetChannel}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('❌ خطأ في أمر embed:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إرسال الـ Embed!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر poll
    if (commandName === 'poll') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Messages**.',
                ephemeral: true 
            });
        }

        const question = options.getString('question');
        const option1 = options.getString('option1');
        const option2 = options.getString('option2');
        const option3 = options.getString('option3');
        const option4 = options.getString('option4');
        const targetChannel = options.getChannel('channel') || interaction.channel;

        const optionsList = [option1, option2];
        if (option3) optionsList.push(option3);
        if (option4) optionsList.push(option4);

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        let description = `**${question}**\n\n`;
        optionsList.forEach((opt, i) => {
            description += `${emojis[i]} ${opt}\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📊 استفتاء')
            .setDescription(description)
            .setFooter({ text: `تم الإنشاء بواسطة: ${member.user.tag}` })
            .setTimestamp();

        try {
            const pollMessage = await targetChannel.send({ embeds: [embed] });

            for (let i = 0; i < optionsList.length; i++) {
                await pollMessage.react(emojis[i]);
            }

            await interaction.reply({ 
                content: `✅ تم إنشاء الاستفتاء بنجاح في ${targetChannel}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('❌ خطأ في أمر poll:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إنشاء الاستفتاء!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر announce
    if (commandName === 'announce') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Administrator**.',
                ephemeral: true 
            });
        }

        const targetChannel = options.getChannel('channel');
        const title = options.getString('title');
        const message = options.getString('message');
        const color = options.getString('color') || '#FFFFFF';
        const ping = options.getBoolean('ping') || false;

        const embed = new EmbedBuilder()
            .setDescription(message)
            .setColor(color)
            .setTimestamp();

        if (title) embed.setTitle(title);

        try {
            const content = ping ? '@everyone' : '';
            await targetChannel.send({ content, embeds: [embed] });

            await interaction.reply({ 
                content: `✅ تم إرسال الإعلان بنجاح إلى ${targetChannel}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('❌ خطأ في أمر announce:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إرسال الإعلان!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر purge
    if (commandName === 'purge') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Messages**.',
                ephemeral: true 
            });
        }

        const amount = options.getInteger('amount');
        const targetUser = options.getUser('user');
        const contains = options.getString('contains');
        const targetChannel = options.getChannel('channel') || interaction.channel;

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **يمكن حذف الرسائل من القنوات النصية فقط!**',
                ephemeral: true 
            });
        }

        try {
            let messages = await targetChannel.messages.fetch({ limit: 100 });

            if (targetUser) {
                messages = messages.filter(m => m.author.id === targetUser.id);
            }

            if (contains) {
                messages = messages.filter(m => m.content.includes(contains));
            }

            messages = messages.first(amount);

            if (messages.length === 0) {
                return interaction.reply({ 
                    content: '❌ **لا توجد رسائل تطابق المعايير المحددة!**',
                    ephemeral: true 
                });
            }

            await targetChannel.bulkDelete(messages, true);

            await interaction.reply({ 
                content: `✅ تم حذف **${messages.length}** رسالة بنجاح من ${targetChannel}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('❌ خطأ في أمر purge:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة حذف الرسائل!**\n\nتأكد أن الرسائل ليست أقدم من 14 يوم.',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر purgebot
    if (commandName === 'purgebot') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Messages**.',
                ephemeral: true 
            });
        }

        const amount = options.getInteger('amount');
        const targetChannel = options.getChannel('channel') || interaction.channel;

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **يمكن حذف الرسائل من القنوات النصية فقط!**',
                ephemeral: true 
            });
        }

        try {
            const messages = await targetChannel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(m => m.author.bot).first(amount);

            if (botMessages.length === 0) {
                return interaction.reply({ 
                    content: '❌ **لا توجد رسائل بوتات!**',
                    ephemeral: true 
                });
            }

            await targetChannel.bulkDelete(botMessages, true);

            await interaction.reply({ 
                content: `✅ تم حذف **${botMessages.length}** رسالة بوت بنجاح من ${targetChannel}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('❌ خطأ في أمر purgebot:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة حذف الرسائل!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر purgeuser
    if (commandName === 'purgeuser') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Messages**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const amount = options.getInteger('amount');
        const targetChannel = options.getChannel('channel') || interaction.channel;

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **يمكن حذف الرسائل من القنوات النصية فقط!**',
                ephemeral: true 
            });
        }

        try {
            const messages = await targetChannel.messages.fetch({ limit: 100 });
            const userMessages = messages.filter(m => m.author.id === targetUser.id).first(amount);

            if (userMessages.length === 0) {
                return interaction.reply({ 
                    content: `❌ **لا توجد رسائل لـ ${targetUser.tag}!**`,
                    ephemeral: true 
                });
            }

            await targetChannel.bulkDelete(userMessages, true);

            await interaction.reply({ 
                content: `✅ تم حذف **${userMessages.length}** رسالة لـ ${targetUser.tag} بنجاح من ${targetChannel}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('❌ خطأ في أمر purgeuser:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة حذف الرسائل!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر purgeattachments
    if (commandName === 'purgeattachments') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Messages**.',
                ephemeral: true 
            });
        }

        const amount = options.getInteger('amount');
        const targetChannel = options.getChannel('channel') || interaction.channel;

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ **يمكن حذف الرسائل من القنوات النصية فقط!**',
                ephemeral: true 
            });
        }

        try {
            const messages = await targetChannel.messages.fetch({ limit: 100 });
            const attachmentMessages = messages.filter(m => m.attachments.size > 0).first(amount);

            if (attachmentMessages.length === 0) {
                return interaction.reply({ 
                    content: '❌ **لا توجد رسائل تحتوي على مرفقات!**',
                    ephemeral: true 
                });
            }

            await targetChannel.bulkDelete(attachmentMessages, true);

            await interaction.reply({ 
                content: `✅ تم حذف **${attachmentMessages.length}** رسالة تحتوي على مرفقات بنجاح من ${targetChannel}`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('❌ خطأ في أمر purgeattachments:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة حذف الرسائل!**',
                ephemeral: true 
            });
        }
        return;
    }

    // ================ أوامر الصوت ================

    // أمر vcmute
    if (commandName === 'vcmute') {
        if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Mute Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (!targetMember.voice.channel) {
            return interaction.reply({ 
                content: '❌ **المستخدم ليس في روم صوتي!**',
                ephemeral: true 
            });
        }

        if (targetMember.voice.serverMute) {
            return interaction.reply({ 
                content: '❌ **المستخدم مكتوم الصوت بالفعل!**',
                ephemeral: true 
            });
        }

        try {
            await targetMember.voice.setMute(true, reason);

            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('🔇 تم كتم صوت المستخدم')
                .setDescription(`**تم كتم صوت ${targetUser.tag} في الروم الصوتي**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر vcmute:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة كتم صوت المستخدم!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر vcunmute
    if (commandName === 'vcunmute') {
        if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Mute Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (!targetMember.voice.channel) {
            return interaction.reply({ 
                content: '❌ **المستخدم ليس في روم صوتي!**',
                ephemeral: true 
            });
        }

        if (!targetMember.voice.serverMute) {
            return interaction.reply({ 
                content: '❌ **المستخدم ليس مكتوم الصوت!**',
                ephemeral: true 
            });
        }

        try {
            await targetMember.voice.setMute(false, reason);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔊 تم إلغاء كتم الصوت')
                .setDescription(`**تم إلغاء كتم صوت ${targetUser.tag} في الروم الصوتي**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر vcunmute:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إلغاء كتم الصوت!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر vcdeafen
    if (commandName === 'vcdeafen') {
        if (!member.permissions.has(PermissionsBitField.Flags.DeafenMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Deafen Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (!targetMember.voice.channel) {
            return interaction.reply({ 
                content: '❌ **المستخدم ليس في روم صوتي!**',
                ephemeral: true 
            });
        }

        if (targetMember.voice.serverDeaf) {
            return interaction.reply({ 
                content: '❌ **المستخدم معطل السماع بالفعل!**',
                ephemeral: true 
            });
        }

        try {
            await targetMember.voice.setDeaf(true, reason);

            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setTitle('🔇 تم تعطيل السماع')
                .setDescription(`**تم تعطيل السماع لـ ${targetUser.tag} في الروم الصوتي**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر vcdeafen:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة تعطيل السماع!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر vcundeafen
    if (commandName === 'vcundeafen') {
        if (!member.permissions.has(PermissionsBitField.Flags.DeafenMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Deafen Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (!targetMember.voice.channel) {
            return interaction.reply({ 
                content: '❌ **المستخدم ليس في روم صوتي!**',
                ephemeral: true 
            });
        }

        if (!targetMember.voice.serverDeaf) {
            return interaction.reply({ 
                content: '❌ **المستخدم ليس معطل السماع!**',
                ephemeral: true 
            });
        }

        try {
            await targetMember.voice.setDeaf(false, reason);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔊 تم إلغاء تعطيل السماع')
                .setDescription(`**تم إلغاء تعطيل السماع لـ ${targetUser.tag} في الروم الصوتي**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر vcundeafen:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إلغاء تعطيل السماع!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر vckick
    if (commandName === 'vckick') {
        if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Move Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (!targetMember.voice.channel) {
            return interaction.reply({ 
                content: '❌ **المستخدم ليس في روم صوتي!**',
                ephemeral: true 
            });
        }

        try {
            await targetMember.voice.disconnect(reason);

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('👢 تم طرد المستخدم من الروم الصوتي')
                .setDescription(`**تم طرد ${targetUser.tag} من الروم الصوتي**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر vckick:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة طرد المستخدم من الروم الصوتي!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر vcmove
    if (commandName === 'vcmove') {
        if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Move Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const targetChannel = options.getChannel('channel');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        if (targetChannel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ 
                content: '❌ **الروم المستهدف يجب أن يكون روم صوتي!**',
                ephemeral: true 
            });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (!targetMember.voice.channel) {
            return interaction.reply({ 
                content: '❌ **المستخدم ليس في روم صوتي!**',
                ephemeral: true 
            });
        }

        if (targetMember.voice.channel.id === targetChannel.id) {
            return interaction.reply({ 
                content: '❌ **المستخدم موجود بالفعل في هذا الروم!**',
                ephemeral: true 
            });
        }

        try {
            await targetMember.voice.setChannel(targetChannel, reason);

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🚚 تم نقل المستخدم')
                .setDescription(`**تم نقل ${targetUser.tag} إلى ${targetChannel}**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر vcmove:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة نقل المستخدم!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر vcdisconnect
    if (commandName === 'vcdisconnect') {
        if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Move Members**.',
                ephemeral: true 
            });
        }

        const targetChannel = options.getChannel('channel');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        let channel;
        if (targetChannel) {
            if (targetChannel.type !== ChannelType.GuildVoice) {
                return interaction.reply({ 
                    content: '❌ **الروم المستهدف يجب أن يكون روم صوتي!**',
                    ephemeral: true 
                });
            }
            channel = targetChannel;
        } else {
            if (!member.voice.channel) {
                return interaction.reply({ 
                    content: '❌ **يجب تحديد روم صوتي أو أن تكون في روم صوتي!**',
                    ephemeral: true 
                });
            }
            channel = member.voice.channel;
        }

        const members = channel.members.filter(m => !m.user.bot);

        if (members.size === 0) {
            return interaction.reply({ 
                content: '❌ **لا يوجد أعضاء في هذا الروم الصوتي!**',
                ephemeral: true 
            });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️ تأكيد فصل الأعضاء')
            .setDescription(`**هل أنت متأكد من فصل ${members.size} عضو من ${channel}؟**`)
            .setFooter({ text: 'اكتب "تأكيد" خلال 30 ثانية للمتابعة' });

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        const reply = await interaction.fetchReply();

        const filter = m => m.author.id === user.id && m.channel.id === interaction.channelId;
        try {
            const collected = await interaction.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('🔄 جاري فصل الأعضاء...')
                            .setDescription(`جاري فصل ${members.size} عضو...`)
                    ]
                });

                let successCount = 0;
                let failCount = 0;

                for (const [memberId, member] of members) {
                    try {
                        await member.voice.disconnect(reason);
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ تم فصل الأعضاء')
                    .setDescription(`**تم فصل الأعضاء من ${channel} بنجاح**`)
                    .addFields(
                        { name: '✅ تم فصل', value: `${successCount} عضو`, inline: true },
                        { name: '❌ فشل فصل', value: `${failCount} عضو`, inline: true },
                        { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                        { name: '📝 السبب', value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [resultEmbed] });
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم فصل الأعضاء.')
                    ]
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // ================ أوامر التحذيرات ================

    // أمر warn
    if (commandName === 'warn') {
        if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Moderate Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason');

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (!warnings.has(guild.id)) {
            warnings.set(guild.id, new Map());
        }

        const guildWarnings = warnings.get(guild.id);

        if (!guildWarnings.has(targetUser.id)) {
            guildWarnings.set(targetUser.id, []);
        }

        const userWarnings = guildWarnings.get(targetUser.id);
        const warnId = Date.now().toString();

        userWarnings.push({
            id: warnId,
            moderator: member.user.tag,
            moderatorId: member.id,
            reason: reason,
            date: new Date().toISOString()
        });

        const embed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('⚠️ تم تحذير مستخدم')
            .setDescription(`**تم تحذير ${targetUser.tag}**`)
            .addFields(
                { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                { name: '📊 عدد التحذيرات', value: `${userWarnings.length}`, inline: true },
                { name: '📝 السبب', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        try {
            await targetUser.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xf39c12)
                        .setTitle('⚠️ لقد تلقيت تحذيراً')
                        .setDescription(`**لقد تم تحذيرك في سيرفر ${guild.name}**`)
                        .addFields(
                            { name: '📝 السبب', value: reason, inline: false },
                            { name: '👑 بواسطة', value: member.user.tag, inline: true },
                            { name: '📊 رقم التحذير', value: `${userWarnings.length}`, inline: true }
                        )
                        .setTimestamp()
                ]
            });
        } catch (error) {
            // تجاهل الخطأ إذا كان المستخدم مغلق الخاص
        }
        return;
    }

    // أمر warnings
    if (commandName === 'warnings') {
        if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Moderate Members**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');

        if (!warnings.has(guild.id)) {
            return interaction.reply({ 
                content: `✅ **لا توجد تحذيرات لـ ${targetUser.tag}**`,
                ephemeral: true 
            });
        }

        const guildWarnings = warnings.get(guild.id);
        const userWarnings = guildWarnings.get(targetUser.id) || [];

        if (userWarnings.length === 0) {
            return interaction.reply({ 
                content: `✅ **لا توجد تحذيرات لـ ${targetUser.tag}**`,
                ephemeral: true 
            });
        }

        const warningsList = userWarnings.map((w, i) => {
            const date = new Date(w.date);
            return `**${i + 1}.** ⚠️ تحذير ID: \`${w.id}\`\n👑 بواسطة: ${w.moderator}\n📝 السبب: ${w.reason}\n📅 التاريخ: <t:${Math.floor(date.getTime() / 1000)}:F>\n`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle(`⚠️ تحذيرات ${targetUser.tag}`)
            .setDescription(warningsList.slice(0, 4096))
            .addFields(
                { name: '📊 إجمالي التحذيرات', value: `${userWarnings.length}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // أمر clearwarns
    if (commandName === 'clearwarns') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Administrator**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');

        if (!warnings.has(guild.id)) {
            return interaction.reply({ 
                content: `✅ **لا توجد تحذيرات لـ ${targetUser.tag}**`,
                ephemeral: true 
            });
        }

        const guildWarnings = warnings.get(guild.id);

        if (!guildWarnings.has(targetUser.id)) {
            return interaction.reply({ 
                content: `✅ **لا توجد تحذيرات لـ ${targetUser.tag}**`,
                ephemeral: true 
            });
        }

        guildWarnings.delete(targetUser.id);

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ تم مسح التحذيرات')
            .setDescription(`**تم مسح جميع تحذيرات ${targetUser.tag}**`)
            .addFields(
                { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // ================ أوامر الأسماء ================

    // أمر nick
    if (commandName === 'nick') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Nicknames**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const nickname = options.getString('nickname');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (targetMember.roles.highest.position >= member.roles.highest.position && member.id !== guild.ownerId) {
            return interaction.reply({ 
                content: '❌ **لا يمكنك تغيير اسم هذا المستخدم!**\n\nرتبته أعلى أو تساوي رتبتك.',
                ephemeral: true 
            });
        }

        try {
            const oldNickname = targetMember.nickname || targetUser.username;
            await targetMember.setNickname(nickname, reason);

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('📛 تم تغيير الاسم')
                .setDescription(`**تم تغيير اسم ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '📛 الاسم القديم', value: oldNickname, inline: true },
                    { name: '📛 الاسم الجديد', value: nickname, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر nick:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة تغيير الاسم!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر resetnick
    if (commandName === 'resetnick') {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Manage Nicknames**.',
                ephemeral: true 
            });
        }

        const targetUser = options.getUser('user');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ 
                content: '❌ **المستخدم غير موجود في السيرفر!**',
                ephemeral: true 
            });
        }

        if (targetMember.roles.highest.position >= member.roles.highest.position && member.id !== guild.ownerId) {
            return interaction.reply({ 
                content: '❌ **لا يمكنك إعادة اسم هذا المستخدم!**\n\nرتبته أعلى أو تساوي رتبتك.',
                ephemeral: true 
            });
        }

        try {
            await targetMember.setNickname(null, reason);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('📛 تم إعادة الاسم الأصلي')
                .setDescription(`**تم إعادة الاسم الأصلي لـ ${targetUser.tag}**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر resetnick:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إعادة الاسم الأصلي!**',
                ephemeral: true 
            });
        }
        return;
    }

    // ================ أوامر متقدمة ================

    // أمر moveall
    if (commandName === 'moveall') {
        if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Move Members**.',
                ephemeral: true 
            });
        }

        const fromChannel = options.getChannel('from');
        const toChannel = options.getChannel('to');
        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        if (fromChannel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ 
                content: '❌ **الروم المصدر يجب أن يكون روم صوتي!**',
                ephemeral: true 
            });
        }

        if (toChannel.type !== ChannelType.GuildVoice) {
            return interaction.reply({ 
                content: '❌ **الروم الهدف يجب أن يكون روم صوتي!**',
                ephemeral: true 
            });
        }

        const members = fromChannel.members.filter(m => !m.user.bot);

        if (members.size === 0) {
            return interaction.reply({ 
                content: '❌ **لا يوجد أعضاء في الروم المصدر!**',
                ephemeral: true 
            });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️ تأكيد نقل الأعضاء')
            .setDescription(`**هل أنت متأكد من نقل ${members.size} عضو من ${fromChannel} إلى ${toChannel}؟**`)
            .setFooter({ text: 'اكتب "تأكيد" خلال 30 ثانية للمتابعة' });

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        const reply = await interaction.fetchReply();

        const filter = m => m.author.id === user.id && m.channel.id === interaction.channelId;
        try {
            const collected = await interaction.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('🔄 جاري نقل الأعضاء...')
                            .setDescription(`جاري نقل ${members.size} عضو...`)
                    ]
                });

                let successCount = 0;
                let failCount = 0;

                for (const [memberId, member] of members) {
                    try {
                        await member.voice.setChannel(toChannel, reason);
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ تم نقل الأعضاء')
                    .setDescription(`**تم نقل الأعضاء من ${fromChannel} إلى ${toChannel} بنجاح**`)
                    .addFields(
                        { name: '✅ تم نقل', value: `${successCount} عضو`, inline: true },
                        { name: '❌ فشل نقل', value: `${failCount} عضو`, inline: true },
                        { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                        { name: '📝 السبب', value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [resultEmbed] });
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم نقل الأعضاء.')
                    ]
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // أمر voicekickall
    if (commandName === 'voicekickall') {
        if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Move Members**.',
                ephemeral: true 
            });
        }

        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        // جلب كل الأعضاء في الرومات الصوتية
        const membersInVoice = [];
        guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).forEach(channel => {
            channel.members.forEach(member => {
                if (!member.user.bot) {
                    membersInVoice.push(member);
                }
            });
        });

        if (membersInVoice.length === 0) {
            return interaction.reply({ 
                content: '❌ **لا يوجد أعضاء في الرومات الصوتية!**',
                ephemeral: true 
            });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️ تأكيد طرد الكل من الصوت')
            .setDescription(`**هل أنت متأكد من طرد ${membersInVoice.length} عضو من الرومات الصوتية؟**`)
            .setFooter({ text: 'اكتب "تأكيد" خلال 30 ثانية للمتابعة' });

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        const reply = await interaction.fetchReply();

        const filter = m => m.author.id === user.id && m.channel.id === interaction.channelId;
        try {
            const collected = await interaction.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('🔄 جاري طرد الأعضاء...')
                            .setDescription(`جاري طرد ${membersInVoice.length} عضو من الرومات الصوتية...`)
                    ]
                });

                let successCount = 0;
                let failCount = 0;

                for (const targetMember of membersInVoice) {
                    try {
                        await targetMember.voice.disconnect(reason);
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ تم طرد الأعضاء')
                    .setDescription(`**تم طرد الأعضاء من الرومات الصوتية بنجاح**`)
                    .addFields(
                        { name: '✅ تم طرد', value: `${successCount} عضو`, inline: true },
                        { name: '❌ فشل طرد', value: `${failCount} عضو`, inline: true },
                        { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                        { name: '📝 السبب', value: reason, inline: false }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [resultEmbed] });
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم طرد الأعضاء.')
                    ]
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }

    // أمر serverlock
    if (commandName === 'serverlock') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Administrator**.',
                ephemeral: true 
            });
        }

        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            // تعطيل إنشاء الدعوات
            await guild.setInvitesDisabled(true, reason);

            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔒 تم قفل السيرفر')
                .setDescription(`**تم قفل السيرفر ${guild.name}**\n\nتم تعطيل إنشاء الدعوات الجديدة.`)
                .addFields(
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر serverlock:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة قفل السيرفر!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر serverunlock
    if (commandName === 'serverunlock') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Administrator**.',
                ephemeral: true 
            });
        }

        const reason = options.getString('reason') || 'لم يتم تحديد سبب';

        try {
            // تفعيل إنشاء الدعوات
            await guild.setInvitesDisabled(false, reason);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🔓 تم فتح السيرفر')
                .setDescription(`**تم فتح السيرفر ${guild.name}**\n\nتم تفعيل إنشاء الدعوات الجديدة.`)
                .addFields(
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر serverunlock:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة فتح السيرفر!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر backup
    if (commandName === 'backup') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Administrator**.',
                ephemeral: true 
            });
        }

        try {
            const backupId = Date.now().toString();

            // جمع بيانات السيرفر
            const backupData = {
                id: backupId,
                guildId: guild.id,
                name: guild.name,
                createdAt: new Date().toISOString(),
                createdBy: member.user.tag,
                settings: serverSettings[guild.id] || {},
                channels: guild.channels.cache.map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    parentId: ch.parentId,
                    position: ch.position
                })),
                roles: guild.roles.cache.map(r => ({
                    id: r.id,
                    name: r.name,
                    color: r.color,
                    hoist: r.hoist,
                    position: r.position,
                    permissions: r.permissions.toArray()
                })).filter(r => r.id !== guild.id)
            };

            // تخزين النسخة
            if (!backups.has(guild.id)) {
                backups.set(guild.id, []);
            }
            backups.get(guild.id).push(backupData);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('💾 تم إنشاء نسخة احتياطية')
                .setDescription(`**تم إنشاء نسخة احتياطية للسيرفر ${guild.name}**`)
                .addFields(
                    { name: '🆔 ID النسخة', value: `\`${backupId}\``, inline: true },
                    { name: '👑 تم الإنشاء بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📅 التاريخ', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
                    { name: '📊 محتويات النسخة', value: `• القنوات: ${backupData.channels.length}\n• الرتب: ${backupData.roles.length}`, inline: false }
                )
                .setFooter({ text: 'استخدم /restore لاستعادة النسخة' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ خطأ في أمر backup:', error);
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة إنشاء نسخة احتياطية!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر restore
    if (commandName === 'restore') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**\n\nأنت بحاجة إلى صلاحية **Administrator**.',
                ephemeral: true 
            });
        }

        const backupId = options.getString('backupid');

        if (!backups.has(guild.id)) {
            return interaction.reply({ 
                content: '❌ **لا توجد نسخ احتياطية لهذا السيرفر!**',
                ephemeral: true 
            });
        }

        const guildBackups = backups.get(guild.id);
        const backup = guildBackups.find(b => b.id === backupId);

        if (!backup) {
            return interaction.reply({ 
                content: `❌ **لا توجد نسخة احتياطية بالـ ID: \`${backupId}\`**`,
                ephemeral: true 
            });
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('⚠️⚠️ تحذير شديد الخطورة ⚠️⚠️')
            .setDescription(`**هل أنت متأكد من استعادة النسخة الاحتياطية \`${backupId}\`؟**\n\n**سيتم:**\n• استعادة إعدادات السيرفر\n• لا يمكن التراجع عن هذه العملية`)
            .addFields({
                name: '📊 معلومات النسخة',
                value: `• تاريخ الإنشاء: <t:${Math.floor(new Date(backup.createdAt).getTime() / 1000)}:F>\n• تم الإنشاء بواسطة: ${backup.createdBy}`
            })
            .setFooter({ text: 'اكتب "تأكيد" خلال 30 ثانية للمتابعة' });

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        const reply = await interaction.fetchReply();

        const filter = m => m.author.id === user.id && m.channel.id === interaction.channelId;
        try {
            const collected = await interaction.channel.awaitMessages({ 
                filter, 
                max: 1, 
                time: 30000, 
                errors: ['time'] 
            });

            if (collected.first().content === 'تأكيد') {
                // استعادة الإعدادات
                if (backup.settings) {
                    serverSettings[guild.id] = backup.settings;
                    saveSettings(serverSettings);
                }

                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ تم استعادة النسخة الاحتياطية')
                    .setDescription(`**تم استعادة النسخة الاحتياطية \`${backupId}\` بنجاح**`)
                    .addFields(
                        { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                        { name: '📅 التاريخ', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf39c12)
                            .setTitle('❌ تم إلغاء العملية')
                            .setDescription('لم يتم استعادة النسخة الاحتياطية.')
                    ]
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x95a5a6)
                        .setTitle('⏰ انتهى الوقت')
                        .setDescription('لم يتم الرد في الوقت المحدد.')
                ]
            });
        }
        return;
    }
});

// ================ نظام الصوت الأساسي ================

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const member = newState.member;
        if (!member || member.user.bot) return;

        const guildId = newState.guild.id;
        const settings = getServerSettings(guildId);

        // إذا النظام غير مكتمل، تجاهل
        if (!isServerSetupComplete(guildId)) {
            return;
        }

        const supportVoiceId = settings.voiceId;
        const supportTextId = settings.textId;
        const supportCategoryId = settings.categoryId;
        const adminRoleId = settings.adminRoleId;

        const voiceChannel = newState.channel;

        // دخول روم الانتظار
        if (newState.channelId === supportVoiceId && newState.channelId !== oldState.channelId) {
            // لو دخل شخص معاه الرتبة المحددة
            if (member.roles.cache.has(adminRoleId)) {
                console.log(`👑 ${member.user.tag} (إدارة) دخل روم الانتظار`);

                const clientsInRoom = voiceChannel.members.filter(m => 
                    !m.user.bot && !m.roles.cache.has(adminRoleId)
                );

                // لكل عميل في روم الانتظار
                for (const clientMember of clientsInRoom.values()) {
                    const clientId = clientMember.id;
                    const callData = activeCalls.get(clientId);

                    if (callData && !callData.hasAdmin && !callData.privateRoomId) {
                        console.log(`🔄 بدء عملية إنشاء روم خاص للعميل ${clientMember.user.tag}`);

                        // 1. أوقف الموسيقى للعميل
                        callData.isBotMuted = true;
                        if (callData.musicPlayer) {
                            callData.musicPlayer.stop();
                        }

                        // 2. إرسال إشعار استلام الطلب
                        await sendAdminAcceptNotification(
                            voiceChannel.guild,
                            settings,
                            clientId,
                            member.id,
                            member.user.tag,
                            clientMember.user.tag
                        );

                        // 3. إنشاء روم صوتي خاص
                        const privateRoom = await createPrivateVoiceRoom(
                            voiceChannel.guild,
                            settings,
                            clientId,
                            clientMember.user.username,
                            member.id,
                            member.user.tag
                        );

                        if (privateRoom) {
                            // 4. حفظ بيانات الروم الخاص
                            callData.privateRoomId = privateRoom.id;
                            callData.privateRoomName = privateRoom.name;
                            callData.lastAdminId = member.id;
                            callData.hasAdmin = true;
                            callData.callStartTime = Date.now();
                            callData.adminName = member.user.tag;

                            privateRooms.set(privateRoom.id, {
                                clientId: clientId,
                                clientName: clientMember.user.tag,
                                adminId: member.id,
                                adminName: member.user.tag,
                                createdAt: Date.now()
                            });

                            // 5. نقل العميل والمشرف للروم الخاص
                            const moved = await moveToPrivateRoom(
                                voiceChannel.guild,
                                clientId,
                                member.id,
                                privateRoom.id
                            );

                            if (moved) {
                                console.log(`✅ تم نقل ${clientMember.user.tag} و ${member.user.tag} للروم الخاص`);

                                // 6. البوت يطلع من روم الانتظار
                                setTimeout(async () => {
                                    const conn = voiceConnections.get(guildId);
                                    if (conn) {
                                        conn.destroy();
                                        voiceConnections.delete(guildId);
                                        console.log(`🔌 البوت طلع من روم الانتظار`);
                                    }
                                }, 2000);
                            }
                        }

                        break; // نتعامل مع عميل واحد فقط
                    }
                }

                return;
            }

            // دخول عميل عادي لروم الانتظار
            console.log(`👤 ${member.user.tag} دخل روم الانتظار`);

            if (!voiceChannel) return;

            // التحقق إذا فيه مشرف موجود
            const existingAdmin = getAdminInVoice(voiceChannel, settings);

            // إذا فيه مشرف موجود، نبدأ عملية إنشاء روم خاص فوراً
            if (existingAdmin) {
                console.log(`⚡ العميل ${member.user.tag} دخل ومشرف موجود بالفعل`);

                // إرسال إشعار استلام الطلب فوراً
                await sendAdminAcceptNotification(
                    voiceChannel.guild,
                    settings,
                    member.id,
                    existingAdmin.id,
                    existingAdmin.user.tag,
                    member.user.tag
                );

                // إنشاء روم صوتي خاص فوراً
                const privateRoom = await createPrivateVoiceRoom(
                    voiceChannel.guild,
                    settings,
                    member.id,
                    member.user.username,
                    existingAdmin.id,
                    existingAdmin.user.tag
                );

                if (privateRoom) {
                    // حفظ بيانات العميل
                    const callData = {
                        userId: member.id,
                        voiceChannelId: voiceChannel.id,
                        guildId: voiceChannel.guild.id,
                        isBotMuted: true,
                        hasAdmin: true,
                        lastAdminId: existingAdmin.id,
                        adminName: existingAdmin.user.tag,
                        userName: member.user.tag,
                        joinedAt: Date.now(),
                        privateRoomId: privateRoom.id,
                        privateRoomName: privateRoom.name,
                        callStartTime: Date.now()
                    };

                    activeCalls.set(member.id, callData);
                    privateRooms.set(privateRoom.id, {
                        clientId: member.id,
                        clientName: member.user.tag,
                        adminId: existingAdmin.id,
                        adminName: existingAdmin.user.tag,
                        createdAt: Date.now()
                    });

                    // نقل العميل والمشرف للروم الخاص
                    await moveToPrivateRoom(
                        voiceChannel.guild,
                        member.id,
                        existingAdmin.id,
                        privateRoom.id
                    );

                    console.log(`✅ تم إنشاء روم خاص فوراً للعميل ${member.user.tag}`);
                }

                return;
            }

            // إذا مفيش مشرف، نبدأ عملية الانتظار

            // 1. البوت يدخل مع العميل فوراً
            const connection = await getOrCreateConnection(voiceChannel);
            if (!connection) {
                console.error('❌ فشل الاتصال الصوتي');
                return;
            }

            // زيادة المهلة لتفادي اخطاء الشبكة الصغيرة
            await entersState(connection, VoiceConnectionStatus.Ready, 10000);

            // 2. إرسال إشعار طلب جديد
            await sendNewCallNotification(voiceChannel.guild, settings, member.id, member.user.tag);

            // 3. اختيار مجموعة صوت بالتناوب لكل سيرفر
            const selectedAudioSet = getNextAudioSet(voiceChannel.guild.id);
            console.log(`🎵 تم اختيار ${selectedAudioSet.name} للعميل ${member.user.tag}`);

            // 4. الانتظار 4 ثواني فقط ثم تشغيل التسجيلات
            setTimeout(async () => {
                if (!member.voice.channelId || member.voice.channelId !== supportVoiceId) {
                    console.log(`❌ العميل ${member.user.tag} خرج قبل بدء الصوت`);
                    return;
                }

                // تشغيل صوت الانتظار من المجموعة المختارة
                if (selectedAudioSet.waiting) {
                    console.log(`🔊 تشغيل ${selectedAudioSet.waiting} للعميل ${member.id}`);
                    const waitingPlayer = playAudio(connection, selectedAudioSet.waiting, member.id, false, selectedAudioSet);

                    // حفظ بيانات العميل مع المجموعة الصوتية
                    const callData = {
                        connection,
                        waitingPlayer,
                        userId: member.id,
                        voiceChannelId: voiceChannel.id,
                        guildId: voiceChannel.guild.id,
                        isBotMuted: false,
                        hasAdmin: false,
                        userName: member.user.tag,
                        joinedAt: Date.now(),
                        audioSet: selectedAudioSet
                    };

                    // استمع لانتهاء صوت الانتظار ثم ابدأ الموسيقى الخلفية من نفس المجموعة
                    if (waitingPlayer) {
                        waitingPlayer.once(AudioPlayerStatus.Idle, () => {
                            if (member.voice.channelId === supportVoiceId) {
                                const currentAdmin = getAdminInVoice(voiceChannel, settings);
                                if (!currentAdmin) {
                                    console.log(`🎵 بدء موسيقى ${selectedAudioSet.background} للعميل ${member.id}`);
                                    const musicPlayer = playAudio(connection, selectedAudioSet.background, member.id, true, selectedAudioSet);
                                    callData.musicPlayer = musicPlayer;
                                    callData.waitingPlayer = null;
                                }
                            }
                        });
                    }

                    activeCalls.set(member.id, callData);
                } else {
                    // إذا مفيش صوت انتظار، نبدأ الموسيقى مباشرة
                    console.log(`🎵 بدء موسيقى ${selectedAudioSet.background} مباشرة للعميل ${member.id}`);
                    const musicPlayer = playAudio(connection, selectedAudioSet.background, member.id, true, selectedAudioSet);

                    const callData = {
                        connection,
                        musicPlayer,
                        userId: member.id,
                        voiceChannelId: voiceChannel.id,
                        guildId: voiceChannel.guild.id,
                        isBotMuted: false,
                        hasAdmin: false,
                        userName: member.user.tag,
                        joinedAt: Date.now(),
                        audioSet: selectedAudioSet
                    };

                    activeCalls.set(member.id, callData);
                }

            }, 4000); // 4 ثواني فقط

        }

        // خروج من روم الانتظار أو الروم الخاص
        if (oldState.channelId && newState.channelId !== oldState.channelId) {
            const memberId = member.id;
            const memberName = member.user.tag;

            // البحث إذا الروم اللي طلع منه ده روم خاص
            const isPrivateRoom = privateRooms.has(oldState.channelId);

            // إذا كان روم خاص
            if (isPrivateRoom) {
                const roomData = privateRooms.get(oldState.channelId);

                // إذا العميل هو اللي طلع
                if (roomData.clientId === memberId) {
                    console.log(`👤 العميل خرج من الروم الخاص`);

                    // جلب بيانات المكالمة
                    const callData = activeCalls.get(memberId);
                    if (callData) {
                        // تنظيف البيانات
                        activeCalls.delete(memberId);
                    }

                    // حذف الروم الخاص بعد 3 ثواني
                    setTimeout(async () => {
                        await deletePrivateRoom(oldState.channel?.guild, oldState.channelId);
                        privateRooms.delete(oldState.channelId);
                    }, 3000);

                } 
                // إذا المشرف هو اللي طلع
                else if (roomData.adminId === memberId) {
                    console.log(`👑 المشرف خرج من الروم الخاص`);

                    // جلب بيانات المكالمة
                    const callData = activeCalls.get(roomData.clientId);
                    if (callData) {
                        // تنظيف البيانات
                        activeCalls.delete(roomData.clientId);
                    }

                    // حذف الروم الخاص بعد 3 ثواني
                    setTimeout(async () => {
                        await deletePrivateRoom(oldState.channel?.guild, oldState.channelId);
                        privateRooms.delete(oldState.channelId);
                    }, 3000);
                }

                return;
            }

            // إذا كان روم الانتظار
            if (oldState.channelId === supportVoiceId) {
                // لو كان شخص معاه الرتبة المحددة
                if (member.roles.cache.has(adminRoleId)) {
                    console.log(`👑 ${memberName} (إدارة) خرج من روم الانتظار`);
                    return;
                }

                // لو كان عميل عادي
                console.log(`👤 ${memberName} خرج من روم الانتظار`);

                const callData = activeCalls.get(memberId);

                if (callData) {
                    // تنظيف الصوت
                    stopAllAudioForUser(memberId);

                    // تنظيف البيانات
                    activeCalls.delete(memberId);
                }

                // إذا مفيش أحد في روم الانتظار، اقطع الاتصال
                setTimeout(async () => {
                    try {
                        const channel = await client.channels.fetch(supportVoiceId);
                        if (channel) {
                            const members = channel.members.filter(m => !m.user.bot);

                            if (members.size === 0) {
                                const conn = voiceConnections.get(guildId);
                                if (conn) {
                                    conn.destroy();
                                    voiceConnections.delete(guildId);
                                    console.log(`🔌 البوت طلع من روم الانتظار (فارغ)`);
                                }
                            }
                        }
                    } catch (error) {
                        // تجاهل الخطأ
                    }
                }, 3000);
            }
        }

    } catch (error) {
        console.error('❌ خطأ في voiceStateUpdate:', error);
    }
});

// حدث دخول البوت لسيرفر جديد
client.on('guildCreate', async (guild) => {
    console.log(`➕ تم إضافة البوت لسيرفر جديد: ${guild.name} (${guild.id})`);

    // التحقق إذا السيرفر مقفل
    const lockedServers = serverSettings.lockedServers || [];
    if (lockedServers.includes(guild.id)) {
        console.log(`🚫 السيرفر مقفل: ${guild.name}`);

        // إرسال رسالة للمالك
        try {
            const owner = await guild.fetchOwner();
            if (owner) {
                await owner.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xe74c3c)
                            .setTitle('🔒 البوت غير متاح في سيرفرك')
                            .setDescription(`**عذراً، البوت مقفل في سيرفرك (${guild.name})**\n\n**سبب القفل:** انتهاء الاشتراك أو مخالفة الشروط\n\n**موقع تجديد الاشتراك:** [https://siennaai.pages.dev/](https://siennaai.pages.dev/)`)
                            .addFields({
                                name: 'معلومات السيرفر',
                                value: `• **الاسم:** ${guild.name}\n• **المعرف:** \`${guild.id}\`\n• **الأعضاء:** ${guild.memberCount}`
                            })
                            .setFooter({ text: 'Sienna Support Bot' })
                            .setTimestamp()
                    ]
                });
            }
        } catch (error) {
            console.log(`❌ لم أستطع إرسال رسالة لمالك ${guild.name}`);
        }

        // خروج البوت من السيرفر
        setTimeout(async () => {
            try {
                await guild.leave();
                console.log(`🚫 البوت خرج من سيرفر (مقفل): ${guild.name}`);
            } catch (error) {
                console.log(`❌ فشل خروج البوت من ${guild.name}`);
            }
        }, 5000);

        return;
    }

    // إرسال رسالة ترحيب مع الرابط القابل للنقر
    try {
        const owner = await guild.fetchOwner();
        if (owner) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle('Holaa :> ')
                .setDescription('اهلا بك في خدمات Seinna')
                .addFields({
                    name: ' ',
                    value: 'Enjoy→⋰⋱⋮ لو عندك اقتراح او مشكله في استخدام تواصل في سيرفر خاص بينا :> اتمني لك يوم سعيد'
                })
                .setThumbnail('https://cdn.discordapp.com/attachments/1436754107389186224/1469829032987201716/c8a298442bf48444e67e4c288a73cabb.jpg?ex=69891475&is=6987c2f5&hm=eadf3863d18ec18df5bb97283c7f3b612c6cc10c04a7d536bc6a749d137475f8&')
                .setImage('https://cdn.discordapp.com/attachments/1436754107389186224/1469829032647590158/d801b3d8e619ae05aedcbefe7b8a5188.jpg?ex=69891475&is=6987c2f5&hm=bcc07ef69b6369dbb82b057b4362ebc56c181ecac2fd37547bb638b326a50bd2&')
                .setFooter({ 
                    text: `Sienna Support Bot | ${new Date().toLocaleDateString('ar-SA')}`, 
                    iconURL: 'https://cdn.discordapp.com/attachments/1449057765397106830/1459265170584109067/8ed9b44c0b845fd2d1b092949bc83411.jpg?ex=69898a58&is=698838d8&hm=e64f57cb8ba535d347da7ea478c1400ff5da0d71018f631fc176bc96d51b9889&' 
                })
                .setTimestamp();

            // إرسال الرسالة مع الرابط القابل للنقر
            await owner.send({ 
                content: '[Holaa :>](https://discord.gg/1mec)', // رابط السيرفر الخاص بك هنا
                embeds: [welcomeEmbed] 
            });
            console.log(`📩 تم إرسال رسالة ترحيب لمالك السيرفر: ${owner.user.tag}`);
        }
    } catch (error) {
        console.log(`❌ لم أستطع إرسال رسالة ترحيب لمالك ${guild.name}:`, error.message);
    }

    // إرسال رسالة ترحيب للإدمنز أيضاً
    const admins = guild.members.cache.filter(member => 
        member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.user.bot
    );

    for (const admin of admins.values()) {
        try {
            if (admin.id !== guild.ownerId) {
                const helpEmbed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('👋 مرحباً بك في بوت الدعم الصوتي Sienna!')
                    .setDescription(`**شكراً لإضافتك البوت إلى ${guild.name}**\n\nقبل البدء، يجب إعداد النظام أولاً.`)
                    .addFields({
                        name: '📝 **الخطوات المطلوبة:**',
                        value: `
1. \`/setup category\`
2. \`/setup voice\`
3. \`/setup text\`
4. \`/setup role\`

بعدها النظام يصبح جاهزاً للعمل!
                        `
                    })
                    .setFooter({ text: 'استخدم /help لعرض كل الأوامر' });

                await admin.send({ embeds: [helpEmbed] });
                console.log(`📩 تم إرسال رسالة ترحيب للإدمن: ${admin.user.tag}`);
            }
        } catch (error) {
            // تجاهل الخطأ إذا لم نستطع إرسال
        }
    }

    // إرسال رسالة في قناة عامة في السيرفر (إذا كان هناك قناة مناسبة)
    try {
        // البحث عن أول قناة نصية يمكن للبوت الكتابة فيها
        const textChannel = guild.channels.cache
            .filter(ch => ch.type === ChannelType.GuildText && ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages))
            .first();

        if (textChannel) {
            const publicEmbed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle(':> مرحباً بالجميع!')
                .setDescription(`**تمت إضافة بوت Sienna بنجاح إلى ${guild.name}`)
                .addFields({
                    name: '📝 الخطوات الأولية',
                    value: ' استخدم `/help` لعرض الأوامر'
                })
                .setFooter({ text: 'Sienna Support Bot | نظام دعم صوتي متكامل' })
                .setTimestamp();

            await textChannel.send({ embeds: [publicEmbed] });
            console.log(`📢 تم إرسال رسالة ترحيب في قناة ${textChannel.name}`);
        }
    } catch (error) {
        console.log(`❌ لم أستطع إرسال رسالة ترحيب في السيرفر ${guild.name}`);
    }
});

// حدث تشغيل البوت
client.on('ready', async () => {
    console.log('=================================');
    console.log(`✅ ${client.user.tag} يعمل بنجاح!`);
    console.log(`📁 السيرفرات: ${client.guilds.cache.size}`);

    // حساب السيرفرات المقفلة
    const lockedServers = serverSettings.lockedServers || [];
    const allLockedCount = lockedServers.length;
    const activeLocked = lockedServers.filter(id => client.guilds.cache.has(id)).length;
    console.log(`🔐 السيرفرات المقفلة: ${allLockedCount} (${activeLocked} موجودة)`);

    // تسجيل الـ Slash Commands
    await registerCommands();

    // التحقق من كل سيرفر وإرسال تحذير إذا لم يكتمل الإعداد
    client.guilds.cache.forEach(guild => {
        if (!isServerSetupComplete(guild.id)) {
            console.log(`⚠️  سيرفر ${guild.name} (${guild.id}) غير مكتمل الإعداد`);
            warnAdminIfNotSetup(guild);
        } else {
            console.log(`✅ سيرفر ${guild.name} (${guild.id}) مكتمل الإعداد`);
        }
    });

    console.log('=================================');

    client.user.setPresence({
        activities: [{
            name: 'Sienna Support Bot | /help',
            type: 2
        }],
        status: 'online'
    });
});

// تسجيل الدخول
if (!config.token) {
    console.error('❌ المتغير البيئي DISCORD_TOKEN غير معبأ. أضف التوكن ثم أعد التشغيل.');
    process.exit(1);
}
client.login(config.token).catch(err => console.error('❌ فشل تسجيل الدخول:', err));

// معالجة الأخطاء
process.on('unhandledRejection', error => {
    console.error('❌ خطأ غير معالج:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ استثناء غير معالج:', error);
});

// تنظيف الاتصالات عند إيقاف العملية
process.on('SIGINT', async () => {
    console.log('🛑 إغلاق - تنظيف الاتصالات الصوتية');
    for (const [guildId, conn] of voiceConnections.entries()) {
        try { conn.destroy(); } catch (e) {}
        voiceConnections.delete(guildId);
    }
    process.exit(0);
});