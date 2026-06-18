# Notícias TI · EXSA

Central de notícias de tecnologia e inteligência artificial para os colaboradores da **Expresso Sul Americano**.

Desenvolvido e mantido pela **Equipe de Tecnologia da Informação da EXSA**.

---

## Sobre o projeto

O Notícias TI agrega, filtra e traduz automaticamente para PT-BR notícias de tecnologia de portais brasileiros e internacionais, blogs oficiais de IA e canais do YouTube especializados.

Sem cadastro. Sem login. Acesso aberto para todos os colaboradores.

**Acesso:** [noticias-exsa-ti.up.railway.app](https://noticias-exsa-ti.up.railway.app)

---

## Fontes monitoradas

| Categoria     | Fontes                                                   |
|---------------|----------------------------------------------------------|
| Brasil        | Canaltech, Olhar Digital, TecMundo, Exame, Google Notícias BR |
| Oficial IA    | OpenAI Blog, Google AI Blog, Microsoft AI, Anthropic     |
| Internacional | TechCrunch AI, The Verge AI, The Hacker News             |
| YouTube       | Olhar Digital, Canaltech, TecMundo, AI News Brasil, IA Brasil |

Para adicionar ou remover fontes, edite o arquivo `intel-sources.json` e faça um novo deploy.

---

## Tecnologias

- **Backend:** Node.js + Express
- **Frontend:** React 19 + Vite
- **Tradução:** Google Translate (automática, PT-BR)
- **Deploy:** Railway

---

## Rodando localmente

### Pré-requisitos

- Node.js 18 ou superior
- npm

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ti-conecta-exsa.git
cd ti-conecta-exsa

# Instale as dependências
npm install

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
```

### Desenvolvimento

```bash
npm run dev
```

Abre o servidor Express na porta 3010 e o Vite em paralelo com hot reload.

### Produção (local)

```bash
npm run build
npm start
```

---

## Variáveis de ambiente

| Variável | Descrição                                          | Padrão |
|----------|----------------------------------------------------|--------|
| `PORT`   | Porta do servidor (Railway define automaticamente) | `3010` |

---

## Deploy no Railway

1. Faça fork ou clone deste repositório no GitHub
2. Acesse [railway.app](https://railway.app) e crie um novo projeto
3. Selecione **Deploy from GitHub repo** e aponte para este repositório
4. Adicione a variável `TRANSLATE_EMAIL` nas configurações do projeto
5. Em **Settings → Networking**, configure o domínio como `ti-conecta-exsa`

O Railway executa automaticamente `npm run build` e depois `npm start`.

---

## Estrutura do projeto

```
ti-conecta-exsa/
├── intel-sources.json   # Lista de feeds RSS e canais YouTube
├── server.js            # Servidor Express (API + static)
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    └── pages/
        └── Blog.jsx     # Interface principal
```

---

## Atualização das fontes

As notícias são atualizadas automaticamente a cada 2 horas. Para forçar uma atualização manual, acesse o botão **Atualizar** na interface.

Para adicionar uma nova fonte RSS:

```json
{
  "id": "novo-id",
  "kind": "rss",
  "url": "https://exemplo.com/feed/",
  "source": "Nome da Fonte",
  "type": "Brasil"
}
```

Para adicionar um canal do YouTube:

```json
{
  "id": "novo-id",
  "kind": "youtube",
  "channelId": "ID_DO_CANAL",
  "name": "Nome do Canal"
}
```

---

*Equipe de Tecnologia da Informação · Expresso Sul Americano*