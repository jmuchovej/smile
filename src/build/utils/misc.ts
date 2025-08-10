export function indentLines(str: string, indent: number = 2) {
  return str
    .replace(/ {2}/g, " ".repeat(indent))
    .split("\n")
    .map((line) => `${" ".repeat(indent)}${line}`)
    .join("\n");
}
