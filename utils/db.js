import { MongoClient } from 'mongodb';

// Define database connection parameters with fallback to defaults for local development.
const DB_HOST = process.env.DB_HOST || 'localhost'; // Database host
const DB_PORT = process.env.DB_PORT || 27017; // Database port
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager'; // Database name
const DB_URI = `mongodb://${DB_HOST}:${DB_PORT}`; // MongoDB connection URI

class DBClient {
  constructor() {
    // Connect to the MongoDB server and initialize database and collections.
    MongoClient.connect(
      DB_URI,
      { useUnifiedTopology: true }, // Use modern connection handling
      (error, client) => {
        if (error) {
          console.log(error.message); // Log errors during connection
          this.db = false; // Mark db as unavailable
        } else {
          this.db = client.db(DB_DATABASE); // Set the database reference
          this.users = this.db.collection('users'); // Initialize 'users' collection
          this.files = this.db.collection('files'); // Initialize 'files' collection
        }
      },
    );
  }

  // Check if the database connection is active
  isAlive() {
    return !!this.db; // Returns true if connected, false otherwise
  }

  // Count the number of documents in the 'users' collection
  async nbUsers() {
    return this.users.countDocuments();
  }

  // Count the number of documents in the 'files' collection
  async nbFiles() {
    return this.files.countDocuments();
  }

  // Return the 'users' collection
  async usersCollection() {
    return this.users;
  }

  // Return the 'files' collection
  async filesCollection() {
    return this.files;
  }
}

// Create and export a single instance of the database client
const dbClient = new DBClient();
export default dbClient;
