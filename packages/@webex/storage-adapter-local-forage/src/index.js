/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint-env browser */

import localforage from 'localforage';
import {oneFlight} from '@webex/common';
import {NotFoundError} from '@webex/webex-core';

const namespaces = new WeakMap();
const loggers = new WeakMap();

/**
* IndexedDB adapter for webex-core storage layer
*/
export default class StorageAdapterLocalForage {
  /**
   * @constructs {StorageAdapterLocalForage}
   * @param {string} basekey localforage key under which
   * all namespaces will be stored
   */
  constructor() {
    /**
     * localforage binding
     */
    this.Bound = class {
      /**
       * @constructs {Bound}
       * @param {string} namespace
       * @param {Object} options
       */
      constructor(namespace, options) {
        namespaces.set(this, namespace);
        loggers.set(this, options.logger);
      }

      /**
       * Clears the localforage
       * @param {string} key
       * @returns {Promise}
       */
      clear() {
        loggers.get(this).debug('storage-adapter-local-forage: clearing localforage');

        return Promise.resolve(localforage.clear());
      }

      @oneFlight({
        keyFactory: (key) => key
      })
      /**
       * Removes the specified key
       * @param {string} key
       * @returns {Promise}
       */
      // suppress doc warning because decorators confuse eslint
      // eslint-disable-next-line require-jsdoc
      del(key) {
        const key_ = `${namespaces.get(this)}/${key}`;

        loggers.get(this).debug(`storage-adapter-local-forage: deleting \`${key_}\``);

        return localforage.removeItem(key_);
      }

      @oneFlight({
        keyFactory: (key) => key
      })
      /**
       * Retrieves the data at the specified key
       * @param {string} key
       * @see https://localforage.github.io/localForage/#data-api-getitem
       * @returns {Promise<mixed>}
       */
      // suppress doc warning because decorators confuse eslint
      // eslint-disable-next-line require-jsdoc
      get(key) {
        const key_ = `${namespaces.get(this)}/${key}`;

        loggers.get(this).debug(`storage-adapter-local-forage: reading \`${key_}\``);

        return localforage.getItem(key_)
          .then((value) => {
            // if the key does not exist, getItem() will return null
            if (value === null) {
              // If we got null, we need to check if it's because the key
              // doesn't exist or because it has a saved value of null.
              return localforage.keys()
                .then((keys) => {
                  if (keys.includes(key_)) {
                    return Promise.resolve(value);
                  }

                  return Promise.reject(new NotFoundError(`No value found for ${key_}`));
                });
            }

            //  even if undefined is saved, null will be returned by getItem()
            return Promise.resolve(value);
          });
      }

      /**
       * Stores the specified value at the specified key.
       * If key is undefined, removes the specified key.
       * @param {string} key
       * @param {mixed} value
       * @returns {Promise}
       */
      put(key, value) {
        if (typeof value === 'undefined') {
          return this.del(key);
        }
        const key_ = `${namespaces.get(this)}/${key}`;

        loggers.get(this).debug(`storage-adapter-local-forage: writing \`${key_}\``);

        return localforage.setItem(key_, value);
      }
    };
  }

  /**
  * Returns an adapter bound to the specified namespace
  * @param {string} namespace
  * @param {Object} options
  * @returns {Promise<Bound>}
  */
  bind(namespace, options) {
    options = options || {};
    if (!namespace) {
      return Promise.reject(new Error('`namespace` is required'));
    }

    if (!options.logger) {
      return Promise.reject(new Error('`options.logger` is required'));
    }

    options.logger.info('storage-adapter-local-forage: returning binding');

    return Promise.resolve(new this.Bound(namespace, options));
  }
}
