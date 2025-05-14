const jwt = require('jsonwebtoken');
// const User = require('../models/User'); // Not strictly needed if only using user.id from token

module.exports = async function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // This attaches { id: userId } to req
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};