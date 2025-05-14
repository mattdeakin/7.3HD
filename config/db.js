const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.NODE_ENV === 'test'
            ? process.env.MONGO_URI_TEST // This will be used by Jest tests
            : process.env.MONGO_URI;

        if (!mongoURI) {
            const errorMessage = process.env.NODE_ENV === 'test'
                ? 'MONGO_URI_TEST not defined in .env file for the test environment.'
                : 'MONGO_URI not defined in .env file for the current environment.';
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        if (process.env.NODE_ENV !== 'test') {
            console.log('MongoDB Connected...');
        }
    } catch (err) {
        console.error(`MongoDB Connection Error: ${err.message}`);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        } else {
            throw err; // Re-throw for test environment to catch and fail tests
        }
    }
};

module.exports = connectDB;