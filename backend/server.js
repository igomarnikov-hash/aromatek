const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { init: initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('short'));

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    const db = await initDatabase();

    // Routes
    const authRoutes = require('./routes/auth')(db);
    const materialsRoutes = require('./routes/materials')(db);
    const techcardsRoutes = require('./routes/techcards')(db);
    const tasksRoutes = require('./routes/tasks')(db);
    const dashboardRoutes = require('./routes/dashboard')(db);
    const eventsRoutes = require('./routes/events')(db);
    const exportRoutes = require('./routes/export')(db);
    const analyticsRoutes = require('./routes/analytics')(db);
    const checklistRoutes = require('./routes/checklist')(db);

    // Serve uploaded photos as static files
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    app.use('/api', authRoutes);
    app.use('/api', materialsRoutes);
    app.use('/api', techcardsRoutes);
    app.use('/api', tasksRoutes);
    app.use('/api', dashboardRoutes);
    app.use('/api', eventsRoutes);
    app.use('/api', exportRoutes);
    app.use('/api', analyticsRoutes);
    app.use('/api', checklistRoutes);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ success: true, message: 'Server is running' });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    });

    // Serve frontend static files in production
    // Checks multiple possible paths: Railway (../dist), local dev (../frontend/dist), Electron
    let frontendPath = path.join(__dirname, '..', 'dist');
    const fs = require('fs');
    if (!fs.existsSync(frontendPath)) {
      frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
    }
    if (process.resourcesPath) {
      frontendPath = path.join(process.resourcesPath, 'frontend', 'dist');
    }
    app.use(express.static(frontendPath));

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({
          success: false,
          error: 'Эндпоинт не найден'
        });
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });

    app.listen(PORT, () => {
      console.log(`Production system backend listening on port ${PORT}`);
      console.log(`Server started at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
