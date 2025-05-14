const mongoose = require('mongoose');
// Ensure .env is loaded for tests. This path is relative to where jest is run (project root)
require('dotenv').config({ path: './.env' });


module.exports = async () => {
  if (mongoose.connection.readyState === 0) {
    try {
      if (!process.env.MONGO_URI_TEST) {
        console.error("FATAL ERROR: MONGO_URI_TEST is not defined in .env for Jest tests.");
        process.exit(1);
      }
      await mongoose.connect(process.env.MONGO_URI_TEST, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      // console.log('Test MongoDB Connected via globalSetup...');
    } catch (err) {
      console.error('Test MongoDB Connection Error in globalSetup:', err.message);
      process.exit(1);
    }
  }
};