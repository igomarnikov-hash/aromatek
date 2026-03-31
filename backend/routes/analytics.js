const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET /api/analytics — все данные для страницы аналитики
  router.get('/analytics', (req, res) => {
    try {
      const { days = 7 } = req.query;
      const daysNum = Math.min(Math.max(parseInt(days) || 7, 7), 30);

      // === 1. Производство по дням (последние N дней) ===
      const productionByDay = db.prepare(`
        SELECT
          date(created_at) as day,
          SUM(quantity_planned) as planned,
          SUM(COALESCE(quantity_produced, 0)) as produced,
          SUM(COALESCE(quantity_defect, 0)) as defect,
          COUNT(*) as tasks_count
        FROM production_tasks
        WHERE created_at >= date('now', '-' || ? || ' days')
        GROUP BY date(created_at)
        ORDER BY day ASC
      `).all(daysNum);

      // Заполняем пропущенные дни нулями
      const dayMap = {};
      productionByDay.forEach(d => { dayMap[d.day] = d; });
      const filledDays = [];
      for (let i = daysNum - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
        filledDays.push(dayMap[key]
          ? { ...dayMap[key], label }
          : { day: key, label, planned: 0, produced: 0, defect: 0, tasks_count: 0 }
        );
      }

      // === 2. Распределение статусов задач ===
      const statusDist = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM production_tasks
        GROUP BY status
      `).all();

      const STATUS_LABELS = {
        planned: 'Запланировано',
        in_progress: 'В работе',
        completed: 'Завершено',
        quality_check: 'Контроль качества'
      };
      const STATUS_COLORS = {
        planned: '#94a3b8',
        in_progress: '#f59e0b',
        completed: '#22c55e',
        quality_check: '#8b5cf6'
      };
      const taskStatusData = statusDist.map(s => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        color: STATUS_COLORS[s.status] || '#64748b'
      }));

      // === 3. Топ исполнителей (по завершённым задачам) ===
      const topWorkers = db.prepare(`
        SELECT
          u.name,
          COUNT(*) as completed,
          SUM(COALESCE(pt.quantity_produced, 0)) as total_produced,
          SUM(COALESCE(pt.quantity_defect, 0)) as total_defect
        FROM production_tasks pt
        JOIN users u ON pt.assigned_to = u.id
        WHERE pt.status = 'completed'
        GROUP BY pt.assigned_to
        ORDER BY completed DESC
        LIMIT 5
      `).all();

      // === 4. Топ техкарт по производству ===
      const topTechCards = db.prepare(`
        SELECT
          tc.name,
          COUNT(pt.id) as tasks_count,
          SUM(COALESCE(pt.quantity_produced, 0)) as total_produced
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        WHERE pt.status = 'completed'
        GROUP BY pt.tech_card_id
        ORDER BY total_produced DESC
        LIMIT 5
      `).all();

      // === 5. Процент брака по дням ===
      const defectByDay = filledDays.map(d => ({
        label: d.label,
        defect_pct: d.produced > 0
          ? parseFloat(((d.defect / d.produced) * 100).toFixed(1))
          : 0
      }));

      // === 6. Сводные KPI ===
      const kpi = db.prepare(`
        SELECT
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(COALESCE(quantity_planned, 0)) as total_planned,
          SUM(COALESCE(quantity_produced, 0)) as total_produced,
          SUM(COALESCE(quantity_defect, 0)) as total_defect
        FROM production_tasks
      `).get();

      const kpiResult = {
        totalTasks: kpi.total_tasks || 0,
        completedTasks: kpi.completed_tasks || 0,
        completionRate: kpi.total_tasks > 0
          ? Math.round((kpi.completed_tasks / kpi.total_tasks) * 100)
          : 0,
        totalPlanned: kpi.total_planned || 0,
        totalProduced: kpi.total_produced || 0,
        totalDefect: kpi.total_defect || 0,
        defectRate: kpi.total_produced > 0
          ? parseFloat(((kpi.total_defect / kpi.total_produced) * 100).toFixed(1))
          : 0,
        fulfillmentRate: kpi.total_planned > 0
          ? Math.round((kpi.total_produced / kpi.total_planned) * 100)
          : 0
      };

      res.json({
        success: true,
        data: {
          productionByDay: filledDays,
          taskStatusData,
          topWorkers,
          topTechCards,
          defectByDay,
          kpi: kpiResult,
          periodDays: daysNum
        }
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ success: false, error: 'Ошибка при загрузке аналитики' });
    }
  });

  return router;
};
