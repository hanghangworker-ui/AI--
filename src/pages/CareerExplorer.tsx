// 职业与技能探索：方向匹配 + 技能雷达图 + 差距分析 + 学习路线 + 推荐（仅供参考标注）
import React from 'react'
import { Compass, Radar as RadarIcon, Route, Award, Info } from 'lucide-react'
import { useI18n } from '../i18n'
import { Card, Badge, ProgressBar } from '../components/ui'
import { Radar, RadarChart, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts'
import { careerProfiles, skillRadar } from '../data/mockData'
import { useNavigate } from 'react-router-dom'

const CareerExplorer: React.FC = () => {
  const { t, lang } = useI18n()
  const nav = useNavigate()

  // 差距分析：按 (target - score) 降序
  const gaps = [...skillRadar].map(s => ({ ...s, gap: s.target - s.score })).sort((a, b) => b.gap - a.gap)

  const paths = lang === 'zh' ? [
    { phase: '第 1-2 月', title: '补强算法基础', desc: 'LeetCode 每日一题 + 《算法导论》重点章节，目标：技能雷达「算法与数据结构」从 72 → 80' },
    { phase: '第 3-4 月', title: '机器学习实战', desc: '完成 2 个 Kaggle 项目（分类 + 回归），把「机器学习」从 78 → 85' },
    { phase: '第 5-6 月', title: '工程能力提升', desc: '参与课程设计或开源项目，补齐「工程实践」差距（当前 65，目标 80）' },
    { phase: '长期', title: '实习与证书', desc: '大三暑期争取算法实习；可考取软件设计师（软考中级）证书' },
  ] : [
    { phase: 'Month 1-2', title: 'Algorithm basics', desc: 'Daily LeetCode + focus chapters; radar 72 → 80' },
    { phase: 'Month 3-4', title: 'ML practice', desc: 'Two Kaggle projects; 78 → 85' },
    { phase: 'Month 5-6', title: 'Engineering', desc: 'Course projects or open source; 65 → 80' },
    { phase: 'Long-term', title: 'Internship & certs', desc: 'Algorithm internship in junior summer; Software Designer cert' },
  ]

  const certs = lang === 'zh'
    ? [
        { name: 'Kaggle Titanic / 房价预测入门赛', type: '项目', desc: '两个入门赛即可建立作品集雏形' },
        { name: '软件设计师（软考中级）', type: '证书', desc: '大四前考完，性价比高的行业认可' },
        { name: '课程设计：图书管理系统（含 SQL 优化）', type: '项目', desc: '结合数据库原理课，写出亮点简历项目' },
      ]
    : [
        { name: 'Kaggle Titanic / House Prices', type: 'Project', desc: 'Build portfolio foundations' },
        { name: 'Software Designer (RUANKAO)', type: 'Cert', desc: 'Cost-effective recognition' },
        { name: 'Library system with SQL tuning', type: 'Project', desc: 'Leverage DB course into a resume project' },
      ]

  return (
    <div className="fade-in space-y-5">
      <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Compass size={19} className="text-primary-500" />{t('career.title')}
      </h1>

      {/* 免责声明 */}
      <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5 flex items-center gap-2 text-xs text-slate-500">
        <Info size={13} className="text-slate-400 shrink-0" />{t('career.disclaimer')}
      </div>

      {/* 职业方向匹配 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {careerProfiles.map(p => (
          <Card key={p.id} hover>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-semibold text-slate-800 text-sm">{p.name}</span>
              <Badge tone={p.match >= 85 ? 'green' : p.match >= 75 ? 'primary' : 'slate'}>{p.match}%</Badge>
            </div>
            <ProgressBar value={p.match} tone={p.match >= 85 ? 'bg-teal-500' : 'bg-primary-400'} className="mb-2.5" />
            <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 技能雷达图 */}
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <RadarIcon size={15} className="text-primary-500" />{t('career.radar')}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillRadar} outerRadius="72%">
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#64748b' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                <Radar name={t('career.current')} dataKey="score" stroke="#1d40d0" fill="#1d40d0" fillOpacity={0.25} strokeWidth={2} />
                <Radar name={t('career.target')} dataKey="target" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.08} strokeWidth={2} strokeDasharray="5 3" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 技能差距分析 */}
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-4">{t('career.gap')}</div>
          <div className="space-y-4">
            {gaps.map((g, i) => (
              <div key={g.skill}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-slate-700 flex items-center gap-2">
                    {g.skill}
                    {i === 0 && g.gap > 0 && <Badge tone="amber">{t('career.gapItem')}</Badge>}
                  </span>
                  <span className="text-slate-500 text-xs">{g.score} → <b className="text-teal-600">{g.target}</b></span>
                </div>
                <div className="relative">
                  <ProgressBar value={g.score} tone="bg-primary-400" />
                  <div className="absolute top-0 h-2 w-0.5 bg-teal-500" style={{ left: `${g.target}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-400">
            {lang === 'zh' ? '「工程实践」与「算法与数据结构」差距最大，已在学习路线中优先安排。' : 'Engineering and algorithms have the largest gaps and are prioritized in the path.'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 学习路线 */}
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
            <Route size={15} className="text-teal-500" />{t('career.path')}
          </div>
          <div className="space-y-0">
            {paths.map((p, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-500'
                  }`}>{i + 1}</div>
                  {i < paths.length - 1 && <div className="w-0.5 flex-1 bg-primary-100 my-1" />}
                </div>
                <div className="pb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{p.title}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{p.phase}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => nav('/tasks')} className="btn-primary !text-xs mt-1">{t('nav.tasks')}</button>
        </Card>

        {/* 推荐项目与证书 */}
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5">
            <Award size={15} className="text-amber-500" />{t('career.cert')}
          </div>
          <div className="space-y-3">
            {certs.map(c => (
              <div key={c.name} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <Badge tone={c.type === (lang === 'zh' ? '项目' : 'Project') ? 'primary' : 'amber'}>{c.type}</Badge>
                <div className="flex-1">
                  <div className="text-sm text-slate-700 font-medium">{c.name}</div>
                  <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default CareerExplorer
