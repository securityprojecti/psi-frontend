import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // You could send this to an error tracking service
    // console.error('ErrorBoundary caught', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Algo deu errado</h2>
          <p>Ocorreu um erro inesperado. Recarregue a página ou tente novamente mais tarde.</p>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => window.location.reload()}>Recarregar</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
