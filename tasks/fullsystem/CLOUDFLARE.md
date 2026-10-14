# Cloudflare Workers + D1

استضافة النظام على Workers، وقاعدة البيانات في D1. تشغيل Next.js على Workers يستخدم OpenNext؛ الملفات المحلية ليست قاعدة البيانات في الإنتاج.

## الإعداد الفعلي
1. سجّل الدخول من جهازك: `npx wrangler login`.
2. أنشئ القاعدة: `npx wrangler d1 create itqan-academy`. انسخ `database_id` إلى binding المسمى `DB` في `wrangler.jsonc`؛ القيمة الموجودة حاليًا للتجربة المحلية فقط.
3. طبّق الجداول: `npm run db:migrate:remote`. لا يُحذف أي جدول موجود؛ لا تستورد بيانات SQLite القديمة على قاعدة مستخدمة قبل عمل نسخة احتياطية ومراجعة التعارضات.
4. اضبط الأسرار: `npx wrangler secret put ITQAN_ADMIN_EMAIL` ثم `npx wrangler secret put ITQAN_ADMIN_PASSWORD` ثم `npx wrangler secret put ITQAN_ADMIN_NAME`. أدخل القيم في المطالبة المحلية، ولا تحفظ كلمة المرور في Git.
5. انشر: `npm run deploy:cloudflare`. بعدها اختبر الدخول وإنشاء المعلمين والجدول، ثم احذف سر كلمة المرور الأولية بعد تفعيل حساب المدير.

بناء ونشر Cloudflare يفضّل تنفيذهما في Linux/WSL أو Cloudflare Builds؛ OpenNext يحذّر من عدم اكتمال دعم Windows. في إعداد Cloudflare Builds استخدم برنش `fullsystem` وأمر البناء `npm run build:cloudflare` وأمر النشر `npx opennextjs-cloudflare deploy`. اضبط أسرار النشر في Cloudflare Dashboard ولا تضعها في إعدادات عامة.

## تجربة محلية
`npm run db:migrate:local` ثم ضبط `ITQAN_USE_D1=1` وبيانات المدير محليًا، وتشغيل `npm run dev`. بيانات محاكاة D1 في `.wrangler` ولا تُرفع إلى Git. التشغيل بدون هذا المتغير يستخدم SQLite المحلية للتطوير. `npm run test:system:d1` يختبر الصلاحيات وعمليات النظام على محاكاة D1 مستقلة ببيانات مؤقتة.

بعد `npm run build:cloudflare` يمكن تشغيل `npm run test:system:worker` لاختبار نفس العمليات داخل Workers مع D1 فعليًا في المحاكي. يشمل الاختبار طلبين متزامنين لموعد واحد والتأجيل الذري، ويعزل البيانات والأسرار وإعدادات Wrangler في مجلد مؤقت. لا تشغّل أكثر من اختبار في الوقت نفسه لأن منفذها جميعًا 3107.

## الاجتماعات
المزوّد لم يُحسم بعد بين Google Meet وZoom. كلاهما يوفر API لإنهاء اجتماع، لكن يلزم تفويض حساب الأكاديمية وربط هوية المعلم بالمشارك الحقيقي؛ لا تعتبر ضغطة زر داخل الموقع حضورًا موثقًا من المزوّد.

- Google Meet: إعداد OAuth في Google Cloud وربط حساب صاحب مساحة الاجتماع، وإنشاء Spaces، والتقاط Participant Sessions/Workspace Events، واستخدام `spaces.endActiveConference` لإغلاق الحصة. يلزم معالجة تجديد التفويض.
- Zoom: إعداد تطبيق الحساب وتفويضه، وإنشاء الاجتماعات عبر API، والتحقق من توقيع Webhooks للدخول والخروج، وربط المعلم بهوية Zoom، وإنهاء الاجتماع عبر API.

الإغلاق المجدول يحتاج خدمة جدولة على Cloudflare مع إعادة المحاولة ومراقبة الفشل. لا توجد جدولة أو Webhooks أو اجتماعات خارجية مفعلة في هذه النسخة. لا تضع مفاتيح المزود في متغيرات تبدأ بـ NEXT_PUBLIC.

## الحالة
تم تجهيز إعدادات Workers وD1 والمخطط وطبقة قاعدة بيانات async وعمليات batch. لا توجد قاعدة D1 سحابية أو نشر فعلي حتى ربط الحساب وإضافة المعرّف الحقيقي. تحويل الإنتاج لا يستورد البيانات المحلية تلقائيًا. راجع نتائج الاختبارات قبل الإطلاق؛ مراقبة الأداء والنسخ الاحتياطي واستعادة كلمة المرور وتكامل الاجتماعات ما زالت ضمن مهام الإنتاج.

نجح بناء OpenNext على هذا الجهاز، ونجحت اختبارات النظام داخل Workers + D1 بالمحاكي، بما فيها تسجيل الحسابات والتحقق من كلمات المرور والصلاحيات والمستحقات. فحص الاتصال الحالي أظهر أن Wrangler غير مسجل بحساب Cloudflare. لا يوجد نشر فعلي أو اجتماع خارجي مفعّل.

مراجع التنفيذ: [OpenNext — الإعداد](https://opennext.js.org/cloudflare/get-started)، [D1](https://developers.cloudflare.com/d1/)، [Google Meet — إنهاء الاجتماع](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/endActiveConference)، [Zoom — أحداث الاجتماعات](https://developers.zoom.us/docs/api/meetings/events/).
