//import * as path from "https://deno.land/std@0.92.0/path/mod.ts";
import { opine, json } from "https://deno.land/x/opine@1.2.0/mod.ts";

import indexRouter from './routes/index.ts';

const app = opine();

app.use(json());

app.use('/', indexRouter);

app.listen(3000);
