const express = require('express')
const router = express.Router()
const { db } = require('../database')

router.get('/events', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit
    const events = db.prepare(`
      SELECT e.*, u.name as user_name, u.role as user_role
      FROM events e 
      LEFT JOIN users u ON e.user_id = u.id 
      ORDER BY e.created_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset)
    const total = db.prepare('SELECT COUNT(*) as cnt FROM events').get()
    res.json({ success: true, data: events, pagination: { page, limit, total: total.cnt } })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
