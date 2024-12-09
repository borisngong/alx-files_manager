import FilesController from "../controllers/FilesController";
import dbClient from "../utils/db.js";
import redisClient from "../utils/redis.js";

// Mocking the dependencies
jest.mock("../utils/db.js");
jest.mock("../utils/redis.js");

describe("FilesController Tests", () => {
  const mockReq = (headers = {}, body = {}, params = {}) => ({
    headers,
    body,
    params,
  });

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.sendFile = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("postUpload should return 401 if no token", async () => {
    const req = mockReq();
    const res = mockRes();
    await FilesController.postUpload(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("getShow should return 401 if no token", async () => {
    const req = mockReq();
    const res = mockRes();
    await FilesController.getShow(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("getIndex should return 401 if no token", async () => {
    const req = mockReq();
    const res = mockRes();
    await FilesController.getIndex(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("putPublish should return 401 if no token", async () => {
    const req = mockReq();
    const res = mockRes();
    await FilesController.putPublish(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("putUnpublish should return 401 if no token", async () => {
    const req = mockReq();
    const res = mockRes();
    await FilesController.putUnpublish(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("getFile should return 404 if file not found", async () => {
    const req = mockReq({ "x-token": "token" }, {}, { id: "123" });
    const res = mockRes();
    await FilesController.getFile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
