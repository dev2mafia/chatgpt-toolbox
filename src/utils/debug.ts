import Debug from 'debug'

export function debug(scope: string) {
  return Debug(`chatgpt-toolbox:${scope}`)
}
