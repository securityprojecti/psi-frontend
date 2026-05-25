import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { auditsService } from '../services/audits'
import { companiesService } from '../services/companies'
import styles from './Reports.module.css'

const STATUS = {
  CONFORME: 'conforme',
  NAO_CONFORME: 'nao_conforme',
  NAO_APLICA: 'nao_aplica',
}

const STATUS_LABEL = {
  conforme: 'Conforme',
  nao_conforme: 'Não Conforme',
  nao_aplica: 'Não se Aplica',
}

function calcStats(answers) {
  const applicable = answers.filter((a) => a.status !== STATUS.NAO_APLICA)
  const conformes = applicable.filter((a) => a.status === STATUS.CONFORME)
  const pct = applicable.length ? Math.round((conformes.length / applicable.length) * 100) : 0
  return { total: answers.length, applicable: applicable.length, conformes: conformes.length, pct }
}

function pctColor(pct) {
  if (pct >= 70) return 'var(--success)'
  if (pct >= 40) return '#d97706'
  return 'var(--error)'
}

function groupByType(answers) {
  const groups = {}
  answers.forEach((a) => {
    const t = a.control_info?.type || 'Geral'
    if (!groups[t]) groups[t] = []
    groups[t].push(a)
  })
  return groups
}

// Mini inline bar
function MiniBar({ pct }) {
  return (
    <div className={styles.miniBarOuter}>
      <div className={styles.miniBarFill} style={{ width: `${pct}%`, background: pctColor(pct) }} />
    </div>
  )
}

export default function Reports() {
  const { auditId } = useParams()
  const navigate = useNavigate()
  const printRef = useRef()

  const [audit, setAudit] = useState(null)
  const [allAudits, setAllAudits] = useState([])
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)

  // Report config
  const [reportType, setReportType] = useState('complete') // complete | bytype | compare
  const [filterType, setFilterType] = useState('') // for bytype
  const [compareWith, setCompareWith] = useState('') // audit id

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await auditsService.get(auditId)
        setAudit(data)
        if (!data.company_name && typeof data.company === 'number') {
          try {
            const { data: companyData } = await companiesService.get(data.company)
            setCompanyName(companyData.name || companyData.company_name || '')
          } catch {
            setCompanyName('')
          }
        }
        const { data: allData } = await auditsService.list()
        const list = Array.isArray(allData) ? allData : allData.results || []
        const companyAudits = list
          .filter((a) => a.company === data.company && String(a.id) !== String(auditId))
          .slice(0, 2)
        setAllAudits(companyAudits)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [auditId])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Carregando relatório…</div>
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

  const answers = audit.answers || []
  const stats = calcStats(answers)
  const grouped = groupByType(answers)
  const types = Object.keys(grouped)

  const compareAudit = allAudits.find((a) => String(a.id) === String(compareWith))
  const compareAnswers = compareAudit?.answers || []
  const compareGrouped = groupByType(compareAnswers)
  const compareStats = calcStats(compareAnswers)

  const dateStr = new Date(audit.date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  const isoLabel = audit.iso_type || audit.iso || audit.standard || audit.norm || 'ISO'
  const reportBrandName = `Diagnóstico ${isoLabel}`
  const reportBrandSub = isoLabel.includes('ISO')
    ? 'Conformidade da Informação'
    : 'Conformidade ISO'

  return (
    <div className={styles.page}>
      {/* HEADER — hidden on print */}
      <header className={styles.header + ' no-print'}>
        <div className={styles.headerLeft}>
          <span className={styles.brandMark}>CM</span>
          <div>
            <span className={styles.headerLabel}>// relatórios</span>
            <h1 className={styles.headerTitle}>Relatórios</h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          <Link to={`/audit/${auditId}/dashboard`} className={styles.btnBack}>← Dashboard</Link>
          <button className={styles.btnPrint} onClick={handlePrint}>⎙ Imprimir</button>
        </div>
      </header>

      {/* CONTROLS — hidden on print */}
      <div className={`${styles.controls} no-print`}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Tipo de Relatório</label>
          <div className={styles.segmented}>
            {[
              { value: 'complete', label: 'Completo' },
              { value: 'bytype', label: 'Por Tipo' },
              { value: 'compare', label: 'Comparativo' },
            ].map((opt) => (
              <button
                key={opt.value}
                className={`${styles.segment} ${reportType === opt.value ? styles.segmentActive : ''}`}
                onClick={() => setReportType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {reportType === 'bytype' && (
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Filtrar por tipo</label>
            <select
              className={styles.select}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Todos</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'compare' && (
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Comparar com</label>
            <select
              className={styles.select}
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
            >
              <option value="">Selecione uma auditoria…</option>
              {allAudits.map((a) => (
                <option key={a.id} value={a.id}>
                  Auditoria #{a.id} — {new Date(a.date).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── PRINTABLE REPORT ── */}
      <div className={styles.report} ref={printRef}>
        {/* Report header */}
        <div className={styles.reportHeader}>
          <div className={styles.reportBrand}>
            <span className={styles.reportBrandMark}>CM</span>
            <div>
              <p className={styles.reportBrandName}>{reportBrandName}</p>
              <p className={styles.reportBrandSub}>{reportBrandSub}</p>
            </div>
          </div>
          <div className={styles.reportMeta}>
            <p><strong>Empresa:</strong> {audit.company_name || companyName || (audit.company && typeof audit.company === 'object' ? audit.company.name : `Empresa #${audit.company}`)}</p>
            <p><strong>Data:</strong> {dateStr}</p>
            <p><strong>Auditoria:</strong> #{audit.id}</p>
            <p><strong>Relatório:</strong> {
              reportType === 'complete' ? 'Completo' :
              reportType === 'bytype' ? `Por Tipo${filterType ? ` — ${filterType}` : ''}` :
              'Comparativo'
            }</p>
          </div>
        </div>

        {/* ── SUMMARY ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Resumo Executivo</h2>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNum} style={{ color: pctColor(stats.pct) }}>{stats.pct}%</span>
              <span className={styles.summaryLabel}>Conformidade Geral</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNum}>{stats.conformes}</span>
              <span className={styles.summaryLabel}>Conformes</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNum}>{stats.applicable - stats.conformes}</span>
              <span className={styles.summaryLabel}>Não Conformes</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNum}>{stats.total - stats.applicable}</span>
              <span className={styles.summaryLabel}>Não Aplicáveis</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNum} style={{ color: '#d97706' }}>
                {answers.filter((a) => a.work_in_progress).length}
              </span>
              <span className={styles.summaryLabel}>Em Andamento</span>
            </div>
          </div>
        </div>

        {/* ── BY TYPE SUMMARY ── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Conformidade por Tipo de Controle</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Total</th>
                <th>Aplicáveis</th>
                <th>Conformes</th>
                <th>%</th>
                <th style={{ width: '180px' }}>Barra</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([type, ans]) => {
                const s = calcStats(ans)
                return (
                  <tr key={type}>
                    <td className={styles.tdBold}>{type}</td>
                    <td>{s.total}</td>
                    <td>{s.applicable}</td>
                    <td>{s.conformes}</td>
                    <td>
                      <span className={styles.pctBadge} style={{ background: pctColor(s.pct), color: '#fff' }}>
                        {s.pct}%
                      </span>
                    </td>
                    <td><MiniBar pct={s.pct} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── DETAIL ── (complete or bytype) */}
        {(reportType === 'complete' || reportType === 'bytype') && (
          <>
            {Object.entries(grouped)
              .filter(([type]) => !filterType || type === filterType)
              .map(([type, ans]) => {
                const s = calcStats(ans)
                return (
                  <div key={type} className={styles.section}>
                    <div className={styles.typeHeader}>
                      <h2 className={styles.typeTitle}>{type}</h2>
                      <span className={styles.typePct} style={{ background: pctColor(s.pct) }}>
                        {s.pct}%
                      </span>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Controle</th>
                          <th>Status</th>
                          <th>Em Andamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ans.map((a) => (
                          <tr key={a.id} className={a.status === STATUS.NAO_APLICA ? styles.rowNa : ''}>
                            <td className={styles.tdCode}>{a.control_info?.code || a.control}</td>
                            <td>{a.control_info?.title || '—'}</td>
                            <td>
                              <span className={`${styles.statusTag} ${styles[`st_${a.status}`]}`}>
                                {STATUS_LABEL[a.status] || a.status}
                              </span>
                            </td>
                            <td className={styles.tdCenter}>
                              {a.work_in_progress ? (
                                <span className={styles.wipTag}>WIP</span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
          </>
        )}

        {/* ── COMPARE ── */}
        {reportType === 'compare' && (
          compareWith && compareAudit ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Comparativo: Auditoria #{auditId} vs #{compareAudit.id}
              </h2>

              <div className={styles.compareKpis}>
                <div className={styles.compareCol}>
                  <p className={styles.compareColLabel}>Auditoria #{auditId} ({dateStr})</p>
                  <p className={styles.compareColPct} style={{ color: pctColor(stats.pct) }}>{stats.pct}%</p>
                  <p className={styles.compareColSub}>{stats.conformes}/{stats.applicable} conformes</p>
                </div>
                <div className={styles.compareVs}>VS</div>
                <div className={styles.compareCol}>
                  <p className={styles.compareColLabel}>
                    Auditoria #{compareAudit.id} ({new Date(compareAudit.date).toLocaleDateString('pt-BR')})
                  </p>
                  <p className={styles.compareColPct} style={{ color: pctColor(compareStats.pct) }}>{compareStats.pct}%</p>
                  <p className={styles.compareColSub}>{compareStats.conformes}/{compareStats.applicable} conformes</p>
                </div>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Atual (%)</th>
                    <th>Anterior (%)</th>
                    <th>Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([type, ans]) => {
                    const curr = calcStats(ans)
                    const prevAns = compareGrouped[type] || []
                    const prev = calcStats(prevAns)
                    const diff = prevAns.length ? curr.pct - prev.pct : null
                    return (
                      <tr key={type}>
                        <td className={styles.tdBold}>{type}</td>
                        <td>
                          <span className={styles.pctBadge} style={{ background: pctColor(curr.pct), color: '#fff' }}>
                            {curr.pct}%
                          </span>
                        </td>
                        <td>
                          {prevAns.length ? (
                            <span className={styles.pctBadge} style={{ background: pctColor(prev.pct), color: '#fff' }}>
                              {prev.pct}%
                            </span>
                          ) : '—'}
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

              {/* Row-by-row diff */}
              {Object.entries(grouped).map(([type, ans]) => {
                const prevAns = compareGrouped[type] || []
                if (!prevAns.length) return null
                return (
                  <div key={type} className={styles.section} style={{ marginTop: '1rem' }}>
                    <div className={styles.typeHeader}>
                      <h3 className={styles.typeTitle}>{type}</h3>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Controle</th>
                          <th>Atual</th>
                          <th>Anterior</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ans.map((a) => {
                          const prev = prevAns.find((p) => p.control === a.control)
                          const changed = prev && prev.status !== a.status
                          return (
                            <tr key={a.id} className={changed ? styles.rowChanged : ''}>
                              <td className={styles.tdCode}>{a.control_info?.code || a.control}</td>
                              <td>{a.control_info?.title || '—'}</td>
                              <td>
                                <span className={`${styles.statusTag} ${styles[`st_${a.status}`]}`}>
                                  {STATUS_LABEL[a.status]}
                                </span>
                              </td>
                              <td>
                                {prev ? (
                                  <span className={`${styles.statusTag} ${styles[`st_${prev.status}`]}`}>
                                    {STATUS_LABEL[prev.status]}
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
              })}
            </div>
          ) : (
            <div className={styles.noCompare}>
              {allAudits.length === 0
                ? 'Não há outras auditorias desta empresa para comparar.'
                : 'Selecione uma auditoria anterior para comparar.'}
            </div>
          )
        )}

        {/* Report footer */}
        <div className={styles.reportFooter}>
          <p>Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p>{reportBrandName}</p>
        </div>
      </div>
    </div>
  )
}