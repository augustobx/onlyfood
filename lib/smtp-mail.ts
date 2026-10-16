import "server-only";

import net from "node:net";
import tls from "node:tls";

type Socket = net.Socket | tls.TLSSocket;
type Reply = { code: number; message: string };
type SmtpOptions = { host: string; port: 465 | 587; username: string; password: string; from: string; to: string; subject: string; html: string };

class SmtpReplyReader {
  private socket: Socket;
  private buffer = "";
  private lines: string[] = [];
  private waiter: ((reply: Reply) => void) | undefined;
  private failed: ((error: Error) => void) | undefined;
  private pendingLines: string[] = [];
  constructor(socket: Socket) {
    this.socket = socket;
    socket.on("data", this.onData);
    socket.on("error", this.onError);
    socket.on("close", this.onClose);
  }
  private onError = (error: Error) => {
    this.failed?.(error);
    this.waiter = undefined;
    this.failed = undefined;
  };
  private onClose = () => { this.onError(new Error("SMTP_CONNECTION_CLOSED")); };
  private onData = (chunk: Buffer | string) => {
    this.buffer += chunk.toString();
    for (;;) {
      const cut = this.buffer.indexOf("\r\n");
      if (cut < 0) break;
      const line = this.buffer.slice(0, cut);
      this.buffer = this.buffer.slice(cut + 2);
      this.lines.push(line);
    }
    this.flush();
  };
  private flush() {
    while (this.lines.length > 0) {
      const line = this.lines.shift()!;
      this.pendingLines.push(line);
      if (/^\d{3} /.test(line)) {
        const code = Number(line.slice(0, 3));
        const reply = { code, message: this.pendingLines.join("\n") };
        this.pendingLines = [];
        const waiter = this.waiter;
        this.waiter = undefined;
        this.failed = undefined;
        if (waiter) waiter(reply);
        else this.ready.push(reply);
      }
    }
  }
  private ready: Reply[] = [];
  read(): Promise<Reply> {
    const available = this.ready.shift();
    if (available) return Promise.resolve(available);
    return new Promise((resolve, reject) => {
      this.waiter = resolve;
      this.failed = reject;
    });
  }
  dispose() {
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("close", this.onClose);
  }
}

async function expectCode(reader: SmtpReplyReader, ...codes: number[]): Promise<Reply> {
  const result = await reader.read();
  if (!codes.includes(result.code)) throw new Error(`SMTP_${result.code}: ${result.message.slice(0, 150)}`);
  return result;
}

function validateMailbox(value: string): string {
  const clean = value.trim();
  if (/[\r\n]/.test(clean) || !/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(clean)) throw new Error("SMTP_INVALID_ADDRESS");
  return clean;
}

function parseFrom(value: string) {
  const match = /^([^<>\r\n]{0,100})<([^<>\r\n]+)>$/.exec(value.trim());
  const email = validateMailbox(match ? match[2] : value);
  const name = (match?.[1] || "OnlyFood").trim();
  const safeName = name ? `=?UTF-8?B?${Buffer.from(name).toString("base64")}?=` : "OnlyFood";
  return { envelope: email, header: `${safeName} <${email}>` };
}

async function connect(options: SmtpOptions): Promise<{ socket: Socket; reader: SmtpReplyReader }> {
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(options.host) || options.host.length > 253)
    throw new Error("SMTP_INVALID_HOST");
  if (options.port === 465) {
    const socket = tls.connect({
      host: options.host, port: options.port, servername: options.host,
      rejectUnauthorized: true, minVersion: "TLSv1.2",
    });
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", () => socket.authorized ? resolve() : reject(new Error("SMTP_INVALID_TLS_CERTIFICATE")));
      socket.once("error", reject);
    });
    return { socket, reader: new SmtpReplyReader(socket) };
  }
  const socket = net.connect({ host: options.host, port: options.port });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
  return { socket, reader: new SmtpReplyReader(socket) };
}

/** SSL 465 or STARTTLS 587 with server certificate verification. Never sends credentials over plaintext. */
export async function sendSmtpEmail(options: SmtpOptions): Promise<boolean> {
  if (options.port !== 465 && options.port !== 587) throw new Error("SMTP_UNSUPPORTED_PORT");
  const from = parseFrom(options.from);
  const to = validateMailbox(options.to);
  if (/[\r\n]/.test(options.subject)) throw new Error("SMTP_INVALID_SUBJECT");
  const username = options.username;
  if (/[\r\n]/.test(username) || !username || !options.password) throw new Error("SMTP_INVALID_CREDENTIALS");

  let socket: Socket | undefined;
  const timer = setTimeout(() => socket?.destroy(new Error("SMTP_TIMEOUT")), 12_000);
  try {
    let connection = await connect(options);
    socket = connection.socket;
    let reader = connection.reader;
    await expectCode(reader, 220);

    const command = async (value: string, ...expected: number[]) => {
      socket!.write(value + "\r\n");
      return expectCode(reader, ...expected);
    };
    await command("EHLO onlyfood.nanoapps.site", 250);

    if (options.port === 587) {
      await command("STARTTLS", 220);
      reader.dispose();
      const secured = tls.connect({
        socket: socket as net.Socket, servername: options.host,
        rejectUnauthorized: true, minVersion: "TLSv1.2",
      });
      await new Promise<void>((resolve, reject) => {
        secured.once("secureConnect", () => secured.authorized ? resolve() : reject(new Error("SMTP_INVALID_TLS_CERTIFICATE")));
        secured.once("error", reject);
      });
      socket = secured;
      reader = new SmtpReplyReader(secured);
      await command("EHLO onlyfood.nanoapps.site", 250);
    }

    await command("AUTH LOGIN", 334);
    await command(Buffer.from(username).toString("base64"), 334);
    await command(Buffer.from(options.password).toString("base64"), 235);
    await command(`MAIL FROM:<${from.envelope}>`, 250);
    await command(`RCPT TO:<${to}>`, 250, 251);
    await command("DATA", 354);

    const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`;
    const content = Buffer.from(options.html).toString("base64").match(/.{1,76}/g)?.join("\r\n") || "";
    const raw = [
      `From: ${from.header}`, `To: <${to}>`, `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64", "", content,
    ].join("\r\n");
    await command(raw + "\r\n.", 250);
    await command("QUIT", 221);
    return true;
  } finally {
    clearTimeout(timer);
    socket?.destroy();
  }
}
