import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { companiesService } from '../services/companies'
import styles from './Companies.module.css'

function CompanyModal({ company, onClose, onSave, loading }) {
  const [name, setName] = useState(company?.name || '')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Informe o nome da empresa.')
      return
    }
    onSave(name.trim())
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.formTag}>// {company ? 'editar' : 'nova empresa'}</span>
          <h2 className={styles.modalTitle}>
            {company ? 'Editar' : 'Cadastrar'}<br />Empresa
          </h2>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label className={styles.label}>Nome da empresa</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              disabled={loading}
            />
            {error && <span className={styles.fieldError}>{error}</span>}
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? <span className={styles.spinner} /> : (company ? 'Salvar →' : 'Criar →')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmModal({ company, onClose, onConfirm, loading }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.formTag}>// atenção</span>
          <h2 className={styles.modalTitle}>Remover<br />Empresa</h2>
        </div>

        <p className={styles.confirmText}>
          Tem certeza que deseja remover <strong>{company.name}</strong>?
        </p>

        <div className={styles.modalActions}>
          <button
            className={styles.btnSecondary}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            className={styles.btnDanger}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Companies() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])
  const [fetching, setFetching] = useState(true)
  const [modal, setModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadCompanies = useCallback(async () => {
    setFetching(true)
    try {
      const { data } = await companiesService.list()
      const companiesData = Array.isArray(data) ? data : data.results
      setCompanies(companiesData || [])
    } catch {
      showToast('Erro ao carregar empresas.', 'error')
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  const handleCreate = async (name) => {
    setActionLoading(true)
    try {
      const { data } = await companiesService.create({ name })
      setCompanies((prev) => [data, ...prev])
      setModal(null)
      showToast(`"${data.name}" criada com sucesso!`)
    } catch {
      showToast('Erro ao criar empresa.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = async (name) => {
    setActionLoading(true)
    try {
      const { data } = await companiesService.update(modal.company.id, { name })
      setCompanies((prev) =>
        prev.map((c) => (c.id === data.id ? data : c))
      )
      setModal(null)
      showToast('Empresa atualizada!')
    } catch {
      showToast('Erro ao atualizar empresa.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await companiesService.remove(modal.company.id)
      setCompanies((prev) =>
        prev.filter((c) => c.id !== modal.company.id)
      )
      setModal(null)
      showToast('Empresa removida.')
    } catch {
      showToast('Erro ao remover empresa.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.brandMark}>CM</span>
          <div>
            <span className={styles.headerLabel}>// painel</span>
            <h1 className={styles.headerTitle}>Empresas</h1>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            className={styles.btnAudit}
            onClick={() => navigate('/audit/new')}
          >
            + Nova Auditoria
          </button>

          <button
            className={styles.btnCreate}
            onClick={() => setModal({ type: 'create' })}
          >
            + Nova empresa
          </button>

          <button className={styles.btnLogout} onClick={logout}>
            Sair →
          </button>
        </div>
      </header>

      {/* STATS */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{companies.length}</span>
          <span className={styles.statLabel}>empresas cadastradas</span>
        </div>
      </div>

      {/* MAIN */}
      <main className={styles.main}>
        {fetching ? (
          <div className={styles.loadingGrid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>Nenhuma empresa</h2>
            <p className={styles.emptyText}>Crie uma empresa para iniciar uma auditoria.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {companies.map((company) => (
              <div key={company.id} className={styles.card} onClick={() => navigate(`/companies/${company.id}`)}>
                <h3 className={styles.cardName}>{company.name}</h3>

                {company.created_at && (
                  <p className={styles.cardDate}>
                    Criada em {formatDate(company.created_at)}
                  </p>
                )}

                <div className={styles.cardActions}>
                  <button
                    className={`${styles.cardBtn} ${styles.cardBtnAudit}`}
                    onClick={(e) => { e.stopPropagation(); navigate('/audit/new', { state: { companyId: company.id } }) }}
                  >
                    Auditar
                  </button>

                  <button
                    className={styles.cardBtn}
                    onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit', company }) }}
                  >
                    Editar
                  </button>

                  <button
                    className={`${styles.cardBtn} ${styles.cardBtnDanger}`}
                    onClick={(e) => { e.stopPropagation(); setModal({ type: 'delete', company }) }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODALS */}
      {modal?.type === 'create' && (
        <CompanyModal onClose={() => setModal(null)} onSave={handleCreate} loading={actionLoading} />
      )}

      {modal?.type === 'edit' && (
        <CompanyModal company={modal.company} onClose={() => setModal(null)} onSave={handleEdit} loading={actionLoading} />
      )}

      {modal?.type === 'delete' && (
        <ConfirmModal company={modal.company} onClose={() => setModal(null)} onConfirm={handleDelete} loading={actionLoading} />
      )}

      {/* TOAST */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}