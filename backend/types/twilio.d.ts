declare module 'twilio' {
  interface MessageCreateParams {
    to: string;
    from: string;
    body: string;
  }

  interface MessagesApi {
    create(params: MessageCreateParams): Promise<unknown>;
  }

  interface TwilioClient {
    messages: MessagesApi;
  }

  function twilio(accountSid: string, authToken: string, options?: Record<string, unknown>): TwilioClient;

  export = twilio;
}
