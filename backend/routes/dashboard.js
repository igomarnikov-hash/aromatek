const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET aggregated dashboard data
  router.get('/dashboard', (req, res) => {
    try {
      // Calculate today's plan progress
      const today = new Date().toISOString().split('T')[0];
      const todayTasks = db.prepare(`
        SELECT
          SUM(quantity_planned) as total_planned,
          SUM(quantity_produced) as total_produced,
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status IN ('completed') THEN 1 ELSE 0 END) as completed_tasks
        FROM production_tasks
        WHERE DATE(created_at) = ?
      `).get(today);

      const todayProgress = {
        quantityPlanned: todayTasks.total_planned || 0,
        quantityProduced: todayTasks.total_produced || 0,
        completionPercentage: todayTasks.total_planned > 0
          ? Math.round((todayTasks.total_produced / todayTasks.total_planned) * 100)
          : 0,
        completedTasks: todayTasks.completed_tasks || 0,
        totalTasks: todayTasks.total_tasks || 0
      };

      // Active tasks count
      const activeTasks = db.prepare(`
        SELECT COUNT(*) as count FROM production_tasks
        WHERE status IN ('planned', 'in_progress')
      `).get();

      // Calculate defect rate
      const defectStats = db.prepare(`
        SELECT
          SUM(quantity_produced) as total_produced,
          SUM(quantity_defect) as total_defect
        FROM production_tasks
        WHERE status = 'completed'
      `).get();

      const defectRate = defectStats.total_produced > 0
        ? Math.round((defectStats.total_defect / defectStats.total_produced) * 100)
        : 0;

      // Critical materials (below minimum quantity)
      const criticalMaterials = db.prepare(`
        SELECT id, name, quantity, min_quantity, unit, category
        FROM materials
        WHERE quantity < min_quantity
        ORDER BY quantity ASC
      `).all();

      // Recent events (last 10)
      const recentEvents = db.prepare(`
        SELECT
          el.id,
          el.user_id,
          el.action,
          el.details,
          el.created_at,
          u.name as user_name
        FROM events_log el
        JOIN users u ON el.user_id = u.id
        ORDER BY el.created_at DESC
        LIMIT 10
      `).all();

      res.json({
        success: true,
        data: {
          todayPlanProgress: todayProgress,
          activeTasksCount: activeTasks.count,
          defectRate: `${defectRate}%`,
          criticalMaterials: criticalMaterials,
          recentEvents: recentEvents
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении данных панели управления'
      });
    }
  });

  return router;
};
