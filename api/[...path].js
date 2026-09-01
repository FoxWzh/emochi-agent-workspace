// Vercel's Node runtime supplies IncomingMessage/ServerResponse objects.
// Reuse the existing HTTP request handler unchanged so the browser keeps the
// same /api/* contract in local development and in the demo deployment.
import { createServer } from '../server/app.js';

const app = createServer();

export default function handler(req, res) {
  app.emit('request', req, res);
}
