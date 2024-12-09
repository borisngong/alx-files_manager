import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 to generate unique tokens
import sha1 from 'sha1';
import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

class AuthController {
  // Method for user login (connect)
  static async getConnect(req, res) {
    const authorization = req.header('Authorization') || null;
    if (!authorization) return res.status(401).send({ error: 'Unauthorized' });

    // Decode the base64 encoded 'Authorization' header
    const userBuffer = Buffer.from(
      authorization.replace('Basic ', ''),
      'base64',
    );
    const userCredentials = {
      email: userBuffer.toString('utf-8').split(':')[0],
      password: userBuffer.toString('utf-8').split(':')[1],
    };

    // Check if email or password are missing
    if (!userCredentials.email || !userCredentials.password) return res.status(401).send({ error: 'Unauthorized' });

    // Hash the provided password for comparison
    userCredentials.password = sha1(userCredentials.password);

    const userExists = await DBClient.db
      .collection('users')
      .findOne(userCredentials);
    if (!userExists) return res.status(401).send({ error: 'Unauthorized' });

    // Generate a new unique token for the user
    const token = uuidv4();
    const key = `auth_${token}`; // Define the key to store the token in Redis

    // Store the user ID in Redis with an expiration time of 86400 seconds (24 hours)
    await RedisClient.set(key, userExists._id.toString(), 86400);

    // Return the generated token to the user
    return res.status(200).send({ token });
  }

  // Method for user logout (disconnect)
  static async getDisconnect(req, res) {
    const token = req.header('X-Token') || null; // Get 'X-Token' header from the request
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    // Retrieve the user ID associated with the token from Redis
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    // Delete the token from Redis, effectively logging out the user
    await RedisClient.del(`auth_${token}`);

    // Return a successful response (no content)
    return res.status(204).send();
  }
}

module.exports = AuthController;
