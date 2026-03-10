# 🤖 إعداد البوت

## المتغيرات البيئية المطلوبة

تحتاج لإضافة هذه المتغيرات في **Railway Dashboard** أو ملف `.env`:

```
DISCORD_TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_CLIENT_ID
GUILD_ID=YOUR_SERVER_ID
```

### كيفية الحصول عليها:

#### 1. **DISCORD_TOKEN** (توكن البوت)
- اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
- اختر تطبيقك
- اذهب إلى **Bot** → اضغط **Reset Token** → انسخ التوكن

#### 2. **CLIENT_ID** (معرف التطبيق)
- في نفس صفحة Developer Portal
- اذهب إلى **General Information**
- انسخ **Application ID**

#### 3. **GUILD_ID** (معرف السيرفر)
- في Discord: **Server Settings** → **Widget** → انسخ Server ID (فعّل Developer Mode)
- أو بضغط يمين على السيرفر واختر "Copy Server ID"

## تسجيل الأوامر

بعد تعيين المتغيرات البيئية:

### محلياً (Local):
```bash
npm run deploy
```

### على Railway:
1. اذهب إلى **Railway Dashboard**
2. افتح **Deployments** → **Logs** → ابحث عن terminal أو اضغط **Run**
3. ستجد أمر terminal في الواجهة
4. اكتب:
```bash
npm run deploy
```

## تشغيل البوت

```bash
npm start
```

## ✅ التحقق من الأوامر

بعد تسجيل الأوامر:
- افتح Discord واكتب `/`
- يجب أن تظهر جميع الأوامر (ban, kick, timeout, إلخ)

---

**ملاحظة**: إذا لم تظهر الأوامر، حاول:
1. تحديث Discord (Ctrl+R on Desktop)
2. تأكد من إدخال `GUILD_ID` الصحيح
3. تأكد من أن البوت لديه صلاحية `applications.commands`
