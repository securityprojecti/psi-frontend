import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { companiesService } from '../services/companies'
import { auditsService } from '../services/audits'
import styles from './Companies.module.css'

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
      auditsService.list({ company: companyId }).catch(() => ({ data: [] })),
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

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brandMark}>CM</span>
          <div>
            <span className={styles.headerLabel}>// empresa</span>
            <h1 className={styles.headerTitle}>{company ? (company.name || company.company_name || company.title || 'Empresa') : 'Empresa'}</h1>
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
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : (
          <div>
            <h2 className={styles.sectionTitle}>Auditorias</h2>
            {audits.length === 0 ? (
              <p className={styles.empty}>Nenhuma auditoria para esta empresa.</p>
            ) : (
              <div className={styles.grid}>
                {audits.map((a) => {
                  const auditDate = a.created_at || a.date || a.timestamp || a.createdAt
                  const title = a.title || `Auditoria #${a.id}`
                  const label = auditDate ? `${title}` : title
                  return (
                    <div key={a.id} className={styles.card} onClick={() => navigate(`/audit/${a.id}/dashboard`)}>
                      <h3 className={styles.cardName}>{label}</h3>
                      {auditDate && (
                        <p className={styles.cardDate}>Criada em {formatDate(auditDate)}</p>
                      )}
                      <div className={styles.cardActions}>
                        <button className={styles.cardBtn} onClick={(e) => { e.stopPropagation(); navigate(`/audit/${a.id}/dashboard`) }}>
                          Abrir
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
