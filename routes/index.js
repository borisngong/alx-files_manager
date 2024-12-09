import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

function controllerRouting(app) {
  const router = express.Router(); // Create a new router instance
  app.use('/', router); // Mount the router on the root path of the application

  // Route for checking application and service status
  router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  // Route for retrieving application statistics (e.g., users, files)
  router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });

  // Route for creating a new user
  router.post('/users', (req, res) => {
    UsersController.postNew(req, res);
  });

  // Route for user authentication (login)
  router.get('/connect', (req, res) => {
    AuthController.getConnect(req, res);
  });

  // Route for user disconnection (logout)
  router.get('/disconnect', (req, res) => {
    AuthController.getDisconnect(req, res);
  });

  // Route for retrieving the authenticated user's information
  router.get('/users/me', (req, res) => {
    UsersController.getMe(req, res);
  });

  // Route for uploading a new file
  router.post('/files', (req, res) => {
    FilesController.postUpload(req, res);
  });

  // Route for retrieving a specific file by its ID
  router.get('/files/:id', (req, res) => {
    FilesController.getShow(req, res);
  });

  // Route for listing all files
  router.get('/files', (req, res) => {
    FilesController.getIndex(req, res);
  });

  // Route for publishing a specific file by its ID
  router.put('/files/:id/publish', (req, res) => {
    FilesController.putPublish(req, res);
  });

  // Route for unpublishing a specific file by its ID
  router.put('/files/:id/unpublish', (req, res) => {
    FilesController.putUnpublish(req, res);
  });

  // Route for retrieving the data of a specific file by its ID
  router.get('/files/:id/data', (req, res) => {
    FilesController.getFile(req, res);
  });
}

export default controllerRouting;
