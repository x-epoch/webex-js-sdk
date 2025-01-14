/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {safeSetTimeout} from '@webex/common-timers';
import {Batcher} from '@webex/webex-core';

import {KmsError, KmsTimeoutError} from './kms-errors';

export const TIMEOUT_SYMBOL = Symbol('TIMEOUT_SYMBOL');

/**
 * @class
 */
const KmsBatcher = Batcher.extend({
  namespace: 'Encryption',

  /**
   * Accepts a kmsMessage event and passes its contents to acceptItem
   * @param {Object} event
   * @returns {Promise}
   */
  processKmsMessageEvent(event) {
    this.logger.info('kms-batcher: received kms message');

    return Promise.all(event.encryption.kmsMessages.map((kmsMessage) => new Promise((resolve) => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        this.logger.info('kms-batcher:', kmsMessage.body);
      }

      resolve(this.acceptItem(kmsMessage));
    })));
  },

  /**
   * Attaches a timeout to the given KMS message
   * @param {Object} item
   * @returns {Promise<Object>}
   */
  prepareItem(item) {
    return this.getDeferredForRequest(item)
      .then((defer) => {
        const timeout = item[TIMEOUT_SYMBOL];

        /* istanbul ignore if */
        if (!timeout) {
          throw new Error('timeout is required');
        }

        const timer = safeSetTimeout(() => {
          this.logger.warn(`kms: request timed out; request id: ${item.requestId}; timeout: ${timeout}`);
          this.handleItemFailure(item, new KmsTimeoutError({
            timeout,
            request: item
          }));
        }, timeout);

        // Reminder: reassign `promise` is not a viable means of inserting into
        // the Promise chain
        defer.promise.then(() => clearTimeout(timer));
        defer.promise.catch(() => clearTimeout(timer));

        return item;
      });
  },

  /**
   * Attaches the final bits of cluster info to the payload
   * @param {Array} queue
   * @returns {Promise<Array>}
   */
  prepareRequest(queue) {
    return this.webex.internal.encryption.kms._getKMSCluster()
      .then((cluster) => ({
        destination: cluster,
        kmsMessages: queue.map((req) => req.wrapped)
      }));
  },

  /**
   * @param {Object} payload
   * @returns {Promise<HttpResponseObject>}
   */
  submitHttpRequest(payload) {
    this.logger.info('kms: batched-request-length', payload.kmsMessages.length);

    return this.webex.request({
      method: 'POST',
      service: 'encryption',
      resource: '/kms/messages',
      body: payload
    });
  },

  /**
   * Does nothing; the http response doesn't carry our response data
   * @returns {Promise}
   */
  handleHttpSuccess() {
    return Promise.resolve();
  },

  /**
   * @param {Object} item
   * @returns {Promise<boolean>}
   */
  didItemFail(item) {
    return Promise.resolve(item.status >= 400);
  },

  /**
   * @param {Object} item
   * @returns {Promise}
   */
  handleItemSuccess(item) {
    return this.getDeferredForResponse(item)
      .then((defer) => {
        defer.resolve(item.body);
      });
  },

  /**
   * @param {Object} item
   * @param {KmsError} [reason]
   * @returns {Promise}
   */
  handleItemFailure(item, reason) {
    return this.getDeferredForResponse(item)
      .then((defer) => {
        defer.reject(reason || new KmsError(item.body));
      });
  },

  /**
   * @param {Object} item
   * @returns {Promise}
   */
  fingerprintRequest(item) {
    return Promise.resolve(item.requestId);
  },

  /**
   * @param {Object} item
   * @returns {Promise}
   */
  fingerprintResponse(item) {
    return Promise.resolve(item.requestId);
  }
});

export default KmsBatcher;
