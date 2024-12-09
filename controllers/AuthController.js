import { v4 as uuidv4 } from "uuid"; // Import UUID for token generation
import sha1 from "sha1"; // Import SHA1 for password hashing
import redisClient from "../utils/redis";
import dbClient from "../utils/db";

class AuthController {
  // Sign-in the user by generating a new authentication token
  static async getConnect(request, response) {
    const Authorization = request.header("Authorization") || "";
    const credentials = Authorization.split(" ")[1];
    if (!credentials)
      return response.status(401).send({ error: "Unauthorized" });

    const decodedCredentials = Buffer.from(credentials, "base64").toString(
      "utf-8"
    );
    const [email, password] = decodedCredentials.split(":");
    if (!email || !password)
      return response.status(401).send({ error: "Unauthorized" });

    const sha1Password = sha1(password);

    // Find the user associated with this email and hashed password
    const finishedCreds = { email, password: sha1Password };
    const user = await dbClient.users.findOne(finishedCreds);
    if (!user) return response.status(401).send({ error: "Unauthorized" });
    // Unauthorized if no user found

    const token = uuidv4(); // Generate a random token
    const key = `auth_${token}`;
    const hoursForExpiration = 24; // Set expiration for 24 hours

    // Store user ID in Redis with the generated token
    await redisClient.set(key, user._id.toString(), hoursForExpiration * 3600);

    return response.status(200).send({ token }); // Return the token
  }

  // Sign-out the user based on the token
  static async getDisconnect(request, response) {
    const token = request.headers["x-token"]; // Retrieve the token
    const user = await redisClient.get(`auth_${token}`);
    if (!user) return response.status(401).send({ error: "Unauthorized" });

    // Delete the token from Redis
    await redisClient.del(`auth_${token}`);
    return response.status(204).end(); // Return no content
  }
}

export default AuthController;
