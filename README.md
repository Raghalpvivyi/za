# TaskFlow Pro 📱
### تطبيق إدارة المهام الاحترافي
**Developed by راغب علي | Telegram: @xd_8z**

---

## 📋 نظرة عامة

TaskFlow Pro هو تطبيق إدارة مهام متكامل بمستوى تطبيقات عالمية، يدعم:
- **Web App** + **PWA** (يعمل مثل تطبيق موبايل)
- **APK** للأندرويد عبر Capacitor
- **Firebase** للمصادقة والمزامنة الفورية
- **Push Notifications** عبر FCM

---

## 🚀 التشغيل السريع

### 1. تشغيل محلي
```bash
# فتح index.html مباشرة في المتصفح
# أو استخدام Live Server
npx serve .
# أو
python3 -m http.server 3000
```

---

## ⚙️ إعداد Firebase الكامل

### الخطوة 1: إنشاء مشروع Firebase
1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
2. اضغط **"Add project"** → أدخل اسم المشروع
3. أوقف Google Analytics (اختياري) → **Create project**

### الخطوة 2: تفعيل Firebase Authentication
```
Firebase Console → Authentication → Get Started
تفعيل المزودين:
✅ Email/Password
✅ Google
✅ Facebook (تحتاج Facebook App ID)
```

### الخطوة 3: إعداد Firestore Database
```
Firebase Console → Firestore Database → Create database
اختر: Start in test mode
اختر المنطقة: europe-west (أقرب للعالم العربي)
```

### هيكل Firestore:
```
📁 users/
  └── {uid}/
        ├── name: string
        ├── email: string
        ├── avatar: string
        └── createdAt: timestamp

📁 tasks/
  └── {taskId}/
        ├── userId: string
        ├── title: string
        ├── notes: string
        ├── priority: "high" | "medium" | "low"
        ├── date: string (YYYY-MM-DD)
        ├── time: string (HH:MM)
        ├── reminder: string (minutes)
        ├── repeat: "daily" | "weekly" | "monthly"
        ├── projectId: string
        ├── tags: array
        ├── completed: boolean
        ├── completedAt: timestamp
        └── createdAt: timestamp

📁 projects/
  └── {projectId}/
        ├── userId: string
        ├── name: string
        └── color: string

📁 tags/
  └── {tagId}/
        ├── userId: string
        └── name: string
```

### الخطوة 4: استبدال Config في app.js
```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### الخطوة 5: إضافة Firebase SDK
أضف قبل `</body>` في index.html:
```html
<!-- Firebase -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
  import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
  
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  window.firebaseAuth = auth;
  window.firebaseDb = db;
</script>
```

---

## 🔐 إعداد تسجيل الدخول

### Google Login
```javascript
// في app.js — loginGoogle()
async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(window.firebaseAuth, provider);
  const user = result.user;
  completeLogin({
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    avatar: user.photoURL,
  });
}
```

### Facebook Login
1. اذهب إلى [developers.facebook.com](https://developers.facebook.com)
2. أنشئ App جديد → Facebook Login
3. أضف **OAuth Redirect URI**: `https://your-project.firebaseapp.com/__/auth/handler`
4. احصل على **App ID** و **App Secret**
5. أضفهما في Firebase Console → Authentication → Facebook

```javascript
import { FacebookAuthProvider } from "firebase/auth";
async function loginFacebook() {
  const provider = new FacebookAuthProvider();
  const result = await signInWithPopup(window.firebaseAuth, provider);
  // ...
}
```

### Instagram & TikTok Login
- Instagram: استخدم **Meta Login** (نفس Facebook SDK)
- TikTok: يتطلب [TikTok Developer Account](https://developers.tiktok.com)

```javascript
// TikTok OAuth
const TIKTOK_CLIENT_KEY = "your_client_key";
function loginTikTok() {
  const state = Math.random().toString(36).substring(7);
  const redirectUri = encodeURIComponent(window.location.origin + '/auth/tiktok');
  window.location.href = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=user.info.basic&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
}
```

---

## 📱 التحويل إلى APK (Capacitor)

### المتطلبات:
- Node.js 18+
- Android Studio
- Java JDK 17+

### الخطوات:

#### 1. تهيئة المشروع
```bash
# في مجلد المشروع
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "TaskFlow Pro" "com.taskflowpro.app" --web-dir "."
```

#### 2. إعداد capacitor.config.json
```json
{
  "appId": "com.taskflowpro.app",
  "appName": "TaskFlow Pro",
  "webDir": ".",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    },
    "LocalNotifications": {
      "smallIcon": "ic_stat_icon_config_sample",
      "iconColor": "#6C63FF"
    }
  }
}
```

#### 3. إضافة منصة Android
```bash
npx cap add android
npx cap sync
```

#### 4. تثبيت إضافة الإشعارات
```bash
npm install @capacitor/push-notifications @capacitor/local-notifications
npx cap sync
```

#### 5. فتح Android Studio
```bash
npx cap open android
```

#### 6. توليد APK
```
في Android Studio:
Build → Build Bundle(s) / APK(s) → Build APK(s)
```
الملف في: `android/app/build/outputs/apk/debug/app-debug.apk`

#### 7. APK للإنتاج (موقّع)
```
Build → Generate Signed Bundle / APK
→ Create new keystore (احفظ كلمة المرور جيداً!)
→ Release
```

---

## 🔔 إعداد Firebase Cloud Messaging (FCM)

### 1. الحصول على Server Key
```
Firebase Console → Project Settings → Cloud Messaging → Server Key
```

### 2. إضافة google-services.json
```
firebase console → Project settings → Your apps → Android
احصل على google-services.json وضعه في: android/app/
```

### 3. تفعيل FCM في الكود
```javascript
// في app.js
import { getMessaging, getToken, onMessage } from "firebase/messaging";
const messaging = getMessaging(app);

async function initFCM() {
  const token = await getToken(messaging, { 
    vapidKey: 'YOUR_VAPID_KEY' 
  });
  // احفظ token في Firestore للمستخدم
  await setDoc(doc(db, 'users', userId), { fcmToken: token }, { merge: true });
}
```

---

## 📦 هيكل الملفات

```
TaskFlow-Pro/
├── index.html          # الصفحة الرئيسية
├── styles.css          # التنسيقات الكاملة
├── app.js              # منطق التطبيق
├── sw.js               # Service Worker (PWA)
├── manifest.json       # PWA Manifest
├── README.md           # هذا الملف
├── icon-192.png        # أيقونة PWA (أضفها يدوياً)
├── icon-512.png        # أيقونة PWA (أضفها يدوياً)
└── capacitor.config.json (بعد npx cap init)
```

---

## 🌟 الميزات المطبّقة

| الميزة | الحالة |
|--------|--------|
| إضافة/تعديل/حذف مهام | ✅ |
| أولويات (عاجل/متوسط/منخفض) | ✅ |
| تاريخ ووقت المهمة | ✅ |
| نظام تذكير | ✅ |
| تكرار المهام | ✅ |
| مشاريع وتصنيفات | ✅ |
| بحث مباشر | ✅ |
| فلترة ذكية | ✅ |
| لوحة إحصائيات | ✅ |
| الوضع الليلي/النهاري | ✅ |
| دعم العربية والإنجليزية | ✅ |
| PWA (قابل للتثبيت) | ✅ |
| Offline Mode | ✅ |
| Toast Notifications | ✅ |
| إشعارات المتصفح | ✅ |
| تسجيل دخول بـ Email | ✅ |
| Google Login | ✅ (يحتاج Firebase) |
| Facebook Login | ✅ (يحتاج FB App) |

---

## 🎨 التخصيص

### تغيير الألوان الرئيسية
في `styles.css`:
```css
:root {
  --primary: #6C63FF;    /* اللون الأساسي */
  --secondary: #FF6584;  /* اللون الثانوي */
  --success: #10B981;
  --warning: #FBBF24;
  --danger: #EF4444;
}
```

---

## 📤 النشر على Google Play

1. توليد APK موقّع (مذكور أعلاه)
2. إنشاء حساب مطوّر: [play.google.com/console](https://play.google.com/console) (25$ مرة واحدة)
3. إنشاء تطبيق جديد
4. رفع APK/AAB
5. ملء معلومات المتجر (وصف، لقطات شاشة، أيقونة)
6. المراجعة والنشر (1-3 أيام)

---

## 👨‍💻 المطور

**راغب علي**  
Full-Stack Developer & UI/UX Designer

📱 Telegram: [@xd_8z](https://t.me/xd_8z)

---

© 2024 TaskFlow Pro — جميع الحقوق محفوظة لراغب علي
