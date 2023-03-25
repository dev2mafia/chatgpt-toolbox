import makeSession from 'fetch-cookie'
import fetch from 'node-fetch'
import { debug } from '../utils/debug'
import { httpsProxyAgent } from '../utils/agent'

const log = debug('Authenticator')

export class Authenticator {
  #email: string
  #password: string
  #session: any

  constructor(email: string, password: string) {
    this.#email = email
    this.#password = password
    this.#session = makeSession(fetch)
  }

  async login(email = this.#email, password = this.#password) {
    return this.#zero()
      .then(this.#one.bind(this))
      .then(this.#two.bind(this))
      .then(this.#three.bind(this))
      .then((state) => this.#four(state, email))
      .then((state) => this.#five(state, email, password))
      .then(this.#six.bind(this))
      .then(this.#seven.bind(this))
  }

  refresh() {
    return this.#seven()
  }

  async #zero() {
    log('[zero]')
    return (
      await (
        await this.#session('https://explorer.api.openai.com/api/auth/csrf', {
          method: 'GET',
          agent: httpsProxyAgent,
        })
      ).json()
    ).csrfToken
  }

  async #one(csrfToken: string) {
    log('[one]', csrfToken)
    return (
      await (
        await this.#session(
          'https://explorer.api.openai.com/api/auth/signin/auth0?prompt=login',
          {
            method: 'POST',
            body: new URLSearchParams({
              callbackUrl: '/',
              csrfToken,
              json: 'true',
            }),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            agent: httpsProxyAgent,
          },
        )
      ).json()
    ).url
  }

  async #two(url: string) {
    log('[two]', url)
    const response = await this.#session(url, {
      method: 'GET',
      redirect: 'manual',
      agent: httpsProxyAgent,
    })
    return (await response.text()).slice(48)
  }

  async #three(state: string) {
    log('[three]', state)
    const response = await this.#session(
      `https://auth0.openai.com/u/login/identifier?state=${state}`,
      {
        method: 'GET',
        agent: httpsProxyAgent,
      },
    )
    return state
  }

  async #four(state: string, username: string) {
    log('[four]', state)
    const response = await this.#session(
      `https://auth0.openai.com/u/login/identifier?state=${state}`,
      {
        method: 'POST',
        body: new URLSearchParams({
          state,
          username,
          'js-available': 'false',
          'webauthn-available': 'true',
          'is-brave': 'false',
          'webauthn-platform-available': 'true',
          action: 'default',
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        agent: httpsProxyAgent,
      },
    )
    return state
  }

  async #five(state: string, username: string, password: string) {
    log('[five]', state)
    const response = await this.#session(
      `https://auth0.openai.com/u/login/password?state=${state}`,
      {
        method: 'POST',
        body: new URLSearchParams({
          state,
          username,
          password,
          action: 'default',
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        redirect: 'manual',
        agent: httpsProxyAgent,
      },
    )
    return (await response.text()).slice(46)
  }

  async #six(state: string) {
    log('[six]', state)
    await this.#session(
      `https://auth0.openai.com/authorize/resume?state=${state}`,
      { method: 'GET', agent: httpsProxyAgent },
    )
  }

  async #seven() {
    log('[seven]')
    const response = await this.#session(
      'https://explorer.api.openai.com/api/auth/session',
      { agent: httpsProxyAgent },
    )
    const { accessToken } = await response.json()
    return {
      accessToken,
      sessionCookie: response.headers.get('set-cookie').split(';')[0],
    }
  }
}
