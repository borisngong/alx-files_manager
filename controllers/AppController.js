import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  // Endpoint to check the health status of Redis and database services
  static getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(), // Check if Redis is alive
      db: dbClient.isAlive(), // Check if the database is alive
    };
    res.status(200).send(status);
  }

  // Endpoint to retrieve statistics for users and files in the database
  static async getStats(req, res) {
    const stats = {
      users: await dbClient.nbUsers(), // Get the total number of users
      files: await dbClient.nbFiles(), // Get the total number of files
    };
    res.status(200).send(stats);
  }
}

export default AppController;
