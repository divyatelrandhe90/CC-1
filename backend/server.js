require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');
const mcpHandler = require('./mcp');

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
const startServer = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await connectDB();
  return app.listen(port, () => console.log(`Server running on port ${port}`));
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Server startup failed (${error.name || 'Error'}). Check MongoDB connectivity and configuration.`);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
