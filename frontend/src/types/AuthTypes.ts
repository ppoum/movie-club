export type Schema = "password" | "emailPassword";

export interface GetSchemasResponse {
  defaultPassword: boolean;
  schemas: Schema[];
}

export interface PostLoginPasswordPayload {
  schema: "password";
  password: string;
}

export interface PostLoginErrorResponse {
  error: string;
}
