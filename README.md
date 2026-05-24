# Company Manager — Frontend

Interface React para o sistema de gerenciamento de empresas com autenticação JWT.

---

## Pré-requisitos

- Node.js 18+ instalado → https://nodejs.org
- Backend Django rodando em `http://localhost:8000`

---


### 1. Instale as dependências

```bash
npm install
```

Isso instala: React 18, React Router, Axios e Vite.

### 2. Garanta que o backend está rodando

O backend Django deve estar em `http://localhost:8000`.

Se ainda não está rodando:

```bash
# Na pasta do backend Django:
python manage.py runserver
```

> O Vite já está configurado com proxy: qualquer chamada para `/api/v1/...`
> é redirecionada automaticamente para `http://localhost:8000`.
> Então **não há problema de CORS** durante o desenvolvimento.

### 3. Rode o frontend

```bash
npm run dev
```

Acesse: **http://localhost:3000**
