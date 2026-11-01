import {createHandler} from '../_shared/handler.mjs';
Deno.serve(createHandler(Deno.env.toObject(),fetch,'delete'));
