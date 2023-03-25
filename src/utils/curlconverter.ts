import { debug } from './debug'

const log = debug('curlconverter')

const toJsonString = (curl: string): Promise<string> =>
  eval(`import('curlconverter')`).then(
    ({ toJsonString }: { toJsonString: (s: string) => string }) =>
      toJsonString(curl),
  )

export async function extractCurlCookies(curlCmd: string) {
  const jsonStr = await toJsonString(curlCmd)
  const { cookies } = <
    {
      cookies: Record<string, string>
    }
  >JSON.parse(jsonStr)
  return { cookies }
}
