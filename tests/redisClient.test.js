import redisClient from "../utils/redis.js";

describe("Redis Client Simple Tests", () => {
  const testKey = "testKey";
  const testValue = "testValue";

  beforeAll(async () => {
    if (!redisClient.client.isOpen) {
      await redisClient.client.connect();
    }
  });

  afterAll(async () => {
    await redisClient.del(testKey);
    await redisClient.disconnect();
  });

  test("should set and get a value", async () => {
    await redisClient.set(testKey, testValue, 3600);
    const value = await redisClient.get(testKey);
    expect(value).toBe(testValue);
  });

  test("should delete a value", async () => {
    await redisClient.del(testKey);
    const value = await redisClient.get(testKey);
    expect(value).toBe(null);
  });
});
