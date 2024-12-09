import express from "express";
import routes from "./routes/index.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
