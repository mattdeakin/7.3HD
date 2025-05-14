const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Corrected variable name
const {
    createTodo,
    getTodos,
    updateTodo,
    deleteTodo,
} = require('../controllers/todoController');

// All routes here are protected
router.route('/')
    .post(authMiddleware, createTodo)
    .get(authMiddleware, getTodos);

router.route('/:id')
    .put(authMiddleware, updateTodo)
    .delete(authMiddleware, deleteTodo);

module.exports = router;