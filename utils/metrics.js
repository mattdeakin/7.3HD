const { Counter, Histogram, Gauge } = require('prom-client');

// Note: We register metrics with the register passed from server.js
// This avoids issues with multiple defaultRegisters if this file is required multiple times.

const createMetrics = (register) => {
    new Histogram({
        name: 'http_request_duration_ms',
        help: 'Duration of HTTP requests in ms',
        labelNames: ['method', 'route', 'code'],
        buckets: [50, 100, 200, 300, 400, 500, 1000, 2000],
        registers: [register]
    });

    new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'code'],
        registers: [register]
    });

    // Example custom gauge - you might not update this directly in middleware
    // but rather through specific application events.
    new Gauge({
        name: 'todo_api_active_users_gauge',
        help: 'Gauge of active users (conceptual)',
        registers: [register]
    });
};


module.exports = {
    injectMetricsRoute: (app, register) => {
        // Create and register metrics using the passed register
        createMetrics(register);
        const httpRequestDurationMicroseconds = register.getSingleMetric('http_request_duration_ms');
        const httpRequestsTotal = register.getSingleMetric('http_requests_total');

        // Middleware to capture response time and count requests
        app.use((req, res, next) => {
            const end = httpRequestDurationMicroseconds.startTimer();
            res.on('finish', () => {
                let route = req.route ? req.route.path : (req.baseUrl + req.path).toLowerCase();
                // Normalize dynamic routes
                route = route.replace(/\/[0-9a-fA-F]{24}(\/)?$/, '/{id}$1'); // For MongoDB ObjectIDs, keep trailing slash if present

                end({ route, code: res.statusCode, method: req.method });
                httpRequestsTotal.inc({ route, code: res.statusCode, method: req.method });
            });
            next();
        });

        // Metrics endpoint
        app.get('/metrics', async (req, res) => {
            try {
                res.set('Content-Type', register.contentType);
                res.end(await register.metrics());
            } catch (ex) {
                console.error("Error serving metrics:", ex);
                res.status(500).end(ex.toString());
            }
        });
    }
};