/** Clean extraction artifacts only for presentation; retain original source evidence. */
export function displaySourceText(value?: string) {
  const text = (value || "")
    .replace(/\p{Cc}/gu, " ")
    .replace(/(?:^|\s)%+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /[\p{L}\p{N}]/u.test(text) && !/^(?:n\s*\/?\s*a|not available|null|undefined)$/i.test(text)
    ? text : "";
}

export function descriptionExcerpt(value?: string) {
  const text = (value || "")
    .split(/technical\s*specifications?/i)[0]
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 800 ? `${text.slice(0, 800).trimEnd()}…` : text;
}
