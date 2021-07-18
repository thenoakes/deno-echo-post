import { newEcho } from "../output/echo.ts";
import { NextFunction, parse, Request, Response, Router } from "../deps.ts";
import { EMPTY, LF, upperKebab } from "../text/index.ts";

const router = Router();

/** A function which takes an incoming POST request and prints it, raw, to the screen and to a file */
async function echoMultipartPost(
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const { echoBoth, echoScreen } = newEcho();

  echoScreen(EMPTY);
  echoBoth(`POST ${req.path} HTTP/1.1`);

  let contentType = "";

  // Print the request headers and obtain Content-Type
  for (const header of req.headers.keys()) {
    echoBoth(upperKebab(header.trim()) + ": " + req.headers.get(header));
    if (header.toLowerCase() === "content-type") {
      contentType = req.headers.get(header)!.toLowerCase().trim();
    }
  }

  // Attempt to parse the MIME boundary, if there is one specified
  const boundary = (() => {
    const BOUNDARY_PARSER = /;\s*boundary=(.*?)\s*(;|$)/i;
    const parsed = BOUNDARY_PARSER.exec(req.headers.get("content-type") || "");
    const boundary = (parsed && parsed.length) ? (parsed[1] || parsed[2]) : "";
    return boundary.replace(/\"/g, "");
  })();

  // No boundary indentified => single part content
  if (!boundary.length) {
    echoBoth(EMPTY);

    // If parser has produced an object => process for application/json or form-urlencoded
    if (typeof req.body === "object") {
      let payload = "";

      if (contentType === "application/json") {
        payload = JSON.stringify(req.body, null, 4);
      } else {
        for (const key in req.body) {
          payload += key + "=" + req.body[key] + "&";
        }
        payload = encodeURI(payload.substring(0, payload.length - 1));
      }

      echoBoth(payload);
    } // Otherwise just print the body
    else {
      echoBoth(req.body);
    }

    res.sendStatus(200);
    echoScreen(`${LF}^^ NON-MULTIPART POST LOGGED @ ${new Date()} ^^${LF}`);
  }

  // Boundary identified => process for multipart content
  // deno-body-parser will parse raw text - we do the rest...
  const body = await parse(req, { unknownAsText: true });
  const MULTIPART = ["alternative", "related"].map((m) => `multipart/${m}`);

  if (body && MULTIPART.some((m) => contentType.startsWith(m))) {
    const { txt }: { txt: string } = body;

    // Maanually split the text by the boundary
    const parts = txt.trim()
      .split(`--${boundary}`)
      .map((p) => p.trim().split("\n\n"));

    // Map the headers to an object and the body to a string property
    const multipartMessage = parts
      .filter((p) => p.length === 2)
      .map(([headers, body]) => ({
        headers: Object.assign(
          {},
          ...headers.split("\n")
            .map((h) => h.split(":"))
            .map(([key, value]) => ({ [key.trim()]: value.trim() })),
        ),
        body,
      }));

    // Format the parts
    for (const part of multipartMessage) {
      echoBoth(LF + "--" + boundary);

      // Print the part's headers
      for (const header in part.headers) {
        echoBoth(upperKebab(header) + ": " + part.headers[header]);
      }

      echoBoth(EMPTY);
      echoBoth(part.body);
    }

    // Print the terminating boundary
    echoBoth(LF + "--" + boundary + "--");

    // Send the response when reading the form has finished
    res.sendStatus(200);
    echoScreen(`${LF}^^ MULTIPART POST LOGGED @ ${new Date()} ^^${LF}`);
  }
}

// ==== ROUTING ====

router.post("/echo", echoMultipartPost);

router.post("/test", (_req, res, _next) => {
  res.sendStatus(200);
});

export default router;
