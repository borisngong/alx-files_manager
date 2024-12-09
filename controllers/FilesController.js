import dbClient from "../utils/db.js";
import redisClient from "../utils/redis.js";
import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fileQueue from "../worker.js"; // Import the file processing queue
import mime from "mime-types";

const DEFAULT_FOLDER_PATH = process.env.FOLDER_PATH || "/tmp/files_manager";

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if no token
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if user not found
    }

    const { name, type, parentId = null, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing name" }); // Check for file name
    }
    if (!type || !["folder", "file", "image"].includes(type)) {
      return res.status(400).json({ error: "Missing type" }); // Check for file type
    }
    if (type !== "folder" && !data) {
      return res.status(400).json({ error: "Missing data" }); // Check for data if not a folder
    }

    if (parentId) {
      const parentFile = await dbClient.client
        .db(dbClient.databaseName)
        .collection("files")
        .findOne({ _id: new ObjectId(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: "Parent not found" }); // Validate parent file
      }
      if (parentFile.type !== "folder") {
        return res.status(400).json({ error: "Parent is not a folder" }); // Ensure parent is a folder
      }
    }

    const newFile = {
      userId: new ObjectId(userId),
      name,
      type,
      parentId: parentId ? new ObjectId(parentId) : null,
      isPublic,
    };

    if (type === "folder") {
      const result = await dbClient.client
        .db(dbClient.databaseName)
        .collection("files")
        .insertOne(newFile);
      newFile.id = result.insertedId; // Set the new folder ID
      return res.status(201).json(newFile); // Return the new folder
    } else {
      const fileId = uuidv4(); // Generate unique file ID
      const filePath = path.join(DEFAULT_FOLDER_PATH, fileId); // Create file path
      const buffer = Buffer.from(data, "base64"); // Decode base64 data

      fs.mkdirSync(DEFAULT_FOLDER_PATH, { recursive: true }); // Ensure directory exists
      fs.writeFileSync(filePath, buffer); // Write the file to disk

      newFile.localPath = filePath; // Set local file path
      const result = await dbClient.client
        .db(dbClient.databaseName)
        .collection("files")
        .insertOne(newFile);
      newFile.id = result.insertedId; // Set the new file ID

      if (type === "image") {
        await fileQueue.add({ userId, fileId: newFile.id }); // Queue thumbnail generation for images
      }

      return res.status(201).json(newFile); // Return the new file
    }
  }

  static async getShow(req, res) {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if no token
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if user not found
    }

    const { id } = req.params;
    const file = await dbClient.client
      .db(dbClient.databaseName)
      .collection("files")
      .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: "Not found" }); // Return not found if file doesn't exist
    }

    return res.status(200).json(file); // Return the file
  }

  static async getIndex(req, res) {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if no token
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if user not found
    }

    const { parentId = null, page = 0 } = req.query; // Default parentId to null
    const limit = 20; // Items per page

    const query = {
      userId: new ObjectId(userId),
      ...(parentId && {
        parentId: new ObjectId(parentId), // Include parentId if provided
      }),
    };

    const files = await dbClient.client
      .db(dbClient.databaseName)
      .collection("files")
      .find(query)
      .skip(page * limit)
      .limit(limit)
      .toArray();

    return res.status(200).json(files); // Return the files
  }

  static async putPublish(req, res) {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if no token
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if user not found
    }

    const { id } = req.params;
    const file = await dbClient.client
      .db(dbClient.databaseName)
      .collection("files")
      .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: "Not found" }); // Return not found if file doesn't exist
    }

    await dbClient.client
      .db(dbClient.databaseName)
      .collection("files")
      .updateOne({ _id: new ObjectId(id) }, { $set: { isPublic: true } }); // Update isPublic to true

    file.isPublic = true; // Set isPublic to true
    return res.status(200).json(file); // Return the updated file
  }

  static async putUnpublish(req, res) {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if no token
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" }); // Unauthorized if user not found
    }

    const { id } = req.params;
    const file = await dbClient.client
      .db(dbClient.databaseName)
      .collection("files")
      .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: "Not found" }); // Return not found if file doesn't exist
    }

    await dbClient.client
      .db(dbClient.databaseName)
      .collection("files")
      .updateOne({ _id: new ObjectId(id) }, { $set: { isPublic: false } }); // Update isPublic to false

    file.isPublic = false; // Set isPublic to false
    return res.status(200).json(file); // Return the updated file
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const { size } = req.query;
    const userId = req.userId; // Assuming you have userId from token

    const file = await dbClient.client
      .db(dbClient.databaseName)
      .collection("files")
      .findOne({ _id: new ObjectId(id), userId });

    if (!file) {
      return res.status(404).json({ error: "Not found" }); // Return not found if file doesn't exist
    }

    let filePath = file.localPath; // Get the local file path
    if (size) {
      filePath = filePath.replace(/(\.[\w\d]+)$/, `_${size}$1`); // Modify path for size if specified
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Not found" }); // Return not found if file doesn't exist on disk
    }

    res.setHeader(
      "Content-Type",
      mime.lookup(file.name) || "application/octet-stream" // Set content type based on file name
    );
    return res.status(200).sendFile(filePath); // Send the file
  }
}

export default FilesController; // Export the FilesController
