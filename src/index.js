import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";

console.log("connecting to database")
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("error on start the app: ", error);
      throw err;
    });
    app.listen(process.env.PORT, () => {
      console.log("server started at port ", process.env.PORT);
    });
  })
  .catch((err) => {
    console.log("database connectino failed", err);
  });
