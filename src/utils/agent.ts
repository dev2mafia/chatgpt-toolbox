import { HttpsProxyAgent } from 'hpagent'

export const httpsProxyAgent = process.env.CHATGPT_PROXY
  ? new HttpsProxyAgent({
      keepAlive: true,
      timeout: 30000,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      proxy: process.env.CHATGPT_PROXY,
    })
  : undefined
