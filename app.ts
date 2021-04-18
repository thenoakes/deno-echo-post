import { opine, json } from "https://deno.land/x/opine@1.3.2/mod.ts";

import indexRouter from './routes/index.ts';

const app = opine();

app.use(json());

app.use('/', indexRouter);

app.listen(3000);
