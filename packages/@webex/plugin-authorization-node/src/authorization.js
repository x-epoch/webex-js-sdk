/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint camelcase: [0] */

import {oneFlight, whileInFlight} from '@webex/common';
import {grantErrors, WebexPlugin} from '@webex/webex-core';

/**
 * NodeJS support for OAuth2
 * @class
 * @name AuthorizationNode
 */
const Authorization = WebexPlugin.extend({
  derived: {
    /**
     * Alias of {@link AuthorizationNode#isAuthorizing}
     * @instance
     * @memberof AuthorizationNode
     * @type {boolean}
     */
    isAuthenticating: {
      deps: ['isAuthorizing'],
      fn() {
        return this.isAuthorizing;
      }
    }
  },

  session: {
    /**
     * Indicates if an Authorization Code exchange is inflight
     * @instance
     * @memberof AuthorizationNode
     * @type {boolean}
     */
    isAuthorizing: {
      default: false,
      type: 'boolean'
    }
  },

  namespace: 'Credentials',

  logout(options = {}) {
    this.webex.request({
      method: 'POST',
      uri: this.config.logoutUrl,
      body: {
        token: options.token,
        cisService: this.config.service
      }
    });
  },

  @whileInFlight('isAuthorizing')
  @oneFlight
  /**
   * Exchanges an authorization code for an access token
   * @instance
   * @memberof AuthorizationNode
   * @param {Object} options
   * @param {Object} options.code
   * @returns {Promise}
   */
  requestAuthorizationCodeGrant(options = {}) {
    this.logger.info('credentials: requesting authorization code grant');

    if (!options.code) {
      return Promise.reject(new Error('`options.code` is required'));
    }

    return this.webex.request({
      method: 'POST',
      uri: this.config.tokenUrl,
      form: {
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirect_uri,
        code: options.code,
        self_contained_token: true
      },
      auth: {
        user: this.config.client_id,
        pass: this.config.client_secret,
        sendImmediately: true
      },
      shouldRefreshAccessToken: false
    })
      .then((res) => {
        this.webex.credentials.set({supertoken: res.body});
      })
      .catch((res) => {
        if (res.statusCode !== 400) {
          return Promise.reject(res);
        }

        const ErrorConstructor = grantErrors.select(res.body.error);

        return Promise.reject(new ErrorConstructor(res._res || res));
      });
  },

  @oneFlight
  /**
   * Requests a Webex access token for a user already authenticated into
   * your product.
   *
   * Note: You'll need to supply a jwtRefreshCallback of the form
   * `Promise<jwt> = jwtRefreshCallback(webex)` for automatic token refresh to
   * work.
   *
   * @instance
   * @memberof AuthorizationNode
   * @param {Object} options
   * @param {Object} options.jwt This is a jwt generated by your backend that
   * identifies a user in your system
   * @returns {Promise}
   */
  requestAccessTokenFromJwt({jwt}) {
    let hydraUri = this.webex.internal.services.get('hydra', true);

    if (hydraUri && hydraUri.slice(-1) !== '/') {
      // add a `/` to hydra's uri from the services catalog so that
      // it matches the current env service format.
      hydraUri += '/';
    }

    hydraUri = hydraUri ||
      process.env.HYDRA_SERVICE_URL ||
      'https://api.ciscospark.com/v1/';

    return this.webex.request({
      method: 'POST',
      uri: `${hydraUri}jwt/login`,
      headers: {
        authorization: jwt
      }
    })
      .then(({body}) => ({
        access_token: body.token,
        token_type: 'Bearer',
        expires_in: body.expiresIn
      }))
      .then((token) => {
        this.webex.credentials.set({
          supertoken: token
        });
      })
      .then(() => this.webex.internal.services.initServiceCatalogs());
  }
});

export default Authorization;
