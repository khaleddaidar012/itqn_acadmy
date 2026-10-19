export type Region = 'EG' | 'INTL'
export type Currency = 'EGP' | 'USD'

export interface PricingPlan {
  id: string
  nameAr: string
  nameEn: string
  tierAr: string // الفضية, الذهبية, المميزة
  tierEn: string // Silver, Gold, Premium
  durationMinutes?: number
  billingPeriod?: 'package'
  billingMonths?: number
  sessionsPerWeek?: number
  sessionsPerMonth: number
  price: number
  originalPrice?: number
  siblingsOnly?: boolean
  currency: Currency
  studentsCount: number
  isPopular?: boolean
  descriptionAr?: string
  descriptionEn?: string
  featuresAr: string[]
  featuresEn: string[]
}

export interface ProgramCategory {
  id: string
  titleAr: string
  titleEn: string
  subtitleAr: string
  subtitleEn: string
  plans: PricingPlan[]
}

export interface PaymentMethodConfig {
  id: string
  nameAr: string
  nameEn: string
  type: 'vodafone_cash' | 'instapay' | 'bank_transfer' | 'paypal'
  details: {
    accountOrNumber: string
    name?: string
    notesAr: string
    notesEn: string
  }
}

export const PAYMENT_METHODS: Record<Region, PaymentMethodConfig[]> = {
  EG: [
    {
      id: 'vodafone_cash',
      nameAr: 'فودافون كاش',
      nameEn: 'Vodafone Cash',
      type: 'vodafone_cash',
      details: {
        accountOrNumber: '01277622042',
        name: 'أكاديمية إتقان',
        notesAr: 'تحويل مباشر لمحفظة فودافون كاش',
        notesEn: 'Direct transfer to Vodafone Cash wallet',
      },
    },
    {
      id: 'instapay',
      nameAr: 'إنستا باي (InstaPay)',
      nameEn: 'InstaPay',
      type: 'instapay',
      details: {
        accountOrNumber: '01277622042',
        name: 'أكاديمية إتقان',
        notesAr: 'تحويل فوري عبر تطبيق إنستا باي برقم الهاتف',
        notesEn: 'Instant transfer via InstaPay app using phone number',
      },
    },
  ],
  INTL: [
    {
      id: 'paypal',
      nameAr: 'باي بال (PayPal)',
      nameEn: 'PayPal',
      type: 'paypal',
      details: {
        accountOrNumber: 'academyiqtan3@gmail.com',
        name: 'ITQAN Quran Academy',
        notesAr: 'الدفع الآمن عبر حساب باي بال الخاص بالأكاديمية',
        notesEn: 'Secure payment via the Academy PayPal account',
      },
    },
    {
      id: 'bank_transfer',
      nameAr: 'تحويل بنكي دولي',
      nameEn: 'International Bank Transfer',
      type: 'bank_transfer',
      details: {
        accountOrNumber: 'تواصل عبر واتساب للحصول على بيانات التحويل البنكي',
        name: 'ITQAN Academy Damietta',
        notesAr: 'سيتم تزويدك برقم الآيبان IBAN عبر الواتساب فور الطلب',
        notesEn: 'IBAN and swift details will be provided via WhatsApp upon request',
      },
    },
  ],
}

export const ACADEMY_CONTACT = {
  nameAr: 'أكاديمية إتقان للقرآن الكريم',
  nameEn: 'ITQAN Quran Academy',
  taglineAr: 'خطوات صغيرة.. أثر كبير | تعلم القرآن الكريم.. ابنِ مستقبلك',
  taglineEn: 'Small Steps, Big Progress | Learn the Quran, Build Your Future',
  locationAr: 'دمياط، جمهورية مصر العربية',
  locationEn: 'Damietta, Egypt',
  email: 'academyiqtan3@gmail.com',
  whatsappNumber: '01277622042',
  whatsappRaw: '201277622042',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61577532029246',
  instagramHandle: 'academy_itqan_quran',
  instagramUrl: 'https://www.instagram.com/academy_itqan_quran',
  tiktokHandle: 'itqan.academy40',
  tiktokUrl: 'https://www.tiktok.com/@itqan.academy40',
}

// Egyptian Pricing (EGP)
export const EGYPT_PROGRAMS: ProgramCategory[] = [
  {
    id: 'memorization',
    titleAr: 'تحفيظ القرآن الكريم',
    titleEn: 'Quran Memorization',
    subtitleAr: 'حفظ وتثبيت القرآن الكريم مع معلمين ومعلمات ذوي خبرة ومتابعة مستمرة',
    subtitleEn: 'Memorize and retain the Holy Quran with experienced teachers and continuous follow-up',
    plans: [
      {
        id: 'eg-memo-30-4',
        nameAr: 'نصف ساعة — 4 حصص',
        nameEn: 'Half Hour — 4 Classes',
        tierAr: 'الفضية',
        tierEn: 'Silver',
        durationMinutes: 30,
        sessionsPerMonth: 4,
        price: 200,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصة أسبوعياً (نصف ساعة)', 'تسميع ومراجعة الحفظ', 'متابعة فردية مباشرة'],
        featuresEn: ['1 class per week (30 mins)', 'Recitation & revision', 'Direct 1-on-1 attention'],
      },
      {
        id: 'eg-memo-30-8',
        nameAr: 'نصف ساعة — 8 حصص',
        nameEn: 'Half Hour — 8 Classes',
        tierAr: 'الذهبية',
        tierEn: 'Gold',
        isPopular: true,
        durationMinutes: 30,
        sessionsPerMonth: 8,
        price: 350,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصتان أسبوعياً (نصف ساعة)', 'خطة حفظ شهرية منتظمة', 'تسميع ومراجعة شاملة', 'متابعة أسبوعية'],
        featuresEn: ['2 classes per week (30 mins)', 'Structured monthly plan', 'Comprehensive revision', 'Weekly progress review'],
      },
      {
        id: 'eg-memo-30-12',
        nameAr: 'نصف ساعة — 12 حصة',
        nameEn: 'Half Hour — 12 Classes',
        tierAr: 'المميزة',
        tierEn: 'Premium',
        durationMinutes: 30,
        sessionsPerMonth: 12,
        price: 500,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['3 حصص أسبوعياً (نصف ساعة)', 'تقدم مكثف وسريع', 'تثبيت متقن للمحفوظ', 'أولوية في اختيار الأوقات'],
        featuresEn: ['3 classes per week (30 mins)', 'Intensive progress', 'Solid retention', 'Flexible schedule priority'],
      },
      {
        id: 'eg-memo-45-4',
        nameAr: '45 دقيقة — 4 حصص',
        nameEn: '45 Minutes — 4 Classes',
        tierAr: 'الفضية',
        tierEn: 'Silver',
        durationMinutes: 45,
        sessionsPerMonth: 4,
        price: 275,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصة أسبوعياً (45 دقيقة)', 'شرح وتلقين وتصحيح', 'متابعة فردية متخصصة'],
        featuresEn: ['1 class per week (45 mins)', 'Direct teaching & correction', 'Personalized attention'],
      },
      {
        id: 'eg-memo-45-8',
        nameAr: '45 دقيقة — 8 حصص',
        nameEn: '45 Minutes — 8 Classes',
        tierAr: 'الذهبية',
        tierEn: 'Gold',
        isPopular: true,
        durationMinutes: 45,
        sessionsPerMonth: 8,
        price: 500,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصتان أسبوعياً (45 دقيقة)', 'وقت كافٍ للتسميع والتثبيت', 'خطة حفظ منهجية', 'تقرير تقدم دوري'],
        featuresEn: ['2 classes per week (45 mins)', 'Ample time for recitation & retention', 'Structured syllabus', 'Periodic report'],
      },
      {
        id: 'eg-memo-45-12',
        nameAr: '45 دقيقة — 12 حصة',
        nameEn: '45 Minutes — 12 Classes',
        tierAr: 'المميزة',
        tierEn: 'Premium',
        durationMinutes: 45,
        sessionsPerMonth: 12,
        price: 700,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['3 حصص أسبوعياً (45 دقيقة)', 'حفظ مكثف وتثبيت دائم', 'توجيه علمي مخصص', 'متابعة مكثفة'],
        featuresEn: ['3 classes per week (45 mins)', 'Intensive memorization', 'Expert guidance', 'Close monitoring'],
      },
      {
        id: 'eg-memo-60-4',
        nameAr: 'ساعة كاملة — 4 حصص',
        nameEn: 'One Hour — 4 Classes',
        tierAr: 'الفضية',
        tierEn: 'Silver',
        durationMinutes: 60,
        sessionsPerMonth: 4,
        price: 350,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصة أسبوعياً (60 دقيقة)', 'شرح وافٍ وتلقين متأني', 'مراجعة وتثبيت'],
        featuresEn: ['1 class per week (60 mins)', 'In-depth recitation & practice', 'Solid foundation'],
      },
      {
        id: 'eg-memo-60-8',
        nameAr: 'ساعة كاملة — 8 حصص',
        nameEn: 'One Hour — 8 Classes',
        tierAr: 'الذهبية',
        tierEn: 'Gold',
        isPopular: true,
        durationMinutes: 60,
        sessionsPerMonth: 8,
        price: 750,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصتان أسبوعياً (60 دقيقة)', 'تثبيت عميق وشرح للأحكام', 'مراجعة الماضي مع الجديد', 'متابعة شاملة'],
        featuresEn: ['2 classes per week (60 mins)', 'Deep retention & Tajweed notes', 'Systematic revision', 'Full follow-up'],
      },
      {
        id: 'eg-memo-60-12',
        nameAr: 'ساعة كاملة — 12 حصة',
        nameEn: 'One Hour — 12 Classes',
        tierAr: 'المميزة',
        tierEn: 'Premium',
        durationMinutes: 60,
        sessionsPerMonth: 12,
        price: 950,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['3 حصص أسبوعياً (60 دقيقة)', 'المسار المكثف المتكامل', 'إتقان التلاوة والحفظ معاً', 'أعلى مرونة في المواعيد'],
        featuresEn: ['3 classes per week (60 mins)', 'Full intensive track', 'Master recitation & memorization', 'Top scheduling priority'],
      },
    ],
  },
  {
    id: 'tajweed',
    titleAr: 'دورة التجويد',
    titleEn: 'Tajweed Course',
    subtitleAr: 'شرح نظري | تطبيق عملي | تصحيح للتلاوة — تعلّم أحكام التجويد وارتقِ بتلاوتك',
    subtitleEn: 'Theory, Practice & Recitation Correction — Master Tajweed rules step by step',
    plans: [
      {
        id: 'eg-tajweed-30-8',
        nameAr: 'نصف ساعة — 8 حصص شهرياً',
        nameEn: 'Half Hour — 8 Classes Monthly',
        tierAr: 'الفضية',
        tierEn: 'Silver',
        durationMinutes: 30,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 400,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصتان أسبوعياً (30 دقيقة)', 'شرح نظري مبسط', 'تطبيق عملي وتصحيح مخارج الحروف'],
        featuresEn: ['2 classes/week (30 mins)', 'Simplified theory', 'Practical articulation drills'],
      },
      {
        id: 'eg-tajweed-30-12',
        nameAr: 'نصف ساعة — 12 حصة شهرياً',
        nameEn: 'Half Hour — 12 Classes Monthly',
        tierAr: 'الذهبية',
        tierEn: 'Gold',
        isPopular: true,
        durationMinutes: 30,
        sessionsPerWeek: 3,
        sessionsPerMonth: 12,
        price: 550,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['3 حصص أسبوعياً (30 دقيقة)', 'تغطية شاملة لأحكام التجويد', 'تدريب مستمر وتصحيح التلاوة'],
        featuresEn: ['3 classes/week (30 mins)', 'Full coverage of rules', 'Continuous recitation practice'],
      },
      {
        id: 'eg-tajweed-30-16',
        nameAr: 'نصف ساعة — 16 حصة شهرياً',
        nameEn: 'Half Hour — 16 Classes Monthly',
        tierAr: 'المميزة',
        tierEn: 'Premium',
        durationMinutes: 30,
        sessionsPerWeek: 4,
        sessionsPerMonth: 16,
        price: 700,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['4 حصص أسبوعياً (30 دقيقة)', 'برنامج مكثف للإتقان السريع', 'اختبارات تقييمية مستمرة'],
        featuresEn: ['4 classes/week (30 mins)', 'Intensive mastery track', 'Periodic assessments'],
      },
      {
        id: 'eg-tajweed-45-4',
        nameAr: '45 دقيقة — 4 حصص',
        nameEn: '45 Minutes — 4 Classes',
        tierAr: 'الفضية',
        tierEn: 'Silver',
        durationMinutes: 45,
        sessionsPerMonth: 4,
        price: 275,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصة أسبوعياً (45 دقيقة)', 'شرح عملي وملاحظات تجويدية فردية'],
        featuresEn: ['1 class/week (45 mins)', 'Applied rules with individual notes'],
      },
      {
        id: 'eg-tajweed-45-8',
        nameAr: '45 دقيقة — 8 حصص',
        nameEn: '45 Minutes — 8 Classes',
        tierAr: 'الذهبية',
        tierEn: 'Gold',
        isPopular: true,
        durationMinutes: 45,
        sessionsPerMonth: 8,
        price: 500,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصتان أسبوعياً (45 دقيقة)', 'تطبيق عملي مباشر على الآيات', 'تصحيح دقيق للأداء'],
        featuresEn: ['2 classes/week (45 mins)', 'Direct verse application', 'Precise correction'],
      },
      {
        id: 'eg-tajweed-45-12',
        nameAr: '45 دقيقة — 12 حصة',
        nameEn: '45 Minutes — 12 Classes',
        tierAr: 'المميزة',
        tierEn: 'Premium',
        durationMinutes: 45,
        sessionsPerMonth: 12,
        price: 700,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['3 حصص أسبوعياً (45 دقيقة)', 'إتقان متكامل للأحكام ومخارج الحروف', 'تقييم شامل في نهاية الدورة'],
        featuresEn: ['3 classes/week (45 mins)', 'Complete mastery of rules & articulation', 'Comprehensive course evaluation'],
      },
      {
        id: 'eg-tajweed-60-8',
        nameAr: 'ساعة كاملة — 8 حصص شهرياً',
        nameEn: 'One Hour — 8 Classes Monthly',
        tierAr: 'الفضية',
        tierEn: 'Silver',
        durationMinutes: 60,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 800,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['حصتان أسبوعياً (60 دقيقة)', 'شرح متعمق مع المتون العلمية', 'تطبيق وتصحيح تفصيلي'],
        featuresEn: ['2 classes/week (60 mins)', 'In-depth study with classic texts', 'Detailed recitation correction'],
      },
      {
        id: 'eg-tajweed-60-12',
        nameAr: 'ساعة كاملة — 12 حصة شهرياً',
        nameEn: 'One Hour — 12 Classes Monthly',
        tierAr: 'الذهبية',
        tierEn: 'Gold',
        isPopular: true,
        durationMinutes: 60,
        sessionsPerWeek: 3,
        sessionsPerMonth: 12,
        price: 1100,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['3 حصص أسبوعياً (60 دقيقة)', 'برنامج تأهيلي متقدم للإتقان', 'تصحيح الوقف والابتداء والصفات'],
        featuresEn: ['3 classes/week (60 mins)', 'Advanced mastery program', 'Focus on Waqf, Ibtida, and attributes'],
      },
      {
        id: 'eg-tajweed-60-16',
        nameAr: 'ساعة كاملة — 16 حصة شهرياً',
        nameEn: 'One Hour — 16 Classes Monthly',
        tierAr: 'المميزة',
        tierEn: 'Premium',
        durationMinutes: 60,
        sessionsPerWeek: 4,
        sessionsPerMonth: 16,
        price: 1400,
        currency: 'EGP',
        studentsCount: 1,
        featuresAr: ['4 حصص أسبوعياً (60 دقيقة)', 'المسار الأكاديمي الشامل للتجويد', 'إتقان متكامل للأحكام ومخارج الحروف'],
        featuresEn: ['4 classes/week (60 mins)', 'Comprehensive academic track', 'Complete mastery of rules & articulation'],
      },
    ],
  },

{
  "id": "arabic",
  "titleAr": "دورة اللغة العربية",
  "titleEn": "Arabic Language Course",
  "subtitleAr": "دروس فردية للمرحلة الابتدائية — الوقت حسب احتياج الطالب، مع متابعة مستمرة لمستواه",
  "subtitleEn": "Private primary-school lessons — timing tailored to each student, with continuous progress follow-up",
  "plans": [
    {
      "id": "eg-arabic-primary-4",
      "nameAr": "4 حصص — لغة عربية",
      "nameEn": "4 Classes — Arabic",
      "tierAr": "الفضية",
      "tierEn": "Silver",
      "sessionsPerMonth": 4,
      "price": 500,
      "currency": "EGP",
      "studentsCount": 1,
      "billingPeriod": "package",
      "featuresAr": [
        "للطلاب في المرحلة الابتدائية",
        "حصة فردية لكل طالب",
        "الوقت يُحدد حسب احتياج الطالب وعدد الحصص المناسب له",
        "متابعة مستمرة لمستوى الطالب"
      ],
      "featuresEn": [
        "For primary-school students",
        "Private one-to-one lessons",
        "Timing is tailored to the student’s needs and suitable class count",
        "Continuous progress follow-up"
      ]
    },
    {
      "id": "eg-arabic-primary-8",
      "nameAr": "8 حصص — لغة عربية",
      "nameEn": "8 Classes — Arabic",
      "tierAr": "الذهبية",
      "tierEn": "Gold",
      "sessionsPerMonth": 8,
      "price": 850,
      "currency": "EGP",
      "studentsCount": 1,
      "billingPeriod": "package",
      "featuresAr": [
        "للطلاب في المرحلة الابتدائية",
        "حصة فردية لكل طالب",
        "الوقت يُحدد حسب احتياج الطالب وعدد الحصص المناسب له",
        "متابعة مستمرة لمستوى الطالب"
      ],
      "featuresEn": [
        "For primary-school students",
        "Private one-to-one lessons",
        "Timing is tailored to the student’s needs and suitable class count",
        "Continuous progress follow-up"
      ]
    },
    {
      "id": "eg-arabic-primary-12",
      "nameAr": "12 حصة — لغة عربية",
      "nameEn": "12 Classes — Arabic",
      "tierAr": "المميزة",
      "tierEn": "Premium",
      "sessionsPerMonth": 12,
      "price": 1100,
      "currency": "EGP",
      "studentsCount": 1,
      "billingPeriod": "package",
      "featuresAr": [
        "للطلاب في المرحلة الابتدائية",
        "حصة فردية لكل طالب",
        "الوقت يُحدد حسب احتياج الطالب وعدد الحصص المناسب له",
        "متابعة مستمرة لمستوى الطالب"
      ],
      "featuresEn": [
        "For primary-school students",
        "Private one-to-one lessons",
        "Timing is tailored to the student’s needs and suitable class count",
        "Continuous progress follow-up"
      ]
    }
  ]
},
]

// International Pricing (USD)
export const INTL_PROGRAMS: ProgramCategory[] = [
  {
    id: 'intl-classes',
    titleAr: 'باقات الطلاب الدوليين',
    titleEn: 'International Quran Classes',
    subtitleAr: 'تعليم القرآن الكريم بالإنجليزية والعربية لمسلمي العالم — معلمون متخصصون وتوقيتات مرنة',
    subtitleEn: 'Learn Quran worldwide with experienced teachers, flexible schedules, and 1-on-1 attention',
    plans: [
      {
        id: 'intl-half-1',
        nameAr: 'باقة النصف ساعة — طالب واحد',
        nameEn: 'Half Hour Package — 1 Student',
        tierAr: 'الفضية',
        tierEn: 'Silver',
        durationMinutes: 30,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 40,
        currency: 'USD',
        studentsCount: 1,
        featuresAr: ['حصتان أسبوعياً (30 دقيقة)', '8 حصص شهرياً', 'معلمون ومعلمات ذوو خبرة', 'بيئة تعليمية داعمة لجميع الأعمار'],
        featuresEn: ['2 days per week (30 mins class)', '8 classes monthly', 'Qualified & experienced teachers', 'Supportive environment for all ages'],
      },
      {
        id: 'intl-half-2',
        nameAr: "باقة الأخوين — معًا على طريق الإتقان",
        nameEn: "Two Siblings — Grow Together",
        tierAr: 'الذهبية',
        tierEn: 'Gold',
        isPopular: true,
        durationMinutes: 30,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 64,
        currency: 'USD',
        studentsCount: 2,
        descriptionAr: "رحلة واحدة تجمع أخوين… وتوفير 16 دولارًا كل شهر",
        descriptionEn: "One shared journey for two siblings — save $16 every month",
        featuresAr: ["8 حصص شهريًا للمجموعة — حصتان أسبوعيًا","مدة الحصة 30 دقيقة للمجموعة","السعر 64 دولارًا شهريًا للأخوين معًا، وليس لكل طالب","عرض حصري لأخوين يشتركان معًا","متابعة تقدم كل طالب"],
        featuresEn: ["8 group classes monthly — 2 per week","30 minutes per group class","$64 per month for both siblings, not per student","Exclusively for two siblings enrolling together","Progress tracking for each learner"],
        originalPrice: 80,
        siblingsOnly: true,
      },
      {
        id: 'intl-half-3',
        nameAr: "باقة 3 إخوة — إتقان يجمع العائلة",
        nameEn: "Three Siblings — A Family Journey",
        tierAr: 'المميزة',
        tierEn: 'Premium',
        durationMinutes: 30,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 90,
        currency: 'USD',
        studentsCount: 3,
        descriptionAr: "قرّبهم من القرآن… ووفر 30 دولارًا كل شهر",
        descriptionEn: "Bring them closer to the Quran — save $30 every month",
        featuresAr: ["8 حصص شهريًا للمجموعة — حصتان أسبوعيًا","مدة الحصة 30 دقيقة للمجموعة","السعر 90 دولارًا شهريًا للإخوة الثلاثة معًا","عرض حصري لثلاثة إخوة يشتركون معًا","متابعة تقدم كل طالب"],
        featuresEn: ["8 group classes monthly — 2 per week","30 minutes per group class","$90 per month for all three siblings together","Exclusively for three siblings enrolling together","Progress tracking for each learner"],
        originalPrice: 120,
        siblingsOnly: true,
      },
      {
        id: 'intl-half-promo-3mo',
        nameAr: 'خطة الـ 3 أشهر — باقة النصف ساعة',
        nameEn: '3-Month Plan — Half Hour Package',
        tierAr: 'المميزة (عرض خاص)',
        tierEn: 'Special 3-Month Offer',
        durationMinutes: 30,
        billingMonths: 3,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 28, // $28 per month
        currency: 'USD',
        studentsCount: 1,
        descriptionAr: 'وفر مع الاشتراك الفصلي — 28$ شهرياً (تدفع 84$ لـ 3 أشهر)',
        descriptionEn: 'Save with 3 months commitment — $28/month (billed $84 for 3 months)',
        featuresAr: ['حصتان أسبوعياً (30 دقيقة)', '8 حصص شهرياً لمدة 3 أشهر', 'أفضل قيمة مقابل سعر', 'التزام تعليمي مستمر ومثمر'],
        featuresEn: ['2 days per week (30 mins class)', '8 classes monthly for 3 months', 'Best value deal', 'Sustained Quran progress'],
      },
      {
        id: 'intl-full-1',
        nameAr: 'باقة الساعة الكاملة — طالب واحد',
        nameEn: 'One Hour Package — 1 Student',
        tierAr: 'الفضية',
        tierEn: 'Silver',
        durationMinutes: 60,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 80,
        currency: 'USD',
        studentsCount: 1,
        featuresAr: ['حصتان أسبوعياً (60 دقيقة)', '8 حصص شهرياً', 'تطبيق مكثف وتثبيت أسرع', 'الممارسة الأكبر = الإتقان الأفضل'],
        featuresEn: ['2 days per week (60 mins class)', '8 classes monthly', 'Intensive practice & faster progress', 'More Practice • Better Progress'],
      },
      {
        id: 'intl-full-2',
        nameAr: 'باقة الساعة الكاملة — طالبان',
        nameEn: 'One Hour Package — 2 Students',
        tierAr: 'الذهبية',
        tierEn: 'Gold',
        isPopular: true,
        durationMinutes: 60,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 128,
        currency: 'USD',
        studentsCount: 2,
        descriptionAr: 'وفر مع اشتراك الساعة لشخصين',
        descriptionEn: 'Save with 1-hour package for two learners',
        featuresAr: ['حصتان أسبوعياً (60 دقيقة)', '8 حصص شهرياً', 'مشاركة وتفاعل بين الطالبين', 'سعر مخفض ومميز'],
        featuresEn: ['2 days per week (60 mins class)', '8 classes monthly', 'Collaborative learning', 'Special discounted rate'],
      },
      {
        id: 'intl-full-3',
        nameAr: 'باقة الساعة الكاملة — 3 طلاب',
        nameEn: 'One Hour Package — 3 Students',
        tierAr: 'المميزة',
        tierEn: 'Premium',
        durationMinutes: 60,
        sessionsPerWeek: 2,
        sessionsPerMonth: 8,
        price: 240,
        currency: 'USD',
        studentsCount: 3,
        descriptionAr: 'المجموعة الصغيرة لساعة كاملة',
        descriptionEn: 'Small group for full hour classes',
        featuresAr: ['حصتان أسبوعياً (60 دقيقة)', '8 حصص شهرياً', 'تغطية واسعة للحفظ والتجويد', 'متابعة شاملة لجميع الطلاب'],
        featuresEn: ['2 days per week (60 mins class)', '8 classes monthly', 'Comprehensive Quran & Tajweed study', 'Personal attention for all 3'],
      },
    ],
  },
]
