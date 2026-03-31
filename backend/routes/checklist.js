const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = function(db) {
  const router = express.Router();

  // Setup multer for photo uploads
  const uploadDir = path.join(__dirname, '..', 'uploads', 'checklist');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `photo_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Разрешены только изображения'));
    }
  });

  const SECTION_LABELS = {
    '1S': 'Сортировка',
    '2S': 'Систематизация',
    '3S': 'Содержание в чистоте',
    '4S': 'Стандартизация',
    '5S': 'Совершенствование'
  };

  // GET /api/checklist/items — все пункты шаблона
  router.get('/checklist/items', (req, res) => {
    try {
      const items = db.prepare('SELECT * FROM checklist_items ORDER BY section, sort_order').all();
      // Группируем по секциям
      const grouped = {};
      items.forEach(item => {
        if (!grouped[item.section]) {
          grouped[item.section] = {
            section: item.section,
            label: SECTION_LABELS[item.section] || item.section,
            items: []
          };
        }
        grouped[item.section].items.push(item);
      });
      res.json({ success: true, data: Object.values(grouped) });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Ошибка загрузки пунктов чек-листа' });
    }
  });

  // GET /api/checklist/sessions — список сессий
  router.get('/checklist/sessions', (req, res) => {
    try {
      const sessions = db.prepare(`
        SELECT cs.*, u.name as conducted_by_name
        FROM checklist_sessions cs
        LEFT JOIN users u ON cs.conducted_by = u.id
        ORDER BY cs.created_at DESC
        LIMIT 20
      `).all();

      // Считаем процент для каждой сессии
      const result = sessions.map(s => ({
        ...s,
        score_pct: s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0
      }));

      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Ошибка загрузки сессий' });
    }
  });

  // POST /api/checklist/sessions — создать новую сессию
  router.post('/checklist/sessions', (req, res) => {
    try {
      const { userId, area } = req.body;

      const result = db.prepare(`
        INSERT INTO checklist_sessions (conducted_by, area) VALUES (?, ?)
      `).run(userId || null, area || 'Производственный цех');

      const sessionId = result.lastInsertRowid;

      // Создаём пустые ответы для всех пунктов
      const items = db.prepare('SELECT id FROM checklist_items').all();
      items.forEach(item => {
        db.prepare(`
          INSERT INTO checklist_responses (session_id, item_id, status) VALUES (?, ?, 'na')
        `).run(sessionId, item.id);
      });

      const session = db.prepare(`
        SELECT cs.*, u.name as conducted_by_name
        FROM checklist_sessions cs
        LEFT JOIN users u ON cs.conducted_by = u.id
        WHERE cs.id = ?
      `).get(sessionId);

      res.status(201).json({ success: true, data: session });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Ошибка создания сессии' });
    }
  });

  // GET /api/checklist/sessions/:id — сессия с ответами
  router.get('/checklist/sessions/:id', (req, res) => {
    try {
      const { id } = req.params;

      const session = db.prepare(`
        SELECT cs.*, u.name as conducted_by_name
        FROM checklist_sessions cs
        LEFT JOIN users u ON cs.conducted_by = u.id
        WHERE cs.id = ?
      `).get(id);

      if (!session) return res.status(404).json({ success: false, error: 'Сессия не найдена' });

      const responses = db.prepare(`
        SELECT cr.*, ci.section, ci.title, ci.description, ci.sort_order
        FROM checklist_responses cr
        JOIN checklist_items ci ON cr.item_id = ci.id
        WHERE cr.session_id = ?
        ORDER BY ci.section, ci.sort_order
      `).all(id);

      // Группируем по секциям
      const grouped = {};
      responses.forEach(r => {
        if (!grouped[r.section]) {
          grouped[r.section] = {
            section: r.section,
            label: SECTION_LABELS[r.section] || r.section,
            items: []
          };
        }
        grouped[r.section].items.push(r);
      });

      res.json({
        success: true,
        data: {
          session: { ...session, score_pct: session.max_score > 0 ? Math.round((session.score / session.max_score) * 100) : 0 },
          sections: Object.values(grouped)
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Ошибка загрузки сессии' });
    }
  });

  // PUT /api/checklist/responses/:id — обновить ответ (статус + комментарий)
  router.put('/checklist/responses/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;

      const response = db.prepare('SELECT * FROM checklist_responses WHERE id = ?').get(id);
      if (!response) return res.status(404).json({ success: false, error: 'Ответ не найден' });

      db.prepare(`
        UPDATE checklist_responses SET status = ?, comment = ? WHERE id = ?
      `).run(status || response.status, comment !== undefined ? comment : response.comment, id);

      // Пересчитываем score сессии
      recalculateScore(db, response.session_id);

      const updated = db.prepare('SELECT * FROM checklist_responses WHERE id = ?').get(id);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Ошибка обновления ответа' });
    }
  });

  // POST /api/checklist/responses/:id/photo — загрузить фото
  router.post('/checklist/responses/:id/photo', upload.single('photo'), (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) return res.status(400).json({ success: false, error: 'Файл не загружен' });

      const response = db.prepare('SELECT * FROM checklist_responses WHERE id = ?').get(id);
      if (!response) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, error: 'Ответ не найден' });
      }

      // Удаляем старое фото если есть
      if (response.photo_path) {
        const oldPath = path.join(__dirname, '..', response.photo_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const photoPath = `uploads/checklist/${req.file.filename}`;
      db.prepare('UPDATE checklist_responses SET photo_path = ? WHERE id = ?').run(photoPath, id);

      const updated = db.prepare('SELECT * FROM checklist_responses WHERE id = ?').get(id);
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Ошибка загрузки фото' });
    }
  });

  // DELETE /api/checklist/responses/:id/photo — удалить фото
  router.delete('/checklist/responses/:id/photo', (req, res) => {
    try {
      const { id } = req.params;
      const response = db.prepare('SELECT * FROM checklist_responses WHERE id = ?').get(id);
      if (!response) return res.status(404).json({ success: false, error: 'Ответ не найден' });

      if (response.photo_path) {
        const filePath = path.join(__dirname, '..', response.photo_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        db.prepare('UPDATE checklist_responses SET photo_path = NULL WHERE id = ?').run(id);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Ошибка удаления фото' });
    }
  });

  // PUT /api/checklist/sessions/:id/notes — сохранить заметки сессии
  router.put('/checklist/sessions/:id/notes', (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      db.prepare('UPDATE checklist_sessions SET notes = ? WHERE id = ?').run(notes || '', id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Ошибка сохранения' });
    }
  });

  function recalculateScore(db, sessionId) {
    const responses = db.prepare(
      "SELECT status FROM checklist_responses WHERE session_id = ?"
    ).all(sessionId);

    const answered = responses.filter(r => r.status !== 'na');
    const ok = responses.filter(r => r.status === 'ok').length;
    const maxScore = answered.length;
    const score = ok;

    db.prepare('UPDATE checklist_sessions SET score = ?, max_score = ? WHERE id = ?')
      .run(score, maxScore, sessionId);
  }

  return router;
};
