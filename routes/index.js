import AuthController from "../controllers/AuthController";
import FilesController from "../controllers/FilesController";
import express from "express";
import AppController from "../controllers/AppController";
import UsersController from "../controllers/UsersController";

const router = express.Router();

// the AppController get Routes
router.get("/status", AppController.getStatus);
router.get("/stats", AppController.getStats);

// Auth routes
router.get("/connect", AuthController.getConnect);
router.get("/disconnect", AuthController.getDisconnect);

// Usercontrol routes
router.get("/users/me", UsersController.getMe);
router.get("/files/:id", FilesController.getShow);
router.get("/files", FilesController.getIndex);

// the post Routes
router.post("/users", UsersController.postNew);
router.post("/files", FilesController.postUpload);

module.exports = router;
