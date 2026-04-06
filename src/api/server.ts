import express from 'express'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
