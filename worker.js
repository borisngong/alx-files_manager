import Queue from "bull"; // Import Bull for job queueing
import dbClient from "./utils/db.js";
import thumbnail from "image-thumbnail"; // Import thumbnail generation library

const fileQueue = new Queue("fileQueue"); // Create a new queue

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data; // Extract userId and fileId from job data

  if (!fileId || !userId) {
    throw new Error("Missing fileId or userId"); // Check for necessary data
  }

  const file = await dbClient.db
    .collection("files")
    .findOne({ _id: fileId, userId }); // Retrieve file from the database

  if (!file) {
    throw new Error("File not found");
  }

  const filePath = file.localPath; // Get the local path of the file
  const sizes = [500, 250, 100]; // Define thumbnail sizes

  for (const size of sizes) {
    const thumbnailPath = `${filePath}_${size}`; // Construct thumbnail path
    await thumbnail(filePath, { width: size, responseType: "file" }); // Generate thumbnail
    console.log(`Generated thumbnail: ${thumbnailPath}`); // Log the generated thumbnail
  }
});

export default fileQueue;
