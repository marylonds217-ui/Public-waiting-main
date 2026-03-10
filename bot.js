    // بعد أمر reset وقبل نهاية الدالة
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