const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')
const { db, initDatabase } = require('./database')

const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

initDatabase()

app.use(cors({
  origin: isProd ? true : 'http://localhost:5173',
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())

// ── Базовые роуты (используют require('../database') внутри себя) ─────────
app.use('/api', require('./routes/auth'))
app.use('/api', require('./routes/materials'))
app.use('/api', require('./routes/techcards'))
app.use('/api', require('./routes/tasks'))
app.use('/api', require('./routes/dashboard'))
app.use('/api', require('./routes/events'))
app.use('/api', require('./routes/notifications'))

// ── Производственные модули (принимают db как аргумент) ───────────────────
app.use('/api', require('./routes/batches')(db))
app.use('/api', require('./routes/printing')(db))
app.use('/api', require('./routes/ink')(db))
app.use('/api', require('./routes/screens')(db))
app.use('/api', require('./routes/diecut')(db))
app.use('/api', require('./routes/perfume')(db))
app.use('/api', require('./routes/packaging')(db))
app.use('/api', require('./routes/checklist')(db))
app.use('/api', require('./routes/analytics')(db))
app.use('/api', require('./routes/export')(db))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' })
})

// ── Раздача фронтенда в production ───────────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`АромаПро API запущен на http://localhost:${PORT}`)
})
