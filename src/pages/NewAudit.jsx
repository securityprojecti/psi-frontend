import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { companiesService } from '../services/companies'
import { auditsService, controlsService, answersService } from '../services/audits'
import styles from './NewAudit.module.css'

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

const ISO_TYPES = [
  { value: 'ISO 27001', label: 'ISO/IEC 27001', sub: 'Segurança da Informação' },
  { value: 'ISO 27701', label: 'ISO/IEC 27701', sub: 'Privacidade da Informação' },
]

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Empresa', 'Norma', 'Controles', 'Revisão']
  return (
    <div className={styles.steps}>
      {steps.map((label, i) => (
        <div
          key={i}
          className={`${styles.step} ${i === current ? styles.stepActive : ''} ${i < current ? styles.stepDone : ''}`}
        >
          <span className={styles.stepNum}>{i < current ? '✓' : i + 1}</span>
          <span className={styles.stepLabel}>{label}</span>
          {i < steps.length - 1 && <span className={styles.stepLine} />}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NewAudit() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // Step 0 – company
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  // Step 1 – norm
  const [selectedNorm, setSelectedNorm] = useState(null)

  // Step 2 – controls
  const [controls, setControls] = useState([])
  const [answers, setAnswers] = useState({}) // { controlId: { status, work_in_progress } }
  const [loadingControls, setLoadingControls] = useState(false)
  const [currentControlIdx, setCurrentControlIdx] = useState(0)

  // Step 3 – review & submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    companiesService.list().then(({ data }) => {
      const list = Array.isArray(data) ? data : data.results
      setCompanies(list || [])
    }).finally(() => setLoadingCompanies(false))
  }, [])

  const loadControls = async (norm) => {
    setLoadingControls(true)
    try {
      const { data } = await controlsService.list({ iso_type: norm })
      const list = Array.isArray(data) ? data : data.results
      setControls(list || [])
      // initialise blank answers
      const init = {}
      ;(list || []).forEach((c) => {
        init[c.id] = { status: '', work_in_progress: false }
      })
      setAnswers(init)
    } finally {
      setLoadingControls(false)
    }
  }

  const goNext = async () => {
    if (step === 1 && selectedNorm) {
      await loadControls(selectedNorm)
    }
    setStep((s) => s + 1)
  }

  const setAnswer = (controlId, field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [controlId]: { ...prev[controlId], [field]: value },
    }))
  }

  const currentControl = controls[currentControlIdx]
  const currentAnswer = currentControl ? answers[currentControl.id] : null
  const progress = controls.length ? Math.round(((currentControlIdx) / controls.length) * 100) : 0
  const allAnswered = controls.every((c) => answers[c.id]?.status !== '')

  // Group controls by type for review
  const grouped = controls.reduce((acc, c) => {
    const t = c.type || 'Geral'
    if (!acc[t]) acc[t] = []
    acc[t].push(c)
    return acc
  }, {})

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)
    try {
      // 1. Create audit
      const { data: audit } = await auditsService.create({ company: selectedCompany.id })
      // 2. Create all answers
      const payloads = controls.map((c) => ({
        audit: audit.id,
        control: c.id,
        status: answers[c.id].status,
        work_in_progress: answers[c.id].work_in_progress,
      }))
      await Promise.all(payloads.map((p) => answersService.create(p)))
      navigate(`/audit/${audit.id}/dashboard`)
    } catch (e) {
      setError('Erro ao salvar auditoria. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brandMark}>CM</span>
          <div>
            <span className={styles.headerLabel}>// nova auditoria</span>
            <h1 className={styles.headerTitle}>Diagnóstico</h1>
          </div>
        </div>
        <button className={styles.btnBack} onClick={() => navigate('/companies')}>
          ← Voltar
        </button>
      </header>

      <div className={styles.body}>
        <Steps current={step} />

        {/* ── STEP 0: Company ── */}
        {step === 0 && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.tag}>// passo 01</span>
              <h2 className={styles.panelTitle}>Selecione a<br />Empresa</h2>
            </div>

            {loadingCompanies ? (
              <div className={styles.loadingRow}>
                {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : companies.length === 0 ? (
              <p className={styles.empty}>Nenhuma empresa cadastrada.</p>
            ) : (
              <div className={styles.companyGrid}>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    className={`${styles.companyCard} ${selectedCompany?.id === c.id ? styles.companyCardSelected : ''}`}
                    onClick={() => setSelectedCompany(c)}
                  >
                    <span className={styles.companyInitial}>{c.name[0].toUpperCase()}</span>
                    <span className={styles.companyName}>{c.name}</span>
                    {selectedCompany?.id === c.id && <span className={styles.checkmark}>✓</span>}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.actions}>
              <button
                className={styles.btnPrimary}
                disabled={!selectedCompany}
                onClick={goNext}
              >
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Norm ── */}
        {step === 1 && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.tag}>// passo 02</span>
              <h2 className={styles.panelTitle}>Selecione a<br />Norma</h2>
            </div>

            <div className={styles.normGrid}>
              {ISO_TYPES.map((n) => (
                <button
                  key={n.value}
                  className={`${styles.normCard} ${selectedNorm === n.value ? styles.normCardSelected : ''}`}
                  onClick={() => setSelectedNorm(n.value)}
                >
                  <span className={styles.normCode}>{n.label}</span>
                  <span className={styles.normSub}>{n.sub}</span>
                  {selectedNorm === n.value && <span className={styles.normCheck}>✓</span>}
                </button>
              ))}
            </div>

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={() => setStep(0)}>← Anterior</button>
              <button
                className={styles.btnPrimary}
                disabled={!selectedNorm}
                onClick={goNext}
              >
                {loadingControls ? <span className={styles.spinner} /> : 'Próximo →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Controls ── */}
        {step === 2 && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.tag}>// passo 03 — controle {currentControlIdx + 1} de {controls.length}</span>
              <h2 className={styles.panelTitle}>Avaliação de<br />Controles</h2>
            </div>

            {/* Progress bar */}
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <p className={styles.progressLabel}>{progress}% respondido</p>

            {currentControl && (
              <div className={styles.controlCard}>
                <div className={styles.controlMeta}>
                  <span className={styles.controlCode}>{currentControl.code}</span>
                  <span className={styles.controlType}>{currentControl.type}</span>
                </div>
                <h3 className={styles.controlTitle}>{currentControl.title}</h3>
                <p className={styles.controlDesc}>{currentControl.description}</p>

                {/* Status buttons */}
                <div className={styles.statusRow}>
                  {Object.entries(STATUS).map(([key, val]) => (
                    <button
                      key={val}
                      className={`${styles.statusBtn} ${currentAnswer?.status === val ? styles[`statusBtn_${key}`] : ''}`}
                      onClick={() => {
                        setAnswer(currentControl.id, 'status', val)
                        if (val !== STATUS.NAO_CONFORME) {
                          setAnswer(currentControl.id, 'work_in_progress', false)
                        }
                      }}
                    >
                      {STATUS_LABEL[val]}
                    </button>
                  ))}
                </div>

                {/* WIP checkbox */}
                {currentAnswer?.status === STATUS.NAO_CONFORME && (
                  <label className={styles.wipLabel}>
                    <input
                      type="checkbox"
                      className={styles.wipCheck}
                      checked={currentAnswer.work_in_progress}
                      onChange={(e) => setAnswer(currentControl.id, 'work_in_progress', e.target.checked)}
                    />
                    <span>Existe trabalho em andamento para resolução?</span>
                  </label>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className={styles.controlNav}>
              <button
                className={styles.btnSecondary}
                disabled={currentControlIdx === 0}
                onClick={() => setCurrentControlIdx((i) => i - 1)}
              >
                ← Anterior
              </button>

              {currentControlIdx < controls.length - 1 ? (
                <button
                  className={styles.btnPrimary}
                  disabled={!currentAnswer?.status}
                  onClick={() => setCurrentControlIdx((i) => i + 1)}
                >
                  Próximo →
                </button>
              ) : (
                <button
                  className={styles.btnPrimary}
                  disabled={!allAnswered}
                  onClick={() => setStep(3)}
                >
                  Revisar →
                </button>
              )}
            </div>

            {/* Jump list */}
            <div className={styles.jumpList}>
              {controls.map((c, i) => {
                const ans = answers[c.id]
                const s = ans?.status
                return (
                  <button
                    key={c.id}
                    className={`${styles.jumpDot} ${i === currentControlIdx ? styles.jumpDotActive : ''} ${s === STATUS.CONFORME ? styles.jumpDotGood : s === STATUS.NAO_CONFORME ? styles.jumpDotBad : s === STATUS.NAO_APLICA ? styles.jumpDotNa : ''}`}
                    onClick={() => setCurrentControlIdx(i)}
                    title={c.code}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.tag}>// passo 04</span>
              <h2 className={styles.panelTitle}>Revisão<br />Final</h2>
            </div>

            <div className={styles.reviewMeta}>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Empresa</span>
                <span className={styles.reviewValue}>{selectedCompany?.name}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Norma</span>
                <span className={styles.reviewValue}>{selectedNorm}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Controles</span>
                <span className={styles.reviewValue}>{controls.length}</span>
              </div>
            </div>

            {Object.entries(grouped).map(([type, ctrls]) => {
              const applicable = ctrls.filter((c) => answers[c.id]?.status !== STATUS.NAO_APLICA)
              const conformes = applicable.filter((c) => answers[c.id]?.status === STATUS.CONFORME)
              const pct = applicable.length ? Math.round((conformes.length / applicable.length) * 100) : null

              return (
                <div key={type} className={styles.reviewGroup}>
                  <div className={styles.reviewGroupHeader}>
                    <span className={styles.reviewGroupName}>{type}</span>
                    {pct !== null && (
                      <span className={`${styles.reviewGroupPct} ${pct >= 70 ? styles.pctGood : pct >= 40 ? styles.pctMid : styles.pctBad}`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                  <div className={styles.reviewRows}>
                    {ctrls.map((c) => {
                      const ans = answers[c.id]
                      return (
                        <div key={c.id} className={styles.reviewRow}>
                          <span className={styles.reviewCode}>{c.code}</span>
                          <span className={`${styles.reviewStatus} ${styles[`rs_${ans?.status?.replace('-', '_')}`]}`}>
                            {STATUS_LABEL[ans?.status] || '—'}
                          </span>
                          {ans?.work_in_progress && (
                            <span className={styles.reviewWip}>WIP</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={() => setStep(2)}>← Editar</button>
              <button
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <span className={styles.spinner} /> : 'Finalizar Auditoria →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}