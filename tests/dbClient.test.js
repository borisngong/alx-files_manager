import dbClient from "../utils/db.js";

describe("Database Client Simple Tests", () => {
  beforeAll(async () => {
    await dbClient.connect();
  });

  afterAll(async () => {
    await dbClient.disconnect();
  });

  test("should return a number of users", async () => {
    const userCount = await dbClient.nbUsers();
    expect(typeof userCount).toBe("number");
  });

  test("should return a number of files", async () => {
    const fileCount = await dbClient.nbFiles();
    expect(typeof fileCount).toBe("number");
  });
});
