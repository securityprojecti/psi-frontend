import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Register.module.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: '', general: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Informe um nome de usuário.'
    if (!form.email.trim()) errs.email = 'Informe um e-mail.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'E-mail inválido.'
    if (!form.password) errs.password = 'Informe uma senha.'
    else if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres.'
    if (form.password !== form.confirm) errs.confirm = 'As senhas não conferem.'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const mapped = {}
        if (data.username) mapped.username = data.username[0]
        if (data.email) mapped.email = data.email[0]
        if (data.password) mapped.password = data.password[0]
        if (Object.keys(mapped).length > 0) setErrors(mapped)
        else setErrors({ general: 'Erro ao criar conta. Tente novamente.' })
      } else {
        setErrors({ general: 'Erro ao criar conta. Tente novamente.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.brandMark}>CM</span>
        <Link to="/login" className={styles.backLink}>← Voltar ao login</Link>
      </div>

      <div className={styles.content}>
        <div className={styles.formWrapper}>
          <div className={styles.formHeader}>
            <span className={styles.formTag}>// novo acesso</span>
            <h1 className={styles.formTitle}>Criar<br />Conta</h1>
          </div>

          {success ? (
            <div className={styles.successBox}>
              <span className={styles.successIcon}>✓</span>
              <div>
                <strong>Conta criada!</strong>
                <p>Redirecionando para o login…</p>
              </div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="username">Usuário</label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={form.username}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
                    placeholder="seu_usuario"
                    disabled={loading}
                  />
                  {errors.username && <span className={styles.fieldError}>{errors.username}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="voce@email.com"
                    disabled={loading}
                  />
                  {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">Senha</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    placeholder="mín. 6 caracteres"
                    disabled={loading}
                  />
                  {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="confirm">Confirmar senha</label>
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.confirm ? styles.inputError : ''}`}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  {errors.confirm && <span className={styles.fieldError}>{errors.confirm}</span>}
                </div>
              </div>

              {errors.general && (
                <div className={styles.error} role="alert">
                  <span className={styles.errorIcon}>!</span>
                  {errors.general}
                </div>
              )}

              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : 'Criar conta →'}
              </button>

              <p className={styles.switchLink}>
                Já tem conta?{' '}
                <Link to="/login" className={styles.link}>Entrar</Link>
              </p>
            </form>
          )}
        </div>

        <div className={styles.aside}>
          <div className={styles.asideContent}>
            <div className={styles.steps}>
              <div className={styles.step}>
                <span className={styles.stepNum}>01</span>
                <div>
                  <strong>Crie sua conta</strong>
                  <p>Cadastro rápido e gratuito</p>
                </div>
              </div>
              <div className={styles.stepLine} />
              <div className={styles.step}>
                <span className={styles.stepNum}>02</span>
                <div>
                  <strong>Faça login</strong>
                  <p>Acesse com suas credenciais</p>
                </div>
              </div>
              <div className={styles.stepLine} />
              <div className={styles.step}>
                <span className={styles.stepNum}>03</span>
                <div>
                  <strong>Gerencie</strong>
                  <p>Cadastre e organize suas empresas</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.asideDecor}>
            <div className={styles.bigLetter}>cm</div>
          </div>
        </div>
      </div>
    </div>
  )
}
