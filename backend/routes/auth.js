const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET all users for demo login
  router.get('/users', (req, res) => {
    try {
      const users = db.prepare(`
        SELECT id, name, role, avatar_color FROM users ORDER BY name
      `).all();

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении пользователей'
      });
    }
  });

  // POST login - demo auth (just takes user_id)
  router.post('/auth/login', (req, res) => {
    try {
      const userId = req.body.userId || req.body.user_id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'ID пользователя обязателен'
        });
      }

      const user = db.prepare(`
        SELECT id, name, role, avatar_color FROM users WHERE id = ?
      `).get(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден'
        });
      }

      // Log the login event
      db.prepare(`
        INSERT INTO events_log (user_id, action, details)
        VALUES (?, ?, ?)
      `).run(user.id, 'Вход в систему', `${user.name} вошел в систему`);

      res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          role: user.role,
          avatarColor: user.avatar_color
        }
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при входе в систему'
      });
    }
  });

  return router;
};
