import { MongoClient } from "mongodb";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || 27017; // Database port
const DB_DATABASE = process.env.DB_DATABASE || "files_manager";
const url = `mongodb://${DB_HOST}:${DB_PORT}`; // Connection URL

class DBClient {
  constructor() {
    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        this.db = client.db(DB_DATABASE); // Initialize database
        this.users = this.db.collection("users"); // Users collection
        this.files = this.db.collection("files"); // Files collection
      } else {
        console.log(err.message); // Log error message
        this.db = false; // Set db to false on error
      }
    });
  }

  isAlive() {
    return !!this.db; // Check if DB connection is alive
  }

  async nbUsers() {
    return this.users.countDocuments(); // Count number of users
  }

  async nbFiles() {
    return this.files.countDocuments(); // Count number of files
  }

  async getUser(query) {
    const user = await this.db.collection("users").findOne(query); // Find user by query
    return user; // Return user document
  }
}

const dbClient = new DBClient();
module.exports = dbClient; // Export dbClient instance
