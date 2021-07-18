import config from "../config/index.ts";
import { LF } from "../text/index.ts";
import { EOL, format } from "../deps.ts";

/** Returns a function for writing out to the console (optionally snipped) and to a new file */
export const newEcho = () => {
  const outputFile = `post${(new Date()).getTime()}.http`;

  return {
    echoBoth: (output: string) => {
      Deno.writeTextFileSync(outputFile, format(`${output}${LF}`, EOL.CRLF), {
        append: true,
      });
      const contentLength = output.length;
      if (!config.snipLargeContent || contentLength <= config.maxLength) {
        console.log(output);
      } else {
        console.log(
          `${output.slice(0, config.maxLength / 2)}` +
            ` ${LF} < ... snip ... > ${LF} ` +
            `${
              output.slice(contentLength - config.maxLength / 2, contentLength)
            }`,
        );
      }
    },
    echoScreen: (output: string) => console.log(output),
  };
};
