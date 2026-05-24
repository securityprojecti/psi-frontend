import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Login.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/companies')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Usuário ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>CM</span>
          <span className={styles.brandName}>Company<br />Manager</span>
        </div>
        <div className={styles.tagline}>
          <p>Gerencie suas<br /><em>empresas</em> com<br />precisão.</p>
        </div>
        <div className={styles.decorGrid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.decorCell} />
          ))}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.formWrapper}>
          <div className={styles.formHeader}>
            <span className={styles.formTag}>// acesso</span>
            <h1 className={styles.formTitle}>Entrar</h1>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">Usuário</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                className={styles.input}
                placeholder="seu_usuario"
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {error && (
              <div className={styles.error} role="alert">
                <span className={styles.errorIcon}>!</span>
                {error}
              </div>
            )}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Acessar →'}
            </button>
          </form>

          <p className={styles.switchLink}>
            Não tem conta?{' '}
            <Link to="/register" className={styles.link}>Cadastrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
