declare module "papaparse" {
  export interface ParseError {
    type?: string;
    code?: string;
    message?: string;
    row?: number;
  }

  export interface ParseResult<T = string[]> {
    data: T[];
    errors: ParseError[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor?: number;
    };
  }

  export interface ParseConfig<T = unknown> {
    header?: boolean;
    skipEmptyLines?: boolean | "greedy";
    delimiter?: string;
    newline?: string;
    [key: string]: unknown;
  }

  export function parse<T = string[]>(
    input: string,
    config?: ParseConfig<T>
  ): ParseResult<T>;

  export interface UnparseConfig {
    header?: boolean;
    delimiter?: string;
    newline?: string;
    [key: string]: unknown;
  }

  export interface UnparseObject {
    fields: string[];
    data: string[][];
  }

  export function unparse(
    data: string[][] | Record<string, unknown>[] | UnparseObject,
    config?: UnparseConfig
  ): string;

  const Papa: {
    parse: typeof parse;
    unparse: typeof unparse;
  };

  export default Papa;
}
