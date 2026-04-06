const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET all screens with filters
  router.get('/screens', (req, res) => {
    try {
      const { status } = req.query;
      let query = `
        SELECT
          s.id,
          s.serial_number,
          s.emulsion_type,
          s.emulsion_applied_at,
          s.exposure_time_seconds,
          s.print_cycles_limit,
          s.print_cycles_used,
          s.status,
          s.notes,
          s.created_at,
          s.updated_at
        FROM screens s
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND s.status = ?';
        params.push(status);
      }

      query += ' ORDER BY s.created_at DESC';

      const screens = db.prepare(query).all(...params);

      res.json({
        success: true,
        data: screens
      });
    } catch (error) {
      console.error('Error fetching screens:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении трафаретов'
      });
    }
  });

  // GET single screen with print_sessions count
  router.get('/screens/:id', (req, res) => {
    try {
      const { id } = req.params;

      const screen = db.prepare(`
        SELECT
          s.id,
          s.serial_number,
          s.emulsion_type,
          s.emulsion_applied_at,
          s.exposure_time_seconds,
          s.print_cycles_limit,
          s.print_cycles_used,
          s.status,
          s.notes,
          s.created_at,
          s.updated_at
        FROM screens s
        WHERE s.id = ?
      `).get(id);

      if (!screen) {
        return res.status(404).json({
          success: false,
          error: 'Трафарет не найден'
        });
      }

      // Get print sessions count for this screen
      const printSessions = db.prepare(`
        SELECT COUNT(*) as count FROM print_sessions WHERE screen_id = ?
      `).get(id);

      // Calculate warning flag
      const cyclesUsedPercent = (screen.print_cycles_used / screen.print_cycles_limit) * 100;
      const hasWarning = cyclesUsedPercent >= 90;

      res.json({
        success: true,
        data: {
          ...screen,
          printSessionsCount: printSessions?.count || 0,
          cyclesUsedPercent: cyclesUsedPercent.toFixed(1),
          hasWarning: hasWarning
        }
      });
    } catch (error) {
      console.error('Error fetching screen:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении трафарета'
      });
    }
  });

  // POST create new screen
  router.post('/screens', (req, res) => {
    try {
      const { serialNumber, emulsionType, emulsionAppliedAt, exposureTimeSeconds, printCyclesLimit } = req.body;

      // Validate required fields
      if (!serialNumber) {
        return res.status(400).json({
          success: false,
          error: 'Серийный номер обязателен'
        });
      }

      if (!printCyclesLimit || printCyclesLimit <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Лимит циклов печати должен быть положительным числом'
        });
      }

      // Check serial number uniqueness
      const existingScreen = db.prepare(`
        SELECT id FROM screens WHERE serial_number = ?
      `).get(serialNumber);

      if (existingScreen) {
        return res.status(400).json({
          success: false,
          error: 'Трафарет с таким серийным номером уже существует'
        });
      }

      // Create screen
      const result = db.prepare(`
        INSERT INTO screens
        (serial_number, emulsion_type, emulsion_applied_at, exposure_time_seconds, print_cycles_limit, print_cycles_used, status)
        VALUES (?, ?, ?, ?, ?, 0, 'ready')
      `).run(
        serialNumber,
        emulsionType || null,
        emulsionAppliedAt || null,
        exposureTimeSeconds || null,
        printCyclesLimit
      );

      const screenId = result.lastInsertRowid;

      // Fetch created screen
      const screen = db.prepare(`
        SELECT
          s.id,
          s.serial_number,
          s.emulsion_type,
          s.emulsion_applied_at,
          s.exposure_time_seconds,
          s.print_cycles_limit,
          s.print_cycles_used,
          s.status,
          s.notes,
          s.created_at,
          s.updated_at
        FROM screens s
        WHERE s.id = ?
      `).get(screenId);

      res.status(201).json({
        success: true,
        data: screen
      });
    } catch (error) {
      console.error('Error creating screen:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании трафарета'
      });
    }
  });

  // PUT update screen
  router.put('/screens/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { emulsionType, exposureResult, status, notes, printCyclesLimit } = req.body;

      const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(id);
      if (!screen) {
        return res.status(404).json({
          success: false,
          error: 'Трафарет не найден'
        });
      }

      // Update only provided fields
      const updateFields = [];
      const updateValues = [];

      if (emulsionType !== undefined) {
        updateFields.push('emulsion_type = ?');
        updateValues.push(emulsionType);
      }

      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }

      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
      }

      if (printCyclesLimit !== undefined) {
        if (printCyclesLimit <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Лимит циклов должен быть положительным числом'
          });
        }
        updateFields.push('print_cycles_limit = ?');
        updateValues.push(printCyclesLimit);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        db.prepare(`
          UPDATE screens
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `).run(...updateValues);
      }

      const updated = db.prepare(`
        SELECT
          s.id,
          s.serial_number,
          s.emulsion_type,
          s.emulsion_applied_at,
          s.exposure_time_seconds,
          s.print_cycles_limit,
          s.print_cycles_used,
          s.status,
          s.notes,
          s.created_at,
          s.updated_at
        FROM screens s
        WHERE s.id = ?
      `).get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating screen:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении трафарета'
      });
    }
  });

  // POST record exposure result
  router.post('/screens/:id/exposure', (req, res) => {
    try {
      const { id } = req.params;
      const { result, notes } = req.body;

      if (!result || (result !== 'success' && result !== 'defect')) {
        return res.status(400).json({
          success: false,
          error: 'Результат должен быть "success" или "defect"'
        });
      }

      const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(id);
      if (!screen) {
        return res.status(404).json({
          success: false,
          error: 'Трафарет не найден'
        });
      }

      // Determine new status based on exposure result
      let newStatus = screen.status;
      if (result === 'success') {
        newStatus = 'ready';
      } else if (result === 'defect') {
        newStatus = 'written_off';
      }

      // Update screen status and record notes if provided
      const updateQuery = notes !== undefined
        ? 'UPDATE screens SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        : 'UPDATE screens SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

      if (notes !== undefined) {
        db.prepare(updateQuery).run(newStatus, notes, id);
      } else {
        db.prepare(updateQuery).run(newStatus, id);
      }

      // Log exposure event
      db.prepare(`
        INSERT INTO exposure_events (screen_id, result, notes)
        VALUES (?, ?, ?)
      `).run(id, result, notes || null);

      const updated = db.prepare(`
        SELECT
          s.id,
          s.serial_number,
          s.emulsion_type,
          s.emulsion_applied_at,
          s.exposure_time_seconds,
          s.print_cycles_limit,
          s.print_cycles_used,
          s.status,
          s.notes,
          s.created_at,
          s.updated_at
        FROM screens s
        WHERE s.id = ?
      `).get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error recording exposure:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при записи результата облучения'
      });
    }
  });

  // GET stats: total, by status counts, avg cycles used
  router.get('/screens/stats', (req, res) => {
    try {
      // Total screens
      const totalResult = db.prepare(`
        SELECT COUNT(*) as count FROM screens
      `).get();

      // By status
      const byStatusResult = db.prepare(`
        SELECT status, COUNT(*) as count FROM screens GROUP BY status
      `).all();

      // Average cycles used
      const avgCyclesResult = db.prepare(`
        SELECT AVG(print_cycles_used) as avg_cycles_used FROM screens
      `).get();

      // Screens with warning (>= 90% used)
      const warningResult = db.prepare(`
        SELECT COUNT(*) as count FROM screens
        WHERE (print_cycles_used * 1.0 / print_cycles_limit) >= 0.9
      `).get();

      // Build status counts object
      const statusCounts = {};
      byStatusResult.forEach(row => {
        statusCounts[row.status] = row.count;
      });

      res.json({
        success: true,
        data: {
          total: totalResult?.count || 0,
          byStatus: statusCounts,
          avgCyclesUsed: (avgCyclesResult?.avg_cycles_used || 0).toFixed(1),
          withWarning: warningResult?.count || 0
        }
      });
    } catch (error) {
      console.error('Error fetching screen stats:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении статистики трафаретов'
      });
    }
  });

  return router;
};
