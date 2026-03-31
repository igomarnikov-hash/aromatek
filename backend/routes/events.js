const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET recent events with pagination
  router.get('/events', (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = db.prepare(`
        SELECT COUNT(*) as total FROM events_log
      `).get();

      // Get events with user names
      const events = db.prepare(`
        SELECT
          el.id,
          el.user_id,
          el.action,
          el.details,
          el.created_at,
          u.name as user_name,
          u.role,
          u.avatar_color
        FROM events_log el
        JOIN users u ON el.user_id = u.id
        ORDER BY el.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      const totalPages = Math.ceil(countResult.total / limit);

      res.json({
        success: true,
        data: {
          events: events,
          pagination: {
            page: page,
            limit: limit,
            total: countResult.total,
            totalPages: totalPages
          }
        }
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении событий'
      });
    }
  });

  return router;
};
