const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Todo = require('../models/Todo');
const jwt = require('jsonwebtoken'); // To decode token for user ID (alternative to db hit)

describe('Todo API', () => {
    let token;
    let userId;
    let user;

    beforeAll(async () => {
        // Connection handled by globalSetup
        // Create a user for these tests
        await User.deleteMany({}); // Clear users from other suites if any conflict
        user = new User({ username: 'todotestuser', password: 'password123' });
        await user.save();
        userId = user._id.toString();

        // Log in the user to get a token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ username: 'todotestuser', password: 'password123' });
        token = loginRes.body.token;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Todo.deleteMany({});
        await mongoose.connection.close(); // Close connection after all tests
    });

    beforeEach(async () => {
        await Todo.deleteMany({ user: userId }); // Clear todos for this user before each test
    });

    it('should create a new todo for an authenticated user', async () => {
        const res = await request(app)
            .post('/api/todos')
            .set('x-auth-token', token)
            .send({ text: 'My first test todo' });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('text', 'My first test todo');
        expect(res.body.user.toString()).toEqual(userId);
    });

    it('should not create a todo if text is missing', async () => {
        const res = await request(app)
            .post('/api/todos')
            .set('x-auth-token', token)
            .send({}); // Missing text
        expect(res.statusCode).toEqual(400);
        expect(res.body.msg).toBe('Text is required for a todo');
    });


    it('should get all todos for an authenticated user', async () => {
        await new Todo({ text: 'Todo 1', user: userId }).save();
        await new Todo({ text: 'Todo 2', user: userId }).save();

        const res = await request(app)
            .get('/api/todos')
            .set('x-auth-token', token);
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(2);
        expect(res.body[0].user.toString()).toEqual(userId);
    });

    it('should update a todo for an authenticated user', async () => {
        const todo = await new Todo({ text: 'Todo to update', user: userId }).save();

        const res = await request(app)
            .put(`/api/todos/${todo._id}`)
            .set('x-auth-token', token)
            .send({ completed: true, text: 'Updated todo text' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.completed).toBe(true);
        expect(res.body.text).toBe('Updated todo text');
    });

    it('should not update a todo belonging to another user', async () => {
        const otherUser = new User({ username: 'otheruser', password: 'password123' });
        await otherUser.save();
        const otherUsersTodo = await new Todo({ text: 'Other user todo', user: otherUser._id }).save();

        const res = await request(app)
            .put(`/api/todos/${otherUsersTodo._id}`)
            .set('x-auth-token', token) // Token for 'todotestuser'
            .send({ completed: true });
        expect(res.statusCode).toEqual(401); // Or 403 Forbidden
        expect(res.body.msg).toBe('Not authorized');
    });


    it('should delete a todo for an authenticated user', async () => {
        const todo = await new Todo({ text: 'Todo to delete', user: userId }).save();

        const res = await request(app)
            .delete(`/api/todos/${todo._id}`)
            .set('x-auth-token', token);
        expect(res.statusCode).toEqual(200);
        expect(res.body.msg).toBe('Todo removed');

        const foundTodo = await Todo.findById(todo._id);
        expect(foundTodo).toBeNull();
    });

    it('should return 401 if trying to access todos without token', async () => {
        const res = await request(app)
            .get('/api/todos');
        expect(res.statusCode).toEqual(401);
        expect(res.body.msg).toBe('No token, authorization denied');
    });
});