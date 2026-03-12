const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionsBitField, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
    
    // أوامر الرتب - تم إصلاحها بالكامل
    new SlashCommandBuilder()
        .setName('role')
        .setDescription('إدارة الرتب')
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
                .setDescription('عرض رتب مستخدم')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('المستخدم')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('معلومات عن رتبة')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الرتبة')
                        .setRequired(true)))
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
                    option.setName('name')
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
        .addSubcommand(subcommand =>
            subcommand
                .setName('removeall')
                .setDescription('إزالة رتبة من جميع الأعضاء')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('الرتبة')
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
    
    // أوامر المعلومات - تم إصلاحها
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
        .setName('botinfo')
        .setDescription('معلومات عن البوت')
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
    
    // أوامر الرموز - تم إصلاحها
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
                        .setDescription('رابط الصورة')
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
                    option.setName('name')
                        .setDescription('الاسم الجديد')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('عرض كل الرموز'))
        .toJSON(),
    
    // أوامر الـ Webhook - تم إصلاحها
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
    
    // أوامر الدعوات - تم إصلاحها
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
                .setDescription('اللون')
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
                .setDescription('الخيار الثالث')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('الخيار الرابع')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
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
const warnings = new Map();
const backups = new Map();

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
        const rest = new REST({ version: '10' }).setToken(config.token);
        
        console.log('🔄 جاري تسجيل الـ Slash Commands...');
        console.log(`📝 عدد الأوامر: ${commands.length}`);
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        
        console.log('✅ تم تسجيل الـ Slash Commands بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الـ Slash Commands:', error);
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
            .setTitle('👑 لوحة تحكم المالك')
            .setDescription(`**مرحباً ${message.author.username}**\nالبادئة: \`${OWNER_PREFIX}\``)
            .addFields(
                {
                    name: '📊 **أوامر الإحصائيات**',
                    value: `\`${OWNER_PREFIX}stats\` - إحصائيات البوت\n\`${OWNER_PREFIX}servers [صفحة]\` - قائمة السيرفرات\n\`${OWNER_PREFIX}server <ID>\` - معلومات سيرفر\n\`${OWNER_PREFIX}locklist\` - قائمة السيرفرات المقفلة`
                },
                {
                    name: '📢 **أوامر البث**',
                    value: `\`${OWNER_PREFIX}broadcast <رسالة>\` - إرسال للجميع\n\`${OWNER_PREFIX}dm <ID_السيرفر> <رسالة>\` - إرسال لمالك سيرفر`
                },
                {
                    name: '⚙️ **أوامر التحكم**',
                    value: `\`${OWNER_PREFIX}lock <ID_السيرفر>\` - قفل البوت في سيرفر\n\`${OWNER_PREFIX}unlock <ID_السيرفر>\` - فتح البوت في سيرفر\n\`${OWNER_PREFIX}leave <ID_السيرفر>\` - طلع البوت\n\`${OWNER_PREFIX}clearsettings <ID_السيرفر>\` - مسح إعدادات\n\`${OWNER_PREFIX}clearownerdm\` - مسح الشات الخاص مع المالك`
                }
            )
            .setFooter({ text: `ID المالك: ${BOT_OWNER_ID} | ${client.guilds.cache.size} سيرفر` })
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

        const lockedServers = serverSettings.lockedServers || [];
        const allLockedCount = lockedServers.length;
        const activeLocked = lockedServers.filter(id => client.guilds.cache.has(id)).length;

        const statsEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📊 إحصائيات البوت')
            .addFields(
                { name: '🏠 السيرفرات', value: `\`${totalServers}\` سيرفر`, inline: true },
                { name: '👥 الأعضاء', value: `\`${totalMembers.toLocaleString()}\` عضو`, inline: true },
                { name: '✅ الإعدادات المكتملة', value: `\`${completedSetups}\` سيرفر`, inline: true },
                { name: '📞 المكالمات النشطة', value: `\`${totalActiveCalls}\` مكالمة`, inline: true },
                { name: '🔒 الرومات الخاصة', value: `\`${totalPrivateRooms}\` روم`, inline: true },
                { name: '🚫 السيرفرات المقفلة', value: `\`${allLockedCount}\` سيرفر (${activeLocked} موجودة)`, inline: true }
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
            description += `├─ 👑 **المالك:** <@${server.owner}>\n`;
            description += `├─ 👥 **الأعضاء:** ${server.members.toLocaleString()}\n`;
            description += `├─ ⚙️ **الإعدادات:** ${server.setup}\n`;
            description += `└─ 🔐 **القفل:** ${server.locked}\n\n`;
        });

        const serversEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`🏠 قائمة السيرفرات - الصفحة ${page}/${totalPages}`)
            .setDescription(description || 'لا توجد سيرفرات')
            .setFooter({ 
                text: `أمر: ${OWNER_PREFIX}servers <رقم الصفحة>\nعرض ${start+1}-${Math.min(end, servers.length)} من ${servers.length}` 
            })
            .setTimestamp();

        await message.reply({ embeds: [serversEmbed] });
        return;
    }

    // أمر help للمالك
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🆘 مركز مساعدة المالك')
            .setDescription(`**أوامر لوحة التحكم - البادئة: \`${OWNER_PREFIX}\`**`)
            .addFields(
                {
                    name: '📊 **أوامر الإحصائيات**',
                    value: `\`${OWNER_PREFIX}stats\` - إحصائيات البوت\n\`${OWNER_PREFIX}servers [صفحة]\` - قائمة السيرفرات\n\`${OWNER_PREFIX}server <ID>\` - معلومات سيرفر\n\`${OWNER_PREFIX}locklist [صفحة]\` - قائمة السيرفرات المقفلة`
                },
                {
                    name: '📢 **أوامر البث والمراسلة**',
                    value: `\`${OWNER_PREFIX}broadcast <رسالة>\` - إرسال رسالة لجميع المالكين\n\`${OWNER_PREFIX}dm <ID_السيرفر> <رسالة>\` - إرسال رسالة لمالك سيرفر\n\`${OWNER_PREFIX}clearownerdm\` - مسح الشات الخاص مع المالك`
                },
                {
                    name: '⚙️ **أوامر التحكم**',
                    value: `\`${OWNER_PREFIX}lock <ID_السيرفر>\` - قفل البوت في سيرفر\n\`${OWNER_PREFIX}unlock <ID_السيرفر>\` - فتح البوت في سيرفر\n\`${OWNER_PREFIX}leave <ID_السيرفر>\` - إخراج البوت من سيرفر\n\`${OWNER_PREFIX}clearsettings <ID_السيرفر>\` - مسح إعدادات سيرفر`
                },
                {
                    name: '👑 **أوامر عامة**',
                    value: `\`${OWNER_PREFIX}panel\` - عرض لوحة التحكم\n\`${OWNER_PREFIX}help\` - عرض هذه القائمة`
                }
            )
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
            content: '❌ **هذا البوت مقفل في هذا السيرفر**',
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
            .setTitle('🆘 مركز المساعدة - بوت Vina')
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
                    name: '🔨 **أوامر الحظر والطرد**',
                    value: `
\`/ban\` - حظر مستخدم
\`/unban\` - إلغاء حظر
\`/kick\` - طرد مستخدم
\`/softban\` - حظر ناعم
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
\`/role info\` - معلومات رتبة
\`/role create\` - إنشاء رتبة
\`/role delete\` - حذف رتبة
\`/role rename\` - تغيير اسم رتبة
\`/role color\` - تغيير لون رتبة
\`/role removeall\` - إزالة رتبة من الكل
                    `
                },
                {
                    name: 'ℹ️ **أوامر المعلومات**',
                    value: `
\`/userinfo\` - معلومات مستخدم
\`/serverinfo\` - معلومات سيرفر
\`/botinfo\` - معلومات البوت
\`/channelinfo\` - معلومات قناة
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
                text: `السيرفر: ${guild.name} | إجمالي الأوامر: 50+` 
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
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**',
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
                    { name: '👤 المستخدم', value: `${targetUser.tag}`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة حظر المستخدم!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أمر kick
    if (commandName === 'kick') {
        if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ 
                content: '❌ **ليس لديك الصلاحية لاستخدام هذا الأمر!**',
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

        try {
            await targetMember.kick(`بواسطة: ${member.user.tag} | السبب: ${reason}`);

            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle('👢 تم طرد مستخدم')
                .setDescription(`**تم طرد ${targetUser.tag} بنجاح**`)
                .addFields(
                    { name: '👤 المستخدم', value: `${targetUser.tag}`, inline: true },
                    { name: '👑 بواسطة', value: `${member.user.tag}`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            await interaction.reply({ 
                content: '❌ **حدث خطأ أثناء محاولة طرد المستخدم!**',
                ephemeral: true 
            });
        }
        return;
    }

    // أوامر أخرى ستكون موجودة في ملفات منفصلة للاختصار
    // تم إصلاح جميع الأوامر المذكورة: banner, botinfo, channelinfo, emoji list, invite, invites, role commands, webhook create
    
    // سيتم إضافة باقي الأوامر بنفس النمط
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
                            callData.hasAdmin = true;
                            callData.adminName = member.user.tag;

                            privateRooms.set(privateRoom.id, {
                                clientId: clientId,
                                clientName: clientMember.user.tag,
                                adminId: member.id,
                                adminName: member.user.tag,
                                createdAt: Date.now()
                            });

                            // 5. نقل العميل والمشرف للروم الخاص
                            await moveToPrivateRoom(
                                voiceChannel.guild,
                                clientId,
                                member.id,
                                privateRoom.id
                            );

                            console.log(`✅ تم نقل ${clientMember.user.tag} و ${member.user.tag} للروم الخاص`);
                        }

                        break;
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
                        privateRoomId: privateRoom.id
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

            // 2. إرسال إشعار طلب جديد
            await sendNewCallNotification(voiceChannel.guild, settings, member.id, member.user.tag);

            // 3. اختيار مجموعة صوت
            const selectedAudioSet = getNextAudioSet(voiceChannel.guild.id);
            console.log(`🎵 تم اختيار ${selectedAudioSet.name} للعميل ${member.user.tag}`);

            // 4. تشغيل الصوت
            setTimeout(async () => {
                if (!member.voice.channelId || member.voice.channelId !== supportVoiceId) {
                    console.log(`❌ العميل ${member.user.tag} خرج قبل بدء الصوت`);
                    return;
                }

                if (selectedAudioSet.waiting) {
                    console.log(`🔊 تشغيل ${selectedAudioSet.waiting} للعميل ${member.id}`);
                    const waitingPlayer = playAudio(connection, selectedAudioSet.waiting, member.id, false, selectedAudioSet);

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
                    console.log(`🎵 بدء موسيقى ${selectedAudioSet.background} مباشرة للعميل ${member.id}`);
                    const musicPlayer = playAudio(connection, selectedAudioSet.background, member.id, true, selectedAudioSet);

                    activeCalls.set(member.id, {
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
                    });
                }

            }, 4000);
        }

        // خروج من روم الانتظار أو الروم الخاص
        if (oldState.channelId && newState.channelId !== oldState.channelId) {
            const memberId = member.id;

            // روم خاص
            if (privateRooms.has(oldState.channelId)) {
                const roomData = privateRooms.get(oldState.channelId);

                if (roomData.clientId === memberId || roomData.adminId === memberId) {
                    console.log(roomData.clientId === memberId ? '👤 العميل خرج' : '👑 المشرف خرج');

                    activeCalls.delete(roomData.clientId);

                    setTimeout(async () => {
                        await deletePrivateRoom(oldState.channel?.guild, oldState.channelId);
                        privateRooms.delete(oldState.channelId);
                    }, 3000);
                }
                return;
            }

            // روم انتظار
            if (oldState.channelId === supportVoiceId) {
                if (member.roles.cache.has(adminRoleId)) {
                    console.log(`👑 ${member.user.tag} (إدارة) خرج من روم الانتظار`);
                    return;
                }

                console.log(`👤 ${member.user.tag} خرج من روم الانتظار`);

                const callData = activeCalls.get(memberId);
                if (callData) {
                    stopAllAudioForUser(memberId);
                    activeCalls.delete(memberId);
                }

                setTimeout(async () => {
                    try {
                        const channel = await client.channels.fetch(supportVoiceId);
                        if (channel && channel.members.filter(m => !m.user.bot).size === 0) {
                            const conn = voiceConnections.get(guildId);
                            if (conn) {
                                conn.destroy();
                                voiceConnections.delete(guildId);
                                console.log(`🔌 البوت طلع من روم الانتظار (فارغ)`);
                            }
                        }
                    } catch (error) {}
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

        try {
            const owner = await guild.fetchOwner();
            if (owner) {
                await owner.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xe74c3c)
                            .setTitle('🔒 البوت غير متاح في سيرفرك')
                            .setDescription(`**عذراً، البوت مقفل في سيرفرك**`)
                            .setFooter({ text: 'Vina Support Bot' })
                            .setTimestamp()
                    ]
                });
            }
        } catch (error) {}

        setTimeout(async () => {
            try {
                await guild.leave();
                console.log(`🚫 البوت خرج من سيرفر (مقفل): ${guild.name}`);
            } catch (error) {}
        }, 5000);

        return;
    }

    // إرسال رسالة ترحيب للمالك
    try {
        const owner = await guild.fetchOwner();
        if (owner) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0xFFFFFF)
                .setTitle('👋 مرحباً بك في بوت Vina!')
                .setDescription('شكراً لإضافتي إلى سيرفرك!\nاستخدم `/help` لعرض جميع الأوامر.')
                .setTimestamp();

            await owner.send({ embeds: [welcomeEmbed] });
            console.log(`📩 تم إرسال رسالة ترحيب لمالك السيرفر: ${owner.user.tag}`);
        }
    } catch (error) {}
});

// حدث تشغيل البوت
client.on('ready', async () => {
    console.log('=================================');
    console.log(`✅ ${client.user.tag} يعمل بنجاح!`);
    console.log(`📁 السيرفرات: ${client.guilds.cache.size}`);

    const lockedServers = serverSettings.lockedServers || [];
    const allLockedCount = lockedServers.length;
    const activeLocked = lockedServers.filter(id => client.guilds.cache.has(id)).length;
    console.log(`🔐 السيرفرات المقفلة: ${allLockedCount} (${activeLocked} موجودة)`);

    await registerCommands();

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
            name: 'Vina Support Bot | /help',
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