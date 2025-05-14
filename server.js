require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const { collectDefaultMetrics, Registry } = require('prom-client');
const metricsExporter = require('./utils/metrics');

const authRoutes = require('./routes/authRoutes');
const todoRoutes = require('./routes/todoRoutes');

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));

// Prometheus Metrics Setup
const register = new Registry();
collectDefaultMetrics({ register }); // Collects default Node.js and process metrics

// Apply custom metrics and /metrics endpoint
metricsExporter.injectMetricsRoute(app, register);

app.get('/', (req, res) => res.send('Todo API Running'));

// Define Routes
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

module.exports = app; // For testing
