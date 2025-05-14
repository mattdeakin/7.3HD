const Todo = require('../models/Todo');

// @route   POST api/todos
// @desc    Create a todo
// @access  Private
exports.createTodo = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ msg: 'Text is required for a todo' });
        }
        const newTodo = new Todo({
            text: text,
            user: req.user.id, // req.user.id comes from authMiddleware
        });
        const todo = await newTodo.save();
        res.status(201).json(todo); // 201 for created
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error on create todo');
    }
};

// @route   GET api/todos
// @desc    Get all user's todos
// @access  Private
exports.getTodos = async (req, res) => {
    try {
        const todos = await Todo.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error on get todos');
    }
};

// @route   PUT api/todos/:id
// @desc    Update a todo
// @access  Private
exports.updateTodo = async (req, res) => {
    try {
        const { text, completed } = req.body;
        let todo = await Todo.findById(req.params.id);

        if (!todo) return res.status(404).json({ msg: 'Todo not found' });

        // Make sure user owns the todo
        if (todo.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        if (text !== undefined) todo.text = text;
        if (completed !== undefined) todo.completed = completed;

        await todo.save();
        res.json(todo);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Todo not found (invalid ID format)' });
        }
        res.status(500).send('Server Error on update todo');
    }
};

// @route   DELETE api/todos/:id
// @desc    Delete a todo
// @access  Private
exports.deleteTodo = async (req, res) => {
    try {
        let todo = await Todo.findById(req.params.id);
        if (!todo) return res.status(404).json({ msg: 'Todo not found' });

        if (todo.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await todo.deleteOne();
        res.json({ msg: 'Todo removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Todo not found (invalid ID format)' });
        }
        res.status(500).send('Server Error on delete todo');
    }
};