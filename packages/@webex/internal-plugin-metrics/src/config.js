/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {inBrowser} from '@webex/common';

export const CLIENT_NAME = 'webex-js-sdk';
export default {
  device: {
    preDiscoveryServices: {
      metricsServiceUrl: process.env.METRICS_SERVICE_URL || 'https://metrics-a.wbx2.com/metrics/api/v1',
      metrics: process.env.METRICS_SERVICE_URL || 'https://metrics-a.wbx2.com/metrics/api/v1'
    }
  },
  metrics: {
    appType: inBrowser ? 'browser' : 'nodejs',
    batcherWait: 500,
    batcherMaxCalls: 50,
    batcherMaxWait: 1500,
    batcherRetryPlateau: 32000
  }
};
