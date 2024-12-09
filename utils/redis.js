import { createClient } from "redis";

class RedisClient {
  constructor() {
    this.client = createClient(); // Create Redis client
    this.client.on("error", (error) => {
      console.log(`Redis client not connected to the server: ${error.message}`);
    });
    this.client.connect(); // Connect to Redis
  }

  isAlive() {
    return this.client.isOpen; // Check if the client is open
  }

  async get(key) {
    return await this.client.get(key); // Get value for the key
  }

  async set(key, value, duration) {
    await this.client.setEx(key, duration, value); // Set key with expiration
  }

  async del(key) {
    await this.client.del(key); // Delete key from Redis
  }

  async disconnect() {
    await this.client.quit(); // Disconnect the client
  }
}

const redisClient = new RedisClient();
export default redisClient;
