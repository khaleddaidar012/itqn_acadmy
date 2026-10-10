import { CheckCircle2, Code2, Zap } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface AboutSectionProps {
  locale: Locale
}

const techStack = [
  'React', 'Next.js', 'Node.js', 'TypeScript',
  'MongoDB', 'Tailwind', 'Express',
]

export function AboutSection({ locale }: AboutSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const valueIcons = [CheckCircle2, Zap, Code2]

  return (
    <section
      id="about"
      className="section-padding bg-[#f1f4f8] dark:bg-[#0b1628]"
      aria-labelledby="about-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Visual Side */}
          <div className={`relative ${isRTL ? 'lg:order-2' : 'lg:order-1'}`}>
            <div className="bg-white dark:bg-[#132038] rounded-2xl border border-[#e2e8f0] dark:border-[#1e3456] shadow-[0_4px_24px_rgba(15,39,68,0.07)] p-5 sm:p-8 space-y-6">
              {/* Founder row */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#38bdf8] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  خ
                </div>
                <div>
                  <div className="font-bold text-[#0f2744] dark:text-[#e8f0fb] text-base">
                    {t.about.founderName}
                  </div>
                  <div className="text-sm text-[#4a6080] dark:text-[#94b4d4] leading-snug">
                    {t.about.founderRole}
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#e2e8f0] dark:bg-[#1e3456]" />

              {/* Tech Stack */}
              <div>
                <div className="text-xs font-semibold text-[#8fa3bb] uppercase tracking-[0.12em] mb-3">
                  {t.about.techStack}
                </div>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#f1f5f9] dark:bg-[#1a2d48] text-[#4a6080] dark:text-[#94b4d4] border border-[#e2e8f0] dark:border-[#1e3456]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Values */}
            <div className="mt-4 grid gap-3">
              {t.about.values.map((value, i) => {
                const Icon = valueIcons[i]
                return (
                  <div
                    key={value.title}
                    className="flex items-center gap-4 p-4 bg-white dark:bg-[#132038] rounded-xl border border-[#e2e8f0] dark:border-[#1e3456] shadow-[0_2px_8px_rgba(15,39,68,0.04)]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#eff8ff] dark:bg-[#0d1e38] flex items-center justify-center flex-shrink-0">
                      <Icon size={17} className="text-[#38bdf8]" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#0f2744] dark:text-[#e8f0fb] text-sm">
                        {value.title}
                      </div>
                      <div className="text-xs text-[#4a6080] dark:text-[#94b4d4]">
                        {value.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Text Side */}
          <div className={`${isRTL ? 'lg:order-1 text-right' : 'lg:order-2 text-left'} space-y-6`}>
            <div>
              <span className="section-label">{t.about.sectionLabel}</span>
              <h2 id="about-heading" className="section-title">
                {t.about.title}{' '}
                <span className="text-[#0284c7] dark:text-[#38bdf8]">{t.about.titleHighlight}</span>
              </h2>
            </div>
            <div className="space-y-4 text-[#4a6080] dark:text-[#94b4d4] leading-relaxed">
              <p className="text-base">{t.about.paragraph1}</p>
              <p className="text-sm">{t.about.paragraph2}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
