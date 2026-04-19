const express = require('express')
const router = express.Router()
const { db } = require('../database')

router.get('/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const todayTasks = db.prepare(`SELECT COUNT(*) as total, SUM(quantity_planned) as planned, SUM(quantity_produced) as produced FROM production_tasks WHERE DATE(created_at) = ?`).get(today)
    const activeTasks = db.prepare(`SELECT COUNT(*) as cnt FROM production_tasks WHERE status = 'in_progress'`).get()
    const pendingTasks = db.prepare(`SELECT COUNT(*) as cnt FROM production_tasks WHERE status = 'planned'`).get()
    const completedTasks = db.prepare(`SELECT COUNT(*) as cnt FROM production_tasks WHERE status = 'completed' AND DATE(end_time) = ?`).get(today)
    
    const defectStats = db.prepare(`SELECT SUM(quantity_produced) as total_prod, SUM(quantity_defect) as total_defect FROM production_tasks WHERE status = 'completed'`).get()
    const defectRate = defectStats.total_prod > 0 ? Math.round((defectStats.total_defect / defectStats.total_prod) * 100 * 10) / 10 : 0

    const criticalMaterials = db.prepare(`SELECT COUNT(*) as cnt FROM materials WHERE quantity <= min_quantity`).get()
    const allMaterials = db.prepare(`SELECT id, name, quantity, min_quantity, unit FROM materials ORDER BY (quantity * 1.0 / NULLIF(min_quantity, 0)) ASC LIMIT 5`).all()
    const recentEvents = db.prepare(`SELECT e.*, u.name as user_name FROM events e LEFT JOIN users u ON e.user_id = u.id ORDER BY e.created_at DESC LIMIT 10`).all()

    const tasksByStatus = db.prepare(`SELECT status, COUNT(*) as cnt FROM production_tasks GROUP BY status`).all()

    res.json({
      success: true,
      data: {
        today: { plan: todayTasks.planned || 0, produced: todayTasks.produced || 0, tasks: todayTasks.total || 0 },
        active_tasks: activeTasks.cnt,
        pending_tasks: pendingTasks.cnt,
        completed_today: completedTasks.cnt,
        defect_rate: defectRate,
        critical_materials: criticalMaterials.cnt,
        materials: allMaterials,
        recent_events: recentEvents,
        tasks_by_status: tasksByStatus,
      }
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
