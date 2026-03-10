// ==================== تسجيل الأوامر ====================
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// تعريف جميع الأوامر
const commands = [
    // أوامر الحظر والطرد
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر مستخدم من السيرفر')
        .addUserOption(option => option.setName('user').setDescription('المستخدم المراد حظره').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('سبب الحظر').setRequired(false))
        .addIntegerOption(option => option.setName('days').setDescription('عدد الأيام لحذف الرسائل').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('إلغاء حظر مستخدم')
        .addStringOption(option => option.setName('userid').setDescription('معرف المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد مستخدم من السيرفر')
        .addUserOption(option => option.setName('user').setDescription('المستخدم المراد طرده').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('softban')
        .setDescription('حظر مؤقت (يحذف الرسائل ثم إلغاء الحظر)')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false))
        .addIntegerOption(option => option.setName('days').setDescription('عدد الأيام').setRequired(false)),
    
    // أوامر التايم آوت
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('كتم صوت مستخدم مؤقتاً')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('المدة بالثواني').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('إلغاء كتم الصوت')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    // أوامر القنوات
    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('قفل القناة')
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('فتح القناة')
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('hide')
        .setDescription('إخفاء القناة عن الأعضاء')
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('show')
        .setDescription('إظهار القناة للأعضاء')
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('تفعيل الوضع البطيء')
        .addIntegerOption(option => option.setName('seconds').setDescription('الثواني').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('clone')
        .setDescription('نسخ قناة')
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(true))
        .addStringOption(option => option.setName('name').setDescription('الاسم الجديد').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('حذف جميع الرسائل في القناة')
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    // أوامر المعلومات
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('معلومات مستخدم')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('معلومات السيرفر'),
    
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('صورة المستخدم')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('قياس سرعة البوت'),
    
    new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('مدة تشغيل البوت'),
    
    // أوامر الرسائل
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة')
        .addStringOption(option => option.setName('message').setDescription('الرسالة').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('إرسال embed')
        .addStringOption(option => option.setName('title').setDescription('العنوان').setRequired(false))
        .addStringOption(option => option.setName('description').setDescription('الوصف').setRequired(true))
        .addStringOption(option => option.setName('color').setDescription('اللون').setRequired(false))
        .addStringOption(option => option.setName('footer').setDescription('التذييل').setRequired(false))
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('poll')
        .setDescription('إنشاء استفتاء')
        .addStringOption(option => option.setName('question').setDescription('السؤال').setRequired(true))
        .addStringOption(option => option.setName('option1').setDescription('الخيار 1').setRequired(true))
        .addStringOption(option => option.setName('option2').setDescription('الخيار 2').setRequired(true))
        .addStringOption(option => option.setName('option3').setDescription('الخيار 3').setRequired(false))
        .addStringOption(option => option.setName('option4').setDescription('الخيار 4').setRequired(false))
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('إرسال إعلان')
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(true))
        .addStringOption(option => option.setName('title').setDescription('العنوان').setRequired(false))
        .addStringOption(option => option.setName('message').setDescription('الرسالة').setRequired(true))
        .addStringOption(option => option.setName('color').setDescription('اللون').setRequired(false))
        .addBooleanOption(option => option.setName('ping').setDescription('ping everyone؟').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('حذف رسائل')
        .addIntegerOption(option => option.setName('amount').setDescription('العدد').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('مستخدم معين').setRequired(false))
        .addStringOption(option => option.setName('contains').setDescription('تحتوي على').setRequired(false))
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('purgebot')
        .setDescription('حذف رسائل البوتات')
        .addIntegerOption(option => option.setName('amount').setDescription('العدد').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('purgeuser')
        .setDescription('حذف رسائل مستخدم')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('العدد').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('purgeattachments')
        .setDescription('حذف الرسائل التي تحتوي على ملفات')
        .addIntegerOption(option => option.setName('amount').setDescription('العدد').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('القناة').setRequired(false)),
    
    // أوامر الصوت
    new SlashCommandBuilder()
        .setName('vcmute')
        .setDescription('كتم صوت في الروم الصوتي')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('vcunmute')
        .setDescription('إلغاء كتم الصوت في الروم الصوتي')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('vcdeafen')
        .setDescription('تعطيل السماع في الروم الصوتي')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('vcundeafen')
        .setDescription('إلغاء تعطيل السماع في الروم الصوتي')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('vckick')
        .setDescription('طرد من الروم الصوتي')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('vcmove')
        .setDescription('نقل إلى روم صوتي آخر')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('الروم المقصد').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('vcdisconnect')
        .setDescription('فصل جميع الأعضاء من روم صوتي')
        .addChannelOption(option => option.setName('channel').setDescription('الروم').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    // أوامر التحذيرات
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('تحذير مستخدم')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض التحذيرات')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('clearwarns')
        .setDescription('مسح التحذيرات')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true)),
    
    // أوامر الأسماء
    new SlashCommandBuilder()
        .setName('nick')
        .setDescription('تغيير الاسم')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('nickname').setDescription('الاسم الجديد').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('resetnick')
        .setDescription('إعادة الاسم الأصلي')
        .addUserOption(option => option.setName('user').setDescription('المستخدم').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
];

// تحويل الأوامر إلى JSON
const commandsJson = commands.map(command => command.toJSON());

// تسجيل الأوامر في Discord
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('🔄 جاري تسجيل الأوامر...');
        
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commandsJson }
        );
        
        console.log(`✅ تم تسجيل ${data.length} أمر بنجاح!`);
    } catch (error) {
        console.error('❌ خطأ في تسجيل الأوامر:', error);
    }
})();
