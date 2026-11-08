require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');
const mcpHandler = require('./mcp');
app.post('/mcp/:secret', (req, res) =>
  req.params.secret === process.env.MCP_SECRET
    ? mcpHandler(req, res)
    : res.status(404).json({ success: false, message: 'Route not found' })
);
const app = express();
const frontendOrigin = process.env.FRONTEND_URL?.replace(/\/$/, '');
const corsOptions = {
  origin: [frontendOrigin, 'https://cc-1-divya.netlify.app', 'http://localhost:5173'].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Accept', 'Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
if (process.env.MCP_SECRET) {
  app.post(`/mcp/${process.env.MCP_SECRET}`, mcpHandler);
  app.get(`/mcp/${process.env.MCP_SECRET}`, (req, res) => res.status(405).json({ error: 'Method not allowed' }));
}
app.get('/', (req, res) => res.json({ success: true, message: 'Student Management System API is running' }));
app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({ status: databaseConnected ? 'ok' : 'unavailable' });
});
app.use('/api/students', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ success: false, message: 'Database temporarily unavailable' });
  }
  next();
}, studentRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status === 400 ? 400 : 500;
  res.status(status).json({ success: false, message: status === 400 ? 'Invalid JSON request body' : 'Server error' });
});

const port = process.env.PORT || 5000;
const startServer = () => {
  const server = app.listen(port, () => console.log(`Server running on port ${port}`));
  server.on('error', (error) => {
    console.error(`HTTP server failed to listen (${error.code || error.name || 'Error'}). Check the Render PORT setting.`);
    process.exitCode = 1;
  });

  connectDB().catch((error) => {
    console.error(`MongoDB initialization failed (${error.name || 'Error'}). The API will remain available with database health reported as unavailable.`);
  });

  return server;
};

if (require.main === module) {
  try {
    startServer();
  } catch (error) {
    console.error(`HTTP server startup failed (${error.name || 'Error'}). Check the Render PORT setting.`);
    process.exitCode = 1;
  }
}

module.exports = { app, startServer };
