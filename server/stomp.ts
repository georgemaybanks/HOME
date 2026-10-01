import net from 'node:net';

export interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: Buffer;
}

interface StompOptions {
  host: string;
  port: number;
  login: string;
  passcode: string;
  clientId: string;
  onReady: (send: (command: string, headers: Record<string, string>) => void) => void;
  onFrame: (frame: StompFrame) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export const openStomp = (options: StompOptions) => {
  const socket = net.connect({ host: options.host, port: options.port });
  const parser = createFrameParser();
  let settled = false;
  const heartbeat = setInterval(() => {
    if (!socket.destroyed) socket.write('\n');
  }, 10_000);

  const finish = (error?: Error) => {
    if (settled) return;
    settled = true;
    clearInterval(heartbeat);
    if (error) options.onError(error);
    options.onClose();
  };

  const send = (command: string, headers: Record<string, string>) => {
    const lines = [command, ...Object.entries(headers).map(([key, value]) => `${key}:${value}`), '', ''];
    socket.write(`${lines.join('\n')}\0`);
  };

  socket.setKeepAlive(true);
  socket.on('connect', () => {
    send('CONNECT', {
      'accept-version': '1.2',
      host: options.host,
      login: options.login,
      passcode: options.passcode,
      'heart-beat': '10000,10000',
      'client-id': options.clientId,
    });
  });
  socket.on('data', (chunk: Buffer) => {
    for (const frame of parser.push(chunk)) {
      if (frame.command === 'CONNECTED') {
        options.onReady(send);
        continue;
      }
      if (frame.command === 'ERROR') {
        const message = frame.headers.message || frame.body.toString('utf8').trim() || 'Darwin rejected the connection.';
        options.onError(new Error(message));
        socket.destroy();
        return;
      }
      options.onFrame(frame);
    }
  });
  socket.on('error', (error) => {
    socket.destroy();
    finish(error);
  });
  socket.on('close', () => finish());

  return { close: () => { settled = true; clearInterval(heartbeat); socket.destroy(); } };
};

const createFrameParser = () => {
  let buffer = Buffer.alloc(0);

  return {
    push(chunk: Buffer) {
      buffer = Buffer.concat([buffer, chunk]);
      const frames: StompFrame[] = [];
      while (buffer.length) {
        let start = 0;
        while (start < buffer.length && (buffer[start] === 10 || buffer[start] === 13)) start += 1;
        if (start) buffer = buffer.subarray(start);
        if (!buffer.length) break;

        const lineBreak = buffer.indexOf('\n\n');
        const windowsBreak = buffer.indexOf('\r\n\r\n');
        const separator = lineBreak !== -1 && (windowsBreak === -1 || lineBreak < windowsBreak)
          ? { index: lineBreak, length: 2 }
          : windowsBreak === -1 ? null : { index: windowsBreak, length: 4 };
        if (!separator) break;

        const headerText = buffer.subarray(0, separator.index).toString('utf8');
        const lines = headerText.split(/\r?\n/);
        const command = lines[0] ?? '';
        const headers: Record<string, string> = {};
        for (const line of lines.slice(1)) {
          const split = line.indexOf(':');
          if (split === -1) continue;
          const key = line.slice(0, split);
          if (!(key in headers)) headers[key] = line.slice(split + 1);
        }

        const bodyStart = separator.index + separator.length;
        const length = headers['content-length'] ? Number(headers['content-length']) : null;
        if (length != null && Number.isFinite(length)) {
          if (buffer.length < bodyStart + length) break;
          const body = buffer.subarray(bodyStart, bodyStart + length);
          let consumed = bodyStart + length;
          if (buffer[consumed] === 0) consumed += 1;
          buffer = buffer.subarray(consumed);
          frames.push({ command, headers, body });
          continue;
        }

        const terminator = buffer.indexOf(0, bodyStart);
        if (terminator === -1) break;
        frames.push({ command, headers, body: buffer.subarray(bodyStart, terminator) });
        buffer = buffer.subarray(terminator + 1);
      }
      if (buffer.length > 2_000_000) buffer = Buffer.alloc(0);
      return frames;
    },
  };
};
