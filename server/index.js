import process from 'node:process';
try{process.loadEnvFile('.env.local')}catch{}
import {createServer} from './app.js';
const port=Number(process.env.AGENT_PORT||8789);const server=createServer();server.on('error',error=>{console.error('[server] failed to start:',error.message);process.exitCode=1});server.listen(port,'127.0.0.1',()=>console.log(`Emochi API http://127.0.0.1:${port}`));
