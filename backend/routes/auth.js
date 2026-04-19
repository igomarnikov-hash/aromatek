const express = require('express')
const router = express.Router()
const { db } = require('../database')

router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, role, avatar_color FROM users ORDER BY id').all()
    res.json({ success: true, data: users })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/auth/login', (req, res) => {
  try {
    const { user_id } = req.body
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id обязателен' })
    const user = db.prepare('SELECT id, name, role, avatar_color FROM users WHERE id = ?').get(user_id)
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' })
    db.prepare('INSERT INTO events (user_id, action, details) VALUES (?, ?, ?)').run(user.id, 'Вход в систему', `Пользователь ${user.name} вошёл в систему`)
    res.json({ success: true, data: user })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
