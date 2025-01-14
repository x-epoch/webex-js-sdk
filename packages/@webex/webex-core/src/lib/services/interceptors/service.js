/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {Interceptor} from '@webex/http-core';

const trailingSlashes = /(?:^\/)|(?:\/$)/;

/**
 * @class
 */
export default class ServiceInterceptor extends Interceptor {
  /**
   * @returns {ServiceInterceptor}
   */
  static create() {
    /* eslint no-invalid-this: [0] */
    return new ServiceInterceptor({webex: this});
  }

  /* eslint-disable no-param-reassign */
  /**
   * @see Interceptor#onRequest
   * @param {Object} options - The request PTO.
   * @returns {Object} - The mutated request PTO.
   */
  onRequest(options) {
    // Validate that the PTO includes a uri property.
    if (options.uri) {
      return options;
    }

    // Normalize and validate the PTO.
    this.normalizeOptions(options);
    this.validateOptions(options);

    // Destructure commonly referenced namespaces.
    const {services} = this.webex.internal;
    const {service, resource} = options;

    // Attempt to collect the service url.
    return services.waitForService({name: service})
      .then((serviceUrl) => {
        // Generate the combined service url and resource.
        options.uri = this.generateUri(serviceUrl, resource);

        return options;
      })
      .catch(() => Promise.reject(new Error(
        `service-interceptor: '${service}' is not a known service`
      )));
  }

  /* eslint-disable class-methods-use-this */
  /**
   * Generate a usable request uri string from a service url and a resouce.
   *
   * @param {string} serviceUrl - The service url.
   * @param {string} [resource] - The resouce to be appended to the service url.
   * @returns {string} - The combined service url and resource.
   */
  generateUri(serviceUrl, resource = '') {
    const formattedService = serviceUrl.replace(trailingSlashes, '');
    const formattedResource = resource.replace(trailingSlashes, '');

    return `${formattedService}/${formattedResource}`;
  }

  /**
   * Normalizes request options relative to service identification.
   *
   * @param {Object} options - The request PTO.
   * @returns {Object} - The mutated request PTO.
   */
  normalizeOptions(options) {
    // Validate if the api property is used.
    if (options.api) {
      // Assign the service property the value of the api property if necessary.
      options.service = options.service || options.api;
      delete options.api;
    }
  }

  /**
   * Validates that the appropriate options for this interceptor are present.
   *
   * @param {Object} options - The request PTO.
   * @returns {Object} - The mutated request PTO.
   */
  validateOptions(options) {
    if (!options.resource) {
      throw new Error('a `resource` parameter is required');
    }

    if (!options.service) {
      throw new Error('a valid \'service\' parameter is required');
    }
  }
  /* eslint-enable class-methods-use-this, no-param-reassign */
}
