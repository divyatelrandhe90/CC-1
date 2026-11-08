require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');
const mcpHandler = require('./mcp');

if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is required. Copy .env.example to .env and configure it.'); process.exit(1); }
if (!process.env.FRONTEND_URL) { console.error('FRONTEND_URL is required for the CORS policy.'); process.exit(1); }
connectDB();
const app = express();
const frontendOrigin = process.env.FRONTEND_URL?.replace(/\/$/, '');
const corsOptions = {
  origin: [frontendOrigin, 'http://localhost:5173'].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
if (process.env.MCP_SECRET) {
  app.post(`/mcp/${process.env.MCP_SECRET}`, mcpHandler);
  app.get(`/mcp/${process.env.MCP_SECRET}`, (req, res) => res.status(405).json({ error: 'Method not allowed' }));
}
app.get('/', (req, res) => res.json({ success: true, message: 'Student Management System API is running' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/students', studentRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
