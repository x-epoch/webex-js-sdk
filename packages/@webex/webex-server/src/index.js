/*!
 *  Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint-disable no-console */

import compression from 'compression';
import cors from 'cors';
import errorHandler from 'errorhandler';
import express from 'express';
import morgan from 'morgan';
import onFinished from 'on-finished';
import requestId from 'request-id/express';
import responseTime from 'response-time';
import uuid from 'uuid';

import Webex from './webex';
import sessionRouter from './session';

const app = express();

app.use(responseTime());
app.use(requestId({
  generator() {
    // TODO get sequence from session data
    const sequence = 0;

    return `webex-server_${uuid.v4()}_${sequence}`;
  },
  reqHeader: 'TrackingID',
  resHeader: 'TrackingID'
}));
app.use(morgan('dev'));
app.use((req, res, next) => {
  onFinished(res, () => {
    console.info(req.method.toUpperCase(), req.path, res.statusCode, res.getHeader('X-Response-Time'));
  });
  next();
});
app.use(compression());
app.use(cors({
  origin: true,
  credentials: true,
  maxAge: 24 * 60 * 60
}));

app.get('/ping', (req, res) => {
  res.send(Object.assign({name: '@webex/webex-server', version: PACKAGE_VERSION}, {
    'sdk-version': Webex.version
  }));
});

app.use('/api/v1', sessionRouter);

app.use(errorHandler());

module.exports = app;
