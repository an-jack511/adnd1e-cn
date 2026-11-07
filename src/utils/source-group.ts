/** Keep magazine issue citations precise while exposing one filter choice. */
export const sourceGroup = (book: string): string =>
  /^Dragon(?:\s+(?:Magazine\s*)?#\s*\d+)?$/i.test(book.trim()) ? 'Dragon' : book;
