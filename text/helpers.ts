export const upperKebab = (input: string) =>
  input.trim()
    .split("-")
    .map((w) => `${w[0].toUpperCase()}${w.slice(1).toLowerCase()}`)
    .join("-");
