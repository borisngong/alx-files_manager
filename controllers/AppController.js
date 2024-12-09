import redisClient from "../utils/redis";
import dbClient from "../utils/db";

class AppController {
  static getStatus(request, response) {
    const status = {
      redis: redisClient.isAlive(), // Check Redis status
      db: dbClient.isAlive(), // Check DB status
    };
    response.status(200).send(status); // Return status with code 200
  }

  // Return the number of users and files in the database
  static async getStats(request, response) {
    const stats = {
      users: await dbClient.nbUsers(), // Get user count
      files: await dbClient.nbFiles(), // Get file count
    };
    response.status(200).send(stats);
  }
}

export default AppController;
