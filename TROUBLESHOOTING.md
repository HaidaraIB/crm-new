# دليل استكشاف الأخطاء وإصلاحها

## المشكلة: ظهور صفحة Nginx الافتراضية

إذا رأيت صفحة "Welcome to nginx!" فهذا يعني أن Nginx يعمل لكن الموقع لم يتم تكوينه بشكل صحيح.

### الحلول:

#### 1. التحقق من وجود ملف الإعدادات

```bash
# التحقق من وجود ملف الإعدادات
ls -la /etc/nginx/sites-available/crm-project

# إذا لم يكن موجوداً، قم بإنشائه
sudo nano /etc/nginx/sites-available/crm-project
```

#### 2. نسخ محتوى ملف الإعدادات

انسخ المحتوى التالي إلى الملف (تأكد من تغيير `your-domain.com` إلى اسم النطاق الخاص بك):

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

#### 3. تفعيل الموقع

```bash
# إنشاء رابط رمزي لتفعيل الموقع
sudo ln -s /etc/nginx/sites-available/crm-project /etc/nginx/sites-enabled/

# إزالة الموقع الافتراضي (اختياري)
sudo rm /etc/nginx/sites-enabled/default

# التحقق من صحة الإعدادات
sudo nginx -t
```

إذا ظهرت رسالة "syntax is ok" و "test is successful"، فتابع:

```bash
# إعادة تحميل Nginx
sudo systemctl reload nginx
```

#### 4. التحقق من وجود الملفات المبنية

```bash
# التحقق من وجود مجلد dist
ls -la /var/www/crm-project/dist

# إذا لم يكن موجوداً، قم ببناء المشروع
cd /var/www/crm-project
npm install
npm run build
```

#### 5. التحقق من الأذونات

```bash
# إعطاء أذونات صحيحة للملفات
sudo chown -R www-data:www-data /var/www/crm-project/dist
sudo chmod -R 755 /var/www/crm-project
```

#### 6. التحقق من السجلات

إذا لم يعمل الموقع بعد، تحقق من السجلات:

```bash
# سجلات الأخطاء
sudo tail -f /var/log/nginx/error.log

# سجلات الوصول
sudo tail -f /var/log/nginx/access.log
```

## مشاكل شائعة أخرى

### المشكلة: خطأ 502 Bad Gateway

**السبب**: المشكلة عادة في إعدادات Nginx أو الملفات غير موجودة.

**الحل**:
```bash
# 1. التحقق من وجود الملفات
ls -la /var/www/crm-project/dist/index.html

# 2. التحقق من أذونات الملفات
sudo chown -R www-data:www-data /var/www/crm-project/dist

# 3. التحقق من إعدادات Nginx
sudo nginx -t

# 4. إعادة تشغيل Nginx
sudo systemctl restart nginx
```

### المشكلة: خطأ 404 Not Found

**السبب**: الملفات غير موجودة في المسار المحدد أو قاعدة `try_files` غير صحيحة.

**الحل**:
```bash
# 1. التحقق من المسار في إعدادات Nginx
sudo nano /etc/nginx/sites-available/crm-project
# تأكد من أن root يشير إلى /var/www/crm-project/dist

# 2. التحقق من وجود الملفات
ls -la /var/www/crm-project/dist/

# 3. إعادة بناء المشروع إذا لزم الأمر
cd /var/www/crm-project
npm run build

# 4. إعادة تحميل Nginx
sudo systemctl reload nginx
```

### المشكلة: خطأ 403 Forbidden

**السبب**: مشكلة في الأذونات.

**الحل**:
```bash
# إعطاء أذونات صحيحة
sudo chown -R www-data:www-data /var/www/crm-project/dist
sudo chmod -R 755 /var/www/crm-project/dist
sudo chmod 644 /var/www/crm-project/dist/index.html
```

### المشكلة: الموقع يعمل لكن الصور/الملفات الثابتة لا تُحمّل

**السبب**: المسارات غير صحيحة أو الملفات غير موجودة.

**الحل**:
```bash
# 1. التحقق من وجود الملفات الثابتة
ls -la /var/www/crm-project/dist/assets/

# 2. التحقق من إعدادات Nginx للملفات الثابتة
# تأكد من وجود قاعدة location للملفات الثابتة في إعدادات Nginx

# 3. إعادة بناء المشروع
cd /var/www/crm-project
npm run build
```

### المشكلة: CORS errors في المتصفح

**السبب**: مشكلة في إعدادات API أو CORS.

**الحل**:
```bash
# 1. التحقق من ملف .env
cat /var/www/crm-project/.env
# تأكد من أن VITE_API_URL صحيح

# 2. إعادة بناء المشروع بعد تعديل .env
cd /var/www/crm-project
npm run build
```

## خطوات التحقق السريعة

قم بتشغيل هذه الأوامر بالترتيب للتحقق من كل شيء:

```bash
# 1. التحقق من حالة Nginx
sudo systemctl status nginx

# 2. التحقق من صحة إعدادات Nginx
sudo nginx -t

# 3. التحقق من وجود ملف الإعدادات
ls -la /etc/nginx/sites-available/crm-project
ls -la /etc/nginx/sites-enabled/crm-project

# 4. التحقق من وجود الملفات المبنية
ls -la /var/www/crm-project/dist/

# 5. التحقق من الأذونات
ls -la /var/www/crm-project/

# 6. التحقق من محتوى ملف index.html
head -20 /var/www/crm-project/dist/index.html
```

## إعادة الإعداد من الصفر

إذا كنت تريد إعادة الإعداد من البداية:

```bash
# 1. إيقاف Nginx
sudo systemctl stop nginx

# 2. حذف الإعدادات القديمة
sudo rm /etc/nginx/sites-enabled/crm-project
sudo rm /etc/nginx/sites-available/crm-project

# 3. إنشاء ملف إعدادات جديد
sudo nano /etc/nginx/sites-available/crm-project
# (انسخ المحتوى من أعلاه)

# 4. تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/crm-project /etc/nginx/sites-enabled/

# 5. إزالة الموقع الافتراضي
sudo rm /etc/nginx/sites-enabled/default

# 6. التحقق من الإعدادات
sudo nginx -t

# 7. بناء المشروع
cd /var/www/crm-project
npm run build

# 8. إعطاء الأذونات
sudo chown -R www-data:www-data /var/www/crm-project/dist
sudo chmod -R 755 /var/www/crm-project

# 9. تشغيل Nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

## نصائح إضافية

1. **استخدم `nginx -t` دائماً** قبل إعادة تحميل Nginx للتحقق من صحة الإعدادات
2. **تحقق من السجلات** عند حدوث مشاكل: `sudo tail -f /var/log/nginx/error.log`
3. **تأكد من بناء المشروع** قبل تشغيل Nginx: `npm run build`
4. **استخدم HTTPS** في الإنتاج: `sudo certbot --nginx -d your-domain.com`

