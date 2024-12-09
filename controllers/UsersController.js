import sha1 from "sha1";
import Queue from "bull";
import { findUserById, findUserIdByToken } from "../maintain/support";
import dbClient from "../utils/db";

const userQueue = new Queue("userQueue"); // Create a new Bull queue for user tasks

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;
    if (!email) return response.status(400).send({ error: "Missing email" });
    if (!password)
      return response.status(400).send({ error: "Missing password" });

    const emailExists = await dbClient.users.findOne({ email });
    if (emailExists)
      return response.status(400).send({ error: "Already exist" });

    const sha1Password = sha1(password); // Hash the password
    let result;
    try {
      result = await dbClient.users.insertOne({
        // Insert new user into the database
        email,
        password: sha1Password,
      });
    } catch (err) {
      await userQueue.add({}); // Add to user queue on error
      return response.status(500).send({ error: "Error creating user" }); // Handle insertion error
    }

    const user = {
      // Create user object to return
      id: result.insertedId,
      email,
    };

    await userQueue.add({
      // Add user ID to the queue
      userId: result.insertedId.toString(),
    });

    return response.status(201).send(user); // Return created user
  }

  static async getMe(request, response) {
    const token = request.headers["x-token"]; // Retrieve token from headers
    if (!token) {
      return response.status(401).json({ error: "Unauthorized" }); // Handle missing token
    }

    const userId = await findUserIdByToken(request); // Get user ID based on token
    if (!userId) return response.status(401).send({ error: "Unauthorized" }); // Handle unauthorized access

    const user = await findUserById(userId); // Retrieve user based on user ID

    if (!user) return response.status(401).send({ error: "Unauthorized" }); // Handle unauthorized access

    const processedUser = { id: user._id, ...user }; // Create processed user object
    delete processedUser._id; // Remove internal ID
    delete processedUser.password; // Remove password for security
    return response.status(200).send(processedUser); // Return user object (email and id only)
  }
}

module.exports = UsersController; // Export UsersController
