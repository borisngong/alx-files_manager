import express from 'express';
import controllerRouting from './routes/index';

const APP_PORT = process.env.PORT || 5000;
const app = express(); // Create an Express application

app.use(express.json()); // Middleware to parse incoming JSON request bodies

controllerRouting(app); // Set up application routes using the imported module

// Start the server and listen on the defined port
app.listen(APP_PORT, () => {
  console.log(`Server listening on port ${APP_PORT}`); // Log server start message
});
