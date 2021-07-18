import { json, opine } from "./deps.ts";
import indexRouter from "./routes/index.ts";

const app = opine();

app.use(json())
  .use("/", indexRouter)
  .listen(3000, () => console.log("Listening..."));
