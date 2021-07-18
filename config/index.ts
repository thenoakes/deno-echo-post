export default {
  /**
  * Should the output of large POSTs in the console be snipped
  * (setting to false can cause performance issues for large payloads).
  * Messages are always saved in full to a file.
  */
  snipLargeContent: !!Deno.env.get("ECHO_MAX_LENGTH"),
  /** The number of characters to cap a large payload to, when snipping */
  maxLength: parseInt(Deno.env.get("ECHO_MAX_LENGTH") ?? "0"),
};
