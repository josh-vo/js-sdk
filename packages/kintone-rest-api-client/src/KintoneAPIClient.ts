import { AppClient } from "./client/AppClient";
import { RecordClient } from "./client/RecordClient";
import { DefaultHttpClient } from "./http/";
import { Base64 } from "js-base64";

type HTTPClientParams = {
  __REQUEST_TOKEN__?: string;
};

export type PartialAuth =
  | Omit<ApiTokenAuth, "type">
  | Omit<PasswordAuth, "type">
  | Omit<SessionAuth, "type">;

export type Auth = ApiTokenAuth | PasswordAuth | SessionAuth;

type ApiTokenAuth = {
  type: "apiToken";
  apiToken: string;
};

type PasswordAuth = {
  type: "password";
  username: string;
  password: string;
};

type SessionAuth = {
  type: "session";
};

type KintoneAuthHeader =
  | {
      "X-Cybozu-Authorization": string;
    }
  | {
      "X-Cybozu-API-Token": string;
    }
  | {
      "X-Requested-With": "XMLHttpRequest";
    };

export class KintoneAPIClient {
  record: RecordClient;
  app: AppClient;
  private headers: KintoneAuthHeader;

  constructor({
    host,
    auth: partialAuth
  }: {
    host: string;
    auth: PartialAuth;
  }) {
    const auth = this.buildAuth(partialAuth);
    const params = this.buildParams(auth);
    this.headers = this.buildHeaders(auth);

    const httpClient = new DefaultHttpClient({
      host,
      headers: this.headers,
      params
    });

    this.record = new RecordClient(httpClient);
    this.app = new AppClient(httpClient);
  }

  public getHeaders() {
    return this.headers;
  }

  private buildAuth(partialAuth: PartialAuth): Auth {
    if ("username" in partialAuth) {
      return { type: "password", ...partialAuth };
    }
    if ("apiToken" in partialAuth) {
      return { type: "apiToken", ...partialAuth };
    }
    return {
      type: "session"
    };
  }

  private buildHeaders(auth: Auth): KintoneAuthHeader {
    switch (auth.type) {
      case "password": {
        return {
          "X-Cybozu-Authorization": Base64.encode(
            `${auth.username}:${auth.password}`
          )
        };
      }
      case "apiToken": {
        return { "X-Cybozu-API-Token": auth.apiToken };
      }
      default: {
        return { "X-Requested-With": "XMLHttpRequest" };
      }
    }
  }

  private buildParams(auth: Auth): HTTPClientParams {
    let requestToken;
    if (auth.type === "session") {
      if (
        typeof kintone === "undefined" ||
        typeof kintone.getRequestToken !== "function"
      ) {
        throw new Error("session authentication must specify a request token");
      }
      requestToken = kintone.getRequestToken();
    }
    // This params are always sent as a request body.
    return requestToken
      ? {
          __REQUEST_TOKEN__: requestToken
        }
      : {};
  }
}
