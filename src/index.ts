import { handleRequest } from "./api";
import { receiveEmail } from "./email";
import type { Env } from "./types";

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    return receiveEmail(message, env);
  },
} satisfies ExportedHandler<Env>;
