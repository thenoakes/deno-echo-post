import {
    Router,
    Request,
    Response,
    NextFunction
} from 'https://deno.land/x/opine@1.3.2/mod.ts';

import {
    parse
} from "https://raw.githubusercontent.com/mayankchoubey/deno-body-parser/main/mod.ts"

const router = Router();

const EMPTY = '';
const BREAK = '\n';

const upperKebab = (input: string) => input.trim()
    .split('-')
    .map(w => `${w[0].toUpperCase()}${w.slice(1).toLowerCase()}`)
    .join('-');

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

            Deno.writeTextFileSync(outputFile, `${output}\n`, { append: true });
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
    for (const header of req.headers.keys()) {
        echo(upperKebab(header.trim()) + ": " + req.headers.get(header));
        if (header.toLowerCase() === 'content-type') {
            contentType = req.headers.get(header)!.toLowerCase().trim();
        }
    }

    // Attempt to parse the MIME boundary, if there is one specified
    const boundary = (() => {
        const BOUNDARY_PARSER = /;\s*boundary=(.*?)\s*(;|$)/i;
        const parsed = BOUNDARY_PARSER.exec(req.headers.get('content-type') || '');
        const boundary = (parsed && parsed.length) ? (parsed[1] || parsed[2]) : "";
        return boundary.replace(/\"/g, "");
    })();

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
    // deno-body-parser will parse raw text - we do the rest...
    const body = await parse(req, { unknownAsText: true });
    const MULTIPART = ['alternative', 'related'].map(m => `multipart/${m}`);

    if (body && MULTIPART.some(m => contentType.startsWith(m))) {
        const { txt }: { txt: string } = body;

        // Maanually split the text by the boundary
        const parts = txt.trim()
            .split(`--${boundary}`)
            .map(p => p.trim().split('\n\n'));

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
        
        // Format the parts
        for (const part of multipartMessage) {
            echo(BREAK + '--' + boundary);

            // Print the part's headers
            for (const header in part.headers) {
                echo(upperKebab(header) + ': ' + part.headers[header]);
            }
            
            echo(EMPTY);
            echo(part.body);

        }

        // Print the terminating boundary
        echo(BREAK + '--' + boundary + '--');

        // Send the response when reading the form has finished
        res.sendStatus(200);
        console.log(`${BREAK}^^ MULTIPART POST LOGGED @ ${new Date()} ^^${BREAK}`);
    }
}


// ==== ROUTING ====

router.post('/echo', echoMultipartPost);

router.post('/test', (_req, res, _next) => {
    res.sendStatus(200);
});

export default router;
