import type { Project } from '@/types'

/**
 * بيانات الأعمال السابقة - يمكن تعديل هذا الملف لإضافة مشاريع جديدة
 * Data for portfolio projects - edit this file to add new projects
 */
export const projects: Project[] = [
  {
    id: 'nile-link-logistics',
    slug: 'nile-link-logistics',
    category: 'website',
    status: 'published',
    titleAr: 'Nile Link Logistics',
    titleEn: 'Nile Link Logistics',
    descriptionAr:
      'موقع إلكتروني متعدد اللغات لشركة شحن وخدمات لوجستية، يتضمن عرض الخدمات بوضوح وطلب عرض سعر بشكل مبسط.',
    descriptionEn:
      'A multilingual website for a shipping and logistics company, featuring clear service listings and a streamlined quote request system.',
    longDescriptionAr:
      'تم تصميم هذا الموقع ليكون واجهة احترافية لشركة Nile Link Logistics المتخصصة في الشحن والخدمات اللوجستية. يدعم الموقع اللغتين العربية والإنجليزية مع دعم كامل للـ RTL/LTR، ويتيح للعملاء الاطلاع على الخدمات المتاحة وطلب عروض الأسعار بسهولة.',
    longDescriptionEn:
      'Designed as a professional front-end for Nile Link Logistics, a shipping and logistics company. The site supports both Arabic and English with full RTL/LTR support, allowing clients to browse available services and easily request price quotes.',
    technologiesAr: ['Next.js', 'TypeScript', 'Tailwind CSS', 'دعم متعدد اللغات'],
    technologiesEn: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Multilingual Support'],
    featuresAr: [
      'دعم اللغة العربية والإنجليزية',
      'عرض تفصيلي للخدمات اللوجستية',
      'نموذج طلب عرض سعر',
      'تصميم متجاوب',
    ],
    featuresEn: [
      'Arabic & English language support',
      'Detailed logistics service listings',
      'Quote request form',
      'Responsive design',
    ],
    image: null,
    link: null,
    order: 1,
  },
  {
    id: 'spark-engineering-erp',
    slug: 'spark-engineering-erp',
    category: 'system',
    status: 'published',
    titleAr: 'Spark Engineering ERP',
    titleEn: 'Spark Engineering ERP',
    descriptionAr:
      'نظام متكامل لإدارة مشاريع شركة مقاولات، يشمل المواد والموردين والمقاولين والحسابات والتقارير.',
    descriptionEn:
      'A comprehensive ERP system for a contracting company, covering materials, suppliers, contractors, accounts, and reports.',
    longDescriptionAr:
      'نظام ERP مخصص طُوِّر لشركة Spark Engineering لإدارة عمليات المقاولات بكفاءة عالية. يغطي النظام دورة المشروع كاملة: من إدارة العمال والمقاولين الفرعيين، إلى متابعة المواد والموردين، وانتهاءً بالتقارير المالية التفصيلية.',
    longDescriptionEn:
      'A custom ERP system developed for Spark Engineering to efficiently manage contracting operations. The system covers the full project lifecycle: from managing workers and subcontractors, to tracking materials and suppliers, to detailed financial reports.',
    technologiesAr: ['Node.js', 'Express', 'React', 'إدارة الصلاحيات'],
    technologiesEn: ['Node.js', 'Express', 'React', 'Role-based Access Control'],
    featuresAr: [
      'إدارة المشاريع والمقاولين',
      'متابعة المواد والموردين',
      'نظام حسابات متكامل',
      'تقارير تفصيلية',
      'إدارة الصلاحيات',
    ],
    featuresEn: [
      'Project & contractor management',
      'Materials & supplier tracking',
      'Integrated accounting system',
      'Detailed reports',
      'Role-based access control',
    ],
    image: null,
    link: null,
    order: 2,
  },
  {
    id: 'el-kayan-crm',
    slug: 'el-kayan-crm',
    category: 'system',
    status: 'published',
    titleAr: 'El Kayan CRM',
    titleEn: 'El Kayan CRM',
    descriptionAr:
      'نظام لإدارة البرامج والحملات والعملاء والمدفوعات والمهام لشركة متخصصة في خدمات التدريب.',
    descriptionEn:
      'A CRM system for managing programs, campaigns, clients, payments, and tasks for a training services company.',
    longDescriptionAr:
      'تم تطوير هذا النظام لشركة El Kayan لتنظيم وإدارة عملياتها التدريبية بشكل شامل. يتيح النظام تتبع الحملات التسويقية والعملاء المحتملين وإدارة الاشتراكات والمدفوعات، إضافة إلى نظام مهام لمتابعة العمل اليومي للفريق.',
    longDescriptionEn:
      'Developed for El Kayan company to comprehensively organize and manage their training operations. The system enables tracking marketing campaigns and leads, managing subscriptions and payments, plus a task system for team daily workflow management.',
    technologiesAr: ['React', 'Node.js', 'MongoDB', 'Express', 'نظام إشعارات'],
    technologiesEn: ['React', 'Node.js', 'MongoDB', 'Express', 'Notification System'],
    featuresAr: [
      'إدارة الحملات والعملاء',
      'تتبع المدفوعات',
      'نظام مهام للفريق',
      'لوحة تحليلات',
      'إشعارات فورية',
    ],
    featuresEn: [
      'Campaign & client management',
      'Payment tracking',
      'Team task system',
      'Analytics dashboard',
      'Real-time notifications',
    ],
    image: null,
    link: null,
    order: 3,
  },
]

/**
 * للحصول على مشروع بالـ slug
 */
export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug && p.status === 'published')
}

/**
 * للحصول على المشاريع المنشورة فقط
 */
export function getPublishedProjects(): Project[] {
  return projects.filter((p) => p.status === 'published').sort((a, b) => a.order - b.order)
}
