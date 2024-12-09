import { v4 as uuidv4 } from 'uuid';
import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

const { ObjectId } = require('mongodb');
const fs = require('fs');
const mime = require('mime-types');
const Bull = require('bull');

class FilesController {
  // Method to handle file upload
  static async postUpload(req, res) {
    const fileQueue = new Bull('fileQueue'); // Initialize a Bull queue for file processing

    const token = req.header('X-Token') || null; // Get the token from the request header
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`); // Validate token in Redis
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.users.findOne({ _id: ObjectId(redisToken) }); // Fetch user info
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const fileName = req.body.name; // Get the file name from the request body
    if (!fileName) return res.status(400).send({ error: 'Missing name' });

    const fileType = req.body.type; // Get the file type
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) {
      return res.status(400).send({ error: 'Missing type' });
    }

    const fileData = req.body.data; // Get the file data (for files/images)
    if (!fileData && ['file', 'image'].includes(fileType)) {
      return res.status(400).send({ error: 'Missing data' });
    }

    const fileIsPublic = req.body.isPublic || false; // Check if the file is public

    let fileParentId = req.body.parentId || 0; // Get the parent ID if provided
    fileParentId = fileParentId === '0' ? 0 : fileParentId; // Normalize parent ID
    if (fileParentId !== 0) {
      const parentFile = await DBClient.files.findOne({
        _id: ObjectId(fileParentId),
      }); // Validate parent file
      if (!parentFile) return res.status(400).send({ error: 'Parent not found' });
      if (!['folder'].includes(parentFile.type)) {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    const fileDataDb = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: fileIsPublic,
      parentId: fileParentId,
    };

    if (['folder'].includes(fileType)) {
      await DBClient.files.insertOne(fileDataDb); // Store folder in DB
      return res.status(201).send({
        id: fileDataDb._id,
        userId: fileDataDb.userId,
        name: fileDataDb.name,
        type: fileDataDb.type,
        isPublic: fileDataDb.isPublic,
        parentId: fileDataDb.parentId,
      });
    }

    // Handle file uploads
    const dirPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileUuid = uuidv4();

    const fileBuffer = Buffer.from(fileData, 'base64'); // Convert base64 to buffer
    const filePath = `${dirPath}/${fileUuid}`; // Create full file path

    // Ensure the directory exists
    await fs.mkdir(dirPath, { recursive: true }, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });

    // Write the file to disk
    await fs.writeFile(filePath, fileBuffer, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });

    fileDataDb.localPath = filePath; // Store local path of the file
    await DBClient.files.insertOne(fileDataDb); // Save file metadata in DB

    fileQueue.add({
      userId: fileDataDb.userId,
      fileId: fileDataDb._id,
    }); // Add file processing to queue

    return res.status(201).send({
      id: fileDataDb._id,
      userId: fileDataDb.userId,
      name: fileDataDb.name,
      type: fileDataDb.type,
      isPublic: fileDataDb.isPublic,
      parentId: fileDataDb.parentId,
    });
  }

  // Method to publish a file
  static async putPublish(req, res) {
    const token = req.header('X-Token') || null; // Get the token from the request header
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`); // Validate token in Redis
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.users.findOne({
      _id: ObjectId(redisToken),
    }); // Fetch user info
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const fileId = req.params.id || ''; // Get the file ID from the request parameters
    let file = await DBClient.files.findOne({
      _id: ObjectId(fileId),
      userId: user._id,
    }); // Fetch file information
    if (!file) return res.status(404).send({ error: 'Not found' });

    await DBClient.files.update(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: true } },
    ); // Update file to be public
    file = await DBClient.files.findOne({
      _id: ObjectId(fileId),
      userId: user._id,
    }); // Fetch updated file info

    return res.send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  // Method to unpublish a file
  static async putUnpublish(req, res) {
    const token = req.header('X-Token') || null; // Get the token from the request header
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`); // Validate token in Redis
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.users.findOne({
      _id: ObjectId(redisToken),
    }); // Fetch user info
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const fileId = req.params.id || ''; // Get the file ID from the request parameters
    let file = await DBClient.files.findOne({
      _id: ObjectId(fileId),
      userId: user._id,
    }); // Fetch file information
    if (!file) return res.status(404).send({ error: 'Not found' });

    await DBClient.files.update(
      { _id: ObjectId(fileId), userId: user._id },
      { $set: { isPublic: false } },
    ); // Update file to be private
    file = await DBClient.files.findOne({
      _id: ObjectId(fileId),
      userId: user._id,
    }); // Fetch updated file info

    return res.send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  // Method to retrieve the file content
  static async getFile(req, res) {
    const fileId = req.params.id || ''; // Get the file ID from the request parameters
    const size = req.query.size || 0; // Get the size parameter (if applicable)

    const file = await DBClient.files.findOne({ _id: ObjectId(fileId) }); // Fetch file info
    if (!file) return res.status(404).send({ error: 'Not found' });

    const { isPublic } = file; // Get the public status of the file
    const { userId } = file; // Get the user ID associated with the file
    const { type } = file; // Get the type of the file

    let user = null;
    let owner = false;

    const token = req.header('X-Token') || null; // Get the token from the request header
    if (token) {
      const redisToken = await RedisClient.get(`auth_${token}`); // Validate token in Redis
      if (redisToken) {
        user = await DBClient.users.findOne({
          _id: ObjectId(redisToken),
        }); // Fetch user info
        if (user) owner = user._id.toString() === userId.toString(); // Check if user is owner
      }
    }

    // Check access permissions: must be public or the owner
    if (!isPublic && !owner) return res.status(404).send({ error: 'Not found' });
    if (['folder'].includes(type)) {
      return res.status(400).send({ error: "A folder doesn't have content" });
    }

    const filePath = size === 0 ? file.localPath : `${file.localPath}_${size}`; // Determine file path

    try {
      const fileData = fs.readFileSync(filePath); // Read the file data
      const mimeType = mime.contentType(file.name); // Get MIME type based on file name
      res.setHeader('Content-Type', mimeType); // Set the response content type
      return res.send(fileData); // Send the file data in the response
    } catch (error) {
      return res.status(404).send({ error: 'Not found' }); // Handle file read errors
    }
  }

  static async getShow(req, res) {
    const token = req.header('X-Token') || null; // Get the token from the request header
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`); // Validate token in Redis
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.users.findOne({ _id: ObjectId(redisToken) }); // Fetch user info
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const fileId = req.params.id || ''; // Get the file ID from the request parameters
    if (!fileId) return res.status(404).send({ error: 'Not found' });

    const file = await DBClient.files.findOne({
      _id: ObjectId(fileId),
      userId: user._id,
    }); // Fetch file information
    if (!file) return res.status(404).send({ error: 'Not found' });

    return res.send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  // Method to list user files based on parentId and pagination
  static async getIndex(req, res) {
    const token = req.header('X-Token') || null; // Get the token from the request header
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`); // Validate token in Redis
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.users.findOne({
      _id: ObjectId(redisToken),
    }); // Fetch user info
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const parentId = req.query.parentId || 0; // Get the parent ID for file hierarchy
    const pagination = parseInt(req.query.page, 10) || 0; // Get pagination parameter
    const aggregationMatch = { userId: user._id, parentId }; // Prepare aggregation match query

    const aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 },
      { $limit: 20 },
    ];

    const files = await DBClient.files.aggregate(aggregateData).toArray(); // Fetch files from DB
    const filesArray = files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));

    return res.send(filesArray); // Return files list
  }
}

module.exports = FilesController;
