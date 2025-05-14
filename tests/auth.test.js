const request = require('supertest');
const app = require('../server'); // Main express app
const mongoose = require('mongoose');
const User = require('../models/User');

describe('Auth API', () => {
    // Runs before all tests in this suite
    beforeAll(async () => {
        // Connection should be handled by globalSetup
    });

    // Runs after all tests in this suite
    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close(); // Close connection after all tests
    });

    // Runs before each test in this suite
    beforeEach(async () => {
        await User.deleteMany({}); // Clean users before each specific test
    });

    it('should register a new user successfully', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', password: 'password123' });
        expect(res.statusCode).toEqual(200); // Or 201 if you prefer for creation
        expect(res.body).toHaveProperty('token');
    });

    it('should not register a user if username already exists', async () => {
        // First registration
        await new User({ username: 'existinguser', password: 'password123' }).save();

        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'existinguser', password: 'anotherpassword' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.msg).toBe('User already exists');
    });

    it('should not register a user if password is not provided', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'userwithoutpass' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.msg).toBe('Please enter all fields');
    });

    it('should login an existing user successfully', async () => {
        const user = new User({ username: 'loginuser', password: 'password123' });
        await user.save(); // Password gets hashed here

        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'loginuser', password: 'password123' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should not login a user that does not exist', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'nonexistentuser', password: 'password123' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.msg).toBe('Invalid credentials');
    });

    it('should not login an existing user with an incorrect password', async () => {
        const user = new User({ username: 'userwithwrongpass', password: 'correctpassword' });
        await user.save();

        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'userwithwrongpass', password: 'incorrectpassword' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.msg).toBe('Invalid credentials');
    });
});