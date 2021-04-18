import { Router, Request, Response, NextFunction } from 'https://deno.land/x/opine@1.3.2/mod.ts';

//import { multiParser, Form } from 'https://deno.land/x/multiparser@v2.1.0/mod.ts';
import { parse } from "https://raw.githubusercontent.com/mayankchoubey/deno-body-parser/main/mod.ts"

const router = Router();

const EMPTY = '';
const BREAK = '\n';

/** 
 * Should the output of large POSTs in the console be snipped 
 * (setting to false can cause performance issues for large payloads).
 * Messages are always saved in full to a file.
 * */
const snipLargeContent = true;    

/** The number of characters to cap a large payload to, when snipping */
const maxLength = 10000;


/** A function which takes an incoming POST request and prints it, raw, to the screen and to a file */
async function echoMultipartPost(req: Request, res: Response, _next: NextFunction) {

    /** A function for writing out to the console (optionally snipped) and to a new file */
    const echo = (() => { 

        const outputFile = `post${(new Date()).getTime()}.http`;
        
        return (output : string) => {

            Deno.writeTextFileSync(outputFile, output);
            const contentLength = output.length;
            if (!snipLargeContent || contentLength <= maxLength) {
                console.log(output);
            }
            else {
                console.log(
                    `${output.slice(0, maxLength / 2)}` +
                    ` ${BREAK} < ... snip ... > ${BREAK} ` + 
                    `${output.slice(contentLength - maxLength / 2, contentLength)}`);
            } 

        }
    })();

    console.log(EMPTY);
    echo(`POST ${req.path} HTTP/1.1`);

    let contentType = '';

    // Print the request headers and obtain Content-Type
    for (const header in req.headers.keys()) {
        echo(header + ": " + req.headers.get(header));
        if (header.toLowerCase() === 'content-type') {
            contentType = req.headers.get(header)!.toLowerCase();
        }
    }

    // Attempt to parse the MIME boundary, if there is one specified
    const boundary = (() => {
        const BOUNDARY_PARSER = /;\s*boundary=(.*?)\s*(;|$)/i;
        const parsed = BOUNDARY_PARSER.exec(req.headers.get('content-type') || '');
        const boundary = (parsed && parsed.length) ? (parsed[1] || parsed[2]) : "";
        return boundary.replace(/\"/g, "");
    })();

    console.log({ boundary });

    // No boundary indentified => single part content
    if (!boundary.length) {

        echo(EMPTY);

        // If parser has produced an object => process for application/json or form-urlencoded
        if (typeof req.body === 'object') {

            let payload = '';

            if (contentType === 'application/json') {
                payload = JSON.stringify(req.body, null, 4);
            }
            else {
                for (const key in req.body) {
                    payload += key + '=' + req.body[key] + '&'
                }
                payload = encodeURI(payload.substring(0, payload.length - 1));
            }

            echo(payload);
        }

        // Otherwise just print the body
        else {
            echo (req.body);
        }

        res.sendStatus(200);
        return console.log(`${BREAK}^^ NON-MULTIPART POST LOGGED @ ${new Date()} ^^${BREAK}`);
    }

    // Boundary identified => process for multipart content

    //const mr = new mime.MultipartReader('', boundary);
    console.log(`${BREAK}^^ MULTIPART POST LOGGED @ ${new Date()} ^^${BREAK}`);

    // deno-body-parser will parse raw text
    const body = await parse(req, { unknownAsText: true });

    if (body) {
        const { txt }: { txt: string, json: Record<string, unknown>} = body;
        //console.log({ txt, json });
        const contentType = req.headers.get('content-type');
        //console.log({ contentType });

        if (contentType?.toLowerCase().trim().startsWith('multipart/alternative')) {
            // TODO multipart/related etc.

            // Maanually split the text by the boundary
            const parts = txt.trim()
                .split(`--${boundary}`)
                .map(p => p.trim().split('\n\n'));
            console.log(parts);

            // Map the headers to an object and the body to a string property
            const multipartMessage = parts
                .filter(p => p.length === 2)
                .map(([headers, body]) => ({
                    headers: Object.assign(
                        {},
                        ...headers.split('\n')
                            .map(h => h.split(':'))
                            .map(([key, value]) => ({ [key.trim()]: value.trim() }))
                    ),
                    body
                }));
            
            console.log(multipartMessage);
        }
    }
    /*
    var form = new multiparty.Form();
    form.on('part', function (part) {
         
        // Detect base64 encoding to print nicely to the console
        const isBase64 = (() => {
            const transferEncoding = part.headers[Object.keys(part.headers)
                .find(key => key.toLowerCase() === 'content-transfer-encoding')];
            if (transferEncoding && transferEncoding.toLowerCase() == 'base64') {
                return true;
            }
            return false;
        })();

        if (isBase64) {
            part.setEncoding('base64');
        }

        // Get the body content of the MIME part
        getContentFromReadableStream(part, (content) => {

            echo(BREAK + '--' + boundary);

            // Print the part's headers
            for (let header in part.headers) {
                echo(header + ': ' + part.headers[header]);
            }
            
            echo(BLANK);
            echo(content);

            // Continue with the next part
            part.resume();

        });

        part.on('error', function (err) {
            console.error(err);
        });

    }).on('close', function () {
        echo(BREAK + '--' + boundary + '--');
        // Send the response when reading the form has finished
        res.sendStatus(200);
        console.log(`${BREAK}^^ MULTIPART POST LOGGED @ ${new Date()} ^^${BREAK}`);
    });

    // Process the incoming request
    form.parse(req);
    */
}


// ==== ROUTING ====

router.post('/echo', echoMultipartPost);

router.post('/test', (_req, res, _next) => {
    //console.log(req.body);
    res.sendStatus(200);
});

export default router;
