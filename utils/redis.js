const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient(); // Creates a Redis client instance

    // Promisify the 'get' method for asynchronous use with promises
    this.getAsync = promisify(this.client.get).bind(this.client);

    // Attach an error handler to log connection or operational errors
    this.client.on('error', (error) => {
      console.log(
        `An error occurred trying to connect to the server: ${error.message}`,
      );
    });
  }

  // Check if the Redis client is currently connected
  isAlive() {
    return this.client.connected; // Returns true if the client is connected
  }

  // Retrieve a value from Redis by key
  async get(key) {
    return this.getAsync(key); // Use promisified 'get' method for async/await
  }

  // Set a key-value pair in Redis with a specified expiration time (in seconds)
  async set(key, value, duration) {
    this.client.setex(key, duration, value); // Sets a key with expiration
  }

  // Delete a key from Redis
  async del(key) {
    this.client.del(key); // Removes the key from Redis
  }
}

// Create and export a single instance of RedisClient
const redisClient = new RedisClient();
export default redisClient;
