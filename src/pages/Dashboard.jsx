import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { auditsService } from '../services/audits'
import { companiesService } from '../services/companies'
import styles from './Dashboard.module.css'

const STATUS = {
  CONFORME: 'conforme',
  NAO_CONFORME: 'nao_conforme',
  NAO_APLICA: 'nao_aplica',
}

const STATUS_LABEL = {
  conforme: 'Conforme',
  nao_conforme: 'Não Conforme',
  nao_aplica: 'N/A',
}

// ── Tiny donut chart (SVG) ───────────────────────────────────────────────────
function DonutChart({ pct, size = 120, stroke = 14, color = 'var(--accent)' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.donut}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--border)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text
        x="50%" y="50%"
        textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.18} fontWeight="800" fill="var(--ink)"
        fontFamily="inherit"
      >
        {pct}%
      </text>
    </svg>
  )
}

// ── Bar chart (SVG) ──────────────────────────────────────────────────────────
function BarChart({ data }) {
  // data: [{ label, pct, color }]
  const maxPct = 100
  const barH = 24
  const gap = 12
  const labelW = 160
  const barMaxW = 280
  const width = labelW + barMaxW + 60
  const height = data.length * (barH + gap)

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className={styles.barSvg}>
      {data.map((d, i) => {
        const y = i * (barH + gap)
        const barW = (d.pct / maxPct) * barMaxW
        return (
          <g key={i}>
            <text x={0} y={y + barH / 2 + 5}
              fontSize="11" fontFamily="var(--font-mono)"
              fill="var(--muted)" textAnchor="start"
            >
              {d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label}
            </text>
            <rect
              x={labelW} y={y}
              width={barMaxW} height={barH}
              fill="var(--border)" rx={3}
            />
            <rect
              x={labelW} y={y}
              width={barW} height={barH}
              fill={d.color} rx={3}
              style={{ transition: 'width 0.8s ease' }}
            />
            <text
              x={labelW + barW + 6} y={y + barH / 2 + 5}
              fontSize="11" fontWeight="700"
              fill="var(--ink)" fontFamily="inherit"
            >
              {d.pct}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Pie chart (SVG) ──────────────────────────────────────────────────────────
function PieChart({ slices, size = 200 }) {
  // slices: [{ label, value, color }]
  const total = slices.reduce((s, sl) => s + sl.value, 0)
  if (!total) return null

  let angle = -Math.PI / 2
  const cx = size / 2, cy = size / 2, r = size / 2 - 4

  const paths = slices.map((sl) => {
    const sweep = (sl.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: sl.color, label: sl.label, value: sl.value }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.path} fill={p.color} stroke="var(--white)" strokeWidth={2} />
      ))}
    </svg>
  )
}

// ── Evolution line chart ─────────────────────────────────────────────────────
function LineChart({ audits }) {
  // audits sorted oldest→newest: [{ label, pct }]
  if (audits.length < 2) return null
  const width = 500, height = 140, padL = 40, padB = 30, padT = 20, padR = 20
  const w = width - padL - padR
  const h = height - padB - padT

  const xs = audits.map((_, i) => padL + (i / (audits.length - 1)) * w)
  const ys = audits.map((a) => padT + h - (a.pct / 100) * h)

  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className={styles.lineSvg}>
      {/* grid */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padT + h - (v / 100) * h
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">{v}</text>
          </g>
        )
      })}
      {/* line */}
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" />
      {/* dots */}
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r={5} fill="var(--accent)" stroke="var(--white)" strokeWidth={2} />
          <text x={x} y={height - 6} textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">
            {audits[i].label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcStats(answers) {
  const applicable = answers.filter((a) => a.status !== STATUS.NAO_APLICA)
  const conformes = applicable.filter((a) => a.status === STATUS.CONFORME)
  const pct = applicable.length ? Math.round((conformes.length / applicable.length) * 100) : 0
  return { total: answers.length, applicable: applicable.length, conformes: conformes.length, pct }
}

function calcByType(answers) {
  const groups = {}
  answers.forEach((a) => {
    const t = a.control_info?.type || 'Geral'
    if (!groups[t]) groups[t] = []
    groups[t].push(a)
  })
  return Object.entries(groups).map(([type, ans]) => {
    const { applicable, conformes, pct } = calcStats(ans)
    return { type, applicable, conformes, pct, total: ans.length }
  })
}

function pctColor(pct) {
  if (pct >= 70) return 'var(--success)'
  if (pct >= 40) return '#d97706'
  return 'var(--error)'
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { auditId } = useParams()
  const navigate = useNavigate()

  const [audit, setAudit] = useState(null)
  const [allAudits, setAllAudits] = useState([]) // last 3 for same company
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // overview | compare

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await auditsService.get(auditId)
        setAudit(data)

        const listPromise = auditsService.list({ company: data.company, page_size: 3 })
        const companyPromise = !data.company_name && typeof data.company === 'number'
          ? companiesService.get(data.company)
          : Promise.resolve(null)

        const [listRes, companyRes] = await Promise.all([listPromise, companyPromise])

        if (companyRes?.data) {
          setCompanyName(companyRes.data.name || companyRes.data.company_name || '')
        }

        const allData = listRes?.data
        const list = Array.isArray(allData) ? allData : allData?.results || []
        setAllAudits(list.slice(0, 3).reverse())
      } catch {
        // handle error silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [auditId])

  // ── All hooks must be called unconditionally, before any early returns ──────
  const answers = audit?.answers || []

  const stats = useMemo(() => calcStats(answers), [answers])
  const byType = useMemo(() => calcByType(answers), [answers])

  const statusCounts = useMemo(() => {
    const conformes = answers.filter((a) => a.status === STATUS.CONFORME).length
    const naoConformes = answers.filter((a) => a.status === STATUS.NAO_CONFORME).length
    const notApplicable = answers.filter((a) => a.status === STATUS.NAO_APLICA).length
    const inProgress = answers.filter((a) => a.work_in_progress).length
    return { conformes, naoConformes, notApplicable, inProgress }
  }, [answers])

  const pieSlices = useMemo(() => [
    { label: 'Conforme', value: statusCounts.conformes, color: 'var(--success)' },
    { label: 'Não Conforme', value: statusCounts.naoConformes, color: 'var(--error)' },
    { label: 'N/A', value: statusCounts.notApplicable, color: '#ccc' },
  ], [statusCounts])

  const evolutionData = useMemo(() => allAudits.map((a, i) => {
    const ans = a.answers || []
    const { pct } = calcStats(ans)
    return {
      label: `#${i + 1}`,
      pct,
      id: a.id,
    }
  }), [allAudits])

  // ── Early returns AFTER all hooks ────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Carregando dashboard…</div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Auditoria não encontrada.</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brandMark}>CM</span>
          <div>
            <span className={styles.headerLabel}>// dashboard</span>
            <h1 className={styles.headerTitle}>Conformidade</h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          <Link to={`/audit/${auditId}/reports`} className={styles.btnReport}>
            Relatórios →
          </Link>
          <button className={styles.btnBack} onClick={() => navigate('/companies')}>
            Painel
          </button>
        </div>
      </header>

      {/* AUDIT META */}
      <div className={styles.metaBar}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Empresa</span>
          <span className={styles.metaValue}>{audit.company_name || companyName || (typeof audit.company === 'object' ? audit.company.name : `ID ${audit.company}`)}</span>
        </span>
        <span className={styles.metaDivider} />
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Data</span>
          <span className={styles.metaValue}>
            {new Date(audit.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </span>
        <span className={styles.metaDivider} />
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>Controles</span>
          <span className={styles.metaValue}>{answers.length}</span>
        </span>
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Visão Geral
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'compare' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          Comparativo
        </button>
      </div>

      <main className={styles.main}>
        {activeTab === 'overview' && (
          <>
            {/* KPIs */}
            <div className={styles.kpiRow}>
              <div className={styles.kpiCard}>
                <DonutChart pct={stats.pct} size={110} color={pctColor(stats.pct)} />
                <div className={styles.kpiInfo}>
                  <span className={styles.kpiLabel}>Conformidade Geral</span>
                  <span className={styles.kpiSub}>{stats.conformes} de {stats.applicable} controles aplicáveis</span>
                </div>
              </div>

              <div className={styles.kpiStats}>
                <div className={styles.kpiStat}>
                  <span className={styles.kpiStatNum} style={{ color: 'var(--success)' }}>
                      {statusCounts.conformes}
                  </span>
                  <span className={styles.kpiStatLabel}>Conformes</span>
                </div>
                <div className={styles.kpiStat}>
                  <span className={styles.kpiStatNum} style={{ color: 'var(--error)' }}>
                      {statusCounts.naoConformes}
                  </span>
                  <span className={styles.kpiStatLabel}>Não Conformes</span>
                </div>
                <div className={styles.kpiStat}>
                  <span className={styles.kpiStatNum} style={{ color: '#d97706' }}>
                      {statusCounts.inProgress}
                  </span>
                  <span className={styles.kpiStatLabel}>Em Andamento</span>
                </div>
                <div className={styles.kpiStat}>
                  <span className={styles.kpiStatNum} style={{ color: 'var(--muted)' }}>
                      {statusCounts.notApplicable}
                  </span>
                  <span className={styles.kpiStatLabel}>Não se Aplica</span>
                </div>
              </div>
            </div>

            {/* Charts grid */}
            <div className={styles.chartsGrid}>
              {/* Pie */}
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Distribuição</h3>
                <div className={styles.pieWrapper}>
                  <PieChart slices={pieSlices} size={180} />
                  <div className={styles.legend}>
                    {pieSlices.map((s) => (
                      <div key={s.label} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        <span className={styles.legendLabel}>{s.label}</span>
                        <span className={styles.legendVal}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar by type */}
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Por Tipo de Controle</h3>
                <BarChart
                  data={byType.map((t) => ({
                    label: t.type,
                    pct: t.pct,
                    color: pctColor(t.pct),
                  }))}
                />
              </div>
            </div>

            {/* By-type detail table */}
            <div className={styles.tableCard}>
              <h3 className={styles.chartTitle}>Detalhe por Tipo</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Total</th>
                    <th>Aplicáveis</th>
                    <th>Conformes</th>
                    <th>Conformidade</th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map((t) => (
                    <tr key={t.type}>
                      <td className={styles.tdType}>{t.type}</td>
                      <td>{t.total}</td>
                      <td>{t.applicable}</td>
                      <td>{t.conformes}</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{ background: pctColor(t.pct), color: '#fff' }}
                        >
                          {t.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'compare' && (
          <div className={styles.compareSection}>
            <div className={styles.compareHeader}>
              <h2 className={styles.compareTitle}>Evolução de Conformidade</h2>
              <p className={styles.compareSub}>Comparativo das últimas {allAudits.length} auditorias da empresa</p>
            </div>

            {allAudits.length < 2 ? (
              <div className={styles.noCompare}>
                <p>São necessárias ao menos 2 auditorias para comparação.</p>
                <Link to="/audit/new" className={styles.btnNewAudit}>+ Nova Auditoria</Link>
              </div>
            ) : (
              <>
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Evolução Geral (%)</h3>
                  <LineChart audits={evolutionData} />
                </div>

                <div className={styles.compareGrid}>
                  {allAudits.map((a, i) => {
                    const ans = a.answers || []
                    const s = calcStats(ans)
                    const isCurrentAudit = String(a.id) === String(auditId)
                    return (
                      <div key={a.id} className={`${styles.compareCard} ${isCurrentAudit ? styles.compareCardCurrent : ''}`}>
                        {isCurrentAudit && <span className={styles.currentBadge}>Atual</span>}
                        <span className={styles.compareAuditLabel}>Auditoria #{i + 1}</span>
                        <span className={styles.compareDate}>
                          {new Date(a.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <DonutChart pct={s.pct} size={90} color={pctColor(s.pct)} />
                        <div className={styles.compareMini}>
                          <span style={{ color: 'var(--success)' }}>{ans.filter((x) => x.status === STATUS.CONFORME).length} ✓</span>
                          <span style={{ color: 'var(--error)' }}>{ans.filter((x) => x.status === STATUS.NAO_CONFORME).length} ✗</span>
                          <span style={{ color: 'var(--muted)' }}>{ans.filter((x) => x.status === STATUS.NAO_APLICA).length} N/A</span>
                        </div>
                        {!isCurrentAudit && (
                          <Link to={`/audit/${a.id}/dashboard`} className={styles.compareLink}>
                            Ver →
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Diff table */}
                {allAudits.length >= 2 && (() => {
                  const prev = allAudits[allAudits.length - 2]
                  const curr = allAudits[allAudits.length - 1]
                  const currByType = calcByType(curr.answers || [])
                  const prevByType = calcByType(prev.answers || [])
                  return (
                    <div className={styles.tableCard}>
                      <h3 className={styles.chartTitle}>Variação por Tipo (última vs penúltima)</h3>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Tipo</th>
                            <th>Anterior</th>
                            <th>Atual</th>
                            <th>Variação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currByType.map((ct) => {
                            const pt = prevByType.find((p) => p.type === ct.type)
                            const prevPct = pt?.pct ?? '—'
                            const diff = pt ? ct.pct - pt.pct : null
                            return (
                              <tr key={ct.type}>
                                <td className={styles.tdType}>{ct.type}</td>
                                <td>{typeof prevPct === 'number' ? `${prevPct}%` : prevPct}</td>
                                <td>
                                  <span className={styles.badge} style={{ background: pctColor(ct.pct), color: '#fff' }}>
                                    {ct.pct}%
                                  </span>
                                </td>
                                <td>
                                  {diff !== null ? (
                                    <span style={{ color: diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--error)' : 'var(--muted)', fontWeight: 700 }}>
                                      {diff > 0 ? '+' : ''}{diff}pp
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}