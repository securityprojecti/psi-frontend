import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { companiesService } from '../services/companies'
import { auditsService } from '../services/audits'
import styles from './Companies.module.css'

// Derive the dominant ISO from an audit's answers
function deriveIso(audit) {
  const answers = audit.answers || []
  const freq = {}
  answers.forEach((a) => {
    const iso = a.control_info?.iso_type
    if (iso) freq[iso] = (freq[iso] || 0) + 1
  })
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
  return sorted.length > 0 ? sorted[0][0] : 'Sem ISO'
}

export default function Company() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([
      companiesService.get(companyId).catch(() => null),
      auditsService.list({ company: companyId, page_size: 100 }).catch(() => ({ data: [] })),
    ])
      .then(([companyRes, auditsRes]) => {
        if (!mounted) return
        if (companyRes && companyRes.data) setCompany(companyRes.data)
        const list = auditsRes?.data
        const auditsList = Array.isArray(list) ? list : list?.results || []
        setAudits(auditsList)
      })
      .finally(() => mounted && setLoading(false))

    return () => { mounted = false }
  }, [companyId])

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  // Group by ISO derived from answers
  const isoGroups = useMemo(() => {
    const groups = {}
    audits.forEach((a) => {
      const iso = deriveIso(a)
      if (!groups[iso]) groups[iso] = []
      groups[iso].push(a)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [audits])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brandMark}>CM</span>
          <div>
            <span className={styles.headerLabel}>// empresa</span>
            <h1 className={styles.headerTitle}>
              {company ? (company.name || company.company_name || company.title || 'Empresa') : 'Empresa'}
            </h1>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.btnBack} onClick={() => navigate('/companies')}>
            ← Voltar
          </button>
          <button
            className={styles.btnAudit}
            onClick={() => navigate('/audit/new', { state: { companyId: parseInt(companyId, 10) } })}
          >
            Auditar
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loadingGrid}>
            {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : audits.length === 0 ? (
          <p className={styles.empty}>Nenhuma auditoria para esta empresa.</p>
        ) : (
          <div>
            {isoGroups.map(([iso, isoAudits]) => (
              <div key={iso} className={styles.isoGroup}>
                <div className={styles.isoGroupHeader}>
                  <h2 className={styles.isoGroupTitle}>{iso}</h2>
                  <span className={styles.isoGroupCount}>
                    {isoAudits.length} auditoria{isoAudits.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={styles.grid}>
                  {isoAudits.map((a) => {
                    const auditDate = a.created_at || a.date || a.timestamp || a.createdAt
                    const title = a.title || 'Auditoria'
                    return (
                      <div
                        key={a.id}
                        className={styles.card}
                        onClick={() => navigate(`/audit/${a.id}/dashboard`)}
                      >
                        <h3 className={styles.cardName}>{title}</h3>
                        {auditDate && (
                          <p className={styles.cardDate}>Criada em {formatDate(auditDate)}</p>
                        )}
                        <div className={styles.cardActions}>
                          <button
                            className={styles.cardBtn}
                            onClick={(e) => { e.stopPropagation(); navigate(`/audit/${a.id}/dashboard`) }}
                          >
                            Abrir
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}