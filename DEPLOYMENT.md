# دليل نشر CRM-project على VPS للإنتاج

هذا الدليل يشرح كيفية نشر مشروع CRM-project على خادم VPS في بيئة الإنتاج.

> **ملاحظة مهمة**: هذا الدليل يستخدم Node.js 20.x LTS أو 22.x (إصدارات مدعومة). Node.js 18.x لم يعد مدعوماً بشكل نشط ولا يتلقى تحديثات أمنية.

## المتطلبات الأساسية

### 1. متطلبات الخادم (VPS)
- نظام تشغيل: Ubuntu 20.04+ أو Debian 11+
- ذاكرة RAM: 2GB على الأقل (4GB موصى به)
- مساحة تخزين: 10GB على الأقل
- Node.js: الإصدار 20.x LTS أو 22.x (موصى به)
- Nginx: كخادم ويب عكسي (Reverse Proxy)
- SSL Certificate: للحصول على HTTPS (Let's Encrypt)

### 2. متطلبات المشروع
- Node.js 20.x LTS أو 22.x (موصى به)
- npm أو yarn
- Git

## خطوات النشر

### الخطوة 1: إعداد الخادم

#### 1.1 تحديث النظام
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 تثبيت Node.js
```bash
# تثبيت Node.js 20.x LTS (موصى به - مدعوم حتى أبريل 2026)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# أو تثبيت Node.js 22.x (أحدث إصدار LTS)
# curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
# sudo apt-get install -y nodejs

# التحقق من التثبيت
node --version
npm --version
```

#### 1.3 تثبيت Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 1.4 تثبيت PM2 (لإدارة عملية Node.js)
```bash
sudo npm install -g pm2
```

### الخطوة 2: رفع المشروع إلى الخادم

#### 2.1 إنشاء مستخدم جديد (اختياري)
```bash
sudo adduser crmuser
sudo usermod -aG sudo crmuser
su - crmuser
```

#### 2.2 استنساخ المشروع
```bash
cd /var/www
sudo git clone <repository-url> crm-project
sudo chown -R $USER:$USER /var/www/crm-project
cd crm-project
```

أو يمكنك رفع الملفات عبر SFTP/SCP:
```bash
# من جهازك المحلي
scp -r CRM-project/* user@your-server-ip:/var/www/crm-project/
```

### الخطوة 3: إعداد متغيرات البيئة

#### 3.1 إنشاء ملف `.env` للإنتاج
```bash
cd /var/www/crm-project
nano .env.production
```

أضف المتغيرات التالية:
```env
VITE_API_URL=https://haidaraib.pythonanywhere.com/api
GEMINI_API_KEY=your-gemini-api-key-here
NODE_ENV=production
```

#### 3.2 نسخ الملف إلى `.env`
```bash
cp .env.production .env
```

### الخطوة 4: بناء المشروع

#### 4.1 تثبيت التبعيات
```bash
cd /var/www/crm-project
npm install
```

#### 4.2 بناء المشروع للإنتاج
```bash
npm run build
```

سيتم إنشاء مجلد `dist` يحتوي على الملفات المبنية.

### الخطوة 5: إعداد Nginx

#### 5.1 إنشاء ملف إعدادات Nginx
```bash
sudo nano /etc/nginx/sites-available/crm-project
```

أضف التكوين التالي:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/crm-project/dist;
    index index.html;

    # إعدادات الضغط
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # إعدادات الأمان
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # توجيه جميع الطلبات إلى index.html (لـ SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # تخزين مؤقت للملفات الثابتة
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # منع الوصول إلى الملفات المخفية
    location ~ /\. {
        deny all;
    }
}
```

#### 5.2 تفعيل الموقع
```bash
sudo ln -s /etc/nginx/sites-available/crm-project /etc/nginx/sites-enabled/
sudo nginx -t  # التحقق من صحة الإعدادات
sudo systemctl reload nginx
```

### الخطوة 6: إعداد SSL (HTTPS)

#### 6.1 تثبيت Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 6.2 الحصول على شهادة SSL
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

سيقوم Certbot بتحديث إعدادات Nginx تلقائياً لدعم HTTPS.

### الخطوة 7: إعداد PM2 (اختياري - إذا كنت تستخدم Vite Preview)

إذا كنت تريد استخدام `vite preview` بدلاً من Nginx فقط:

#### 7.1 إنشاء ملف إعدادات PM2
```bash
nano /var/www/crm-project/ecosystem.config.js
```

أضف التكوين التالي:
```javascript
module.exports = {
  apps: [{
    name: 'crm-project',
    script: 'npm',
    args: 'run preview',
    cwd: '/var/www/crm-project',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

#### 7.2 تشغيل التطبيق بـ PM2
```bash
cd /var/www/crm-project
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### الخطوة 8: إعدادات الأمان

#### 8.1 إعداد جدار الحماية
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

#### 8.2 تحديث أذونات الملفات
```bash
sudo chown -R www-data:www-data /var/www/crm-project/dist
sudo chmod -R 755 /var/www/crm-project
```

### الخطوة 9: إعداد التحديثات التلقائية

#### 9.1 إنشاء سكريبت للتحديث
```bash
nano /var/www/crm-project/update.sh
```

أضف المحتوى التالي:
```bash
#!/bin/bash
cd /var/www/crm-project
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
echo "تم تحديث المشروع بنجاح"
```

#### 9.2 جعل السكريبت قابل للتنفيذ
```bash
chmod +x /var/www/crm-project/update.sh
```

## صيانة وتحديثات

### تحديث المشروع
```bash
cd /var/www/crm-project
./update.sh
```

### مراقبة السجلات
```bash
# سجلات Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# سجلات PM2 (إذا كنت تستخدمه)
pm2 logs crm-project
```

### إعادة تشغيل الخدمات
```bash
# إعادة تشغيل Nginx
sudo systemctl restart nginx

# إعادة تشغيل PM2
pm2 restart crm-project
```

## استكشاف الأخطاء

### المشكلة: الموقع لا يعمل
1. تحقق من حالة Nginx: `sudo systemctl status nginx`
2. تحقق من السجلات: `sudo tail -f /var/log/nginx/error.log`
3. تحقق من صحة إعدادات Nginx: `sudo nginx -t`

### المشكلة: خطأ 404 عند التنقل
- تأكد من وجود قاعدة `try_files` في إعدادات Nginx
- تأكد من أن جميع المسارات تُوجه إلى `/index.html`

### المشكلة: خطأ CORS
- تأكد من أن `VITE_API_URL` في ملف `.env` صحيح
- تحقق من إعدادات CORS في API

### المشكلة: الملفات الثابتة لا تُحمّل
- تحقق من أذونات الملفات: `ls -la /var/www/crm-project/dist`
- تأكد من أن Nginx يقرأ من المجلد الصحيح

## نصائح إضافية

1. **النسخ الاحتياطي**: قم بعمل نسخ احتياطي دوري من مجلد `dist` وملف `.env`
2. **مراقبة الأداء**: استخدم أدوات مثل `htop` لمراقبة استخدام الموارد
3. **تحديثات الأمان**: قم بتحديث النظام بانتظام: `sudo apt update && sudo apt upgrade`
4. **مراقبة SSL**: تأكد من تجديد شهادة SSL قبل انتهائها (Certbot يقوم بذلك تلقائياً)

## هيكل الملفات النهائي

```
/var/www/crm-project/
├── dist/              # الملفات المبنية (يخدمها Nginx)
├── node_modules/      # التبعيات
├── src/               # الكود المصدري
├── .env               # متغيرات البيئة
├── package.json
├── vite.config.ts
└── update.sh          # سكريبت التحديث
```

## الدعم

إذا واجهت أي مشاكل، تحقق من:
- سجلات Nginx
- سجلات PM2 (إذا كنت تستخدمه)
- متغيرات البيئة في ملف `.env`
- إعدادات CORS في API

