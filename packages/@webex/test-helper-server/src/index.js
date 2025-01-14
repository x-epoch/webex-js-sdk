/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint max-nested-callbacks: [2, 3] */
/* eslint no-console: [0] */


const btoa = require(`btoa`);
const bodyParser = require(`body-parser`);
const browserify = require(`browserify-middleware`);
const compression = require(`compression`);
const cors = require(`cors`);
const express = require(`express`);
const fs = require(`fs`);
const glob = require(`glob`);
const http = require(`http`);
const morgan = require(`morgan`);
const path = require(`path`);
const querystring = require(`querystring`);
const request = require(`request`);
const url = require(`url`);
const base64 = require(`urlsafe-base64`);

const app = express();

// Configure Logging
// -----------------

if (process.env.DEBUG) {
  app.use(morgan(`short`, {
    immediate: true
  }));
}

// Configure CORS
// --------------

app.use(cors({
  credentials: true,
  origin(o, callback) {
    callback(null, true);
  }
}));

// Configure body processing
// -------------------------

app.use(bodyParser.raw({type: `image/*`}));

// Enable gzip/deflate
// -------------------

app.use(compression());

// Close all connections
// ---------------------

// This *should* help tests run faster in IE, which has a very low number of
// allowed connections to the same origin.
app.use((req, res, next) => {
  res.set(`connection`, `close`);
  next();
});

// Configure Browserify
// --------------------

const appPattern = `packages/{*,*/*}/test/automation/fixtures/app.js`;

glob.sync(appPattern).forEach((appjs) => {
  const packageName = appjs
    .replace(`packages/`, ``)
    .replace(`/test/automation/fixtures/app.js`, ``);

  // eslint-disable-next-line no-sync
  fs.statSync(appjs);
  app.use(`/${packageName}/app.js`, browserify(appjs, {
    debug: true,
    transform: [
      `babelify`,
      `envify`
    ]
  }));
});

// Enable active routes
// --------------------

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Redirect Dispatcher</title>
    <script>
    try {
      var state = /state=(.+?)(&.*)?$/.exec(window.location)[1]
      console.info('state', state);
      var name = JSON.parse(atob(state)).name;
      console.info('name', name);
      window.location.pathname = name;
    }
    catch(err) {
      console.warn(err);
    }
    </script>
  </head>
  <body>

  </body>
</html>`);
});

app.use(`/cookies`, require(`./cookies`));
app.use(`/json`, require(`./json`));
app.use(`/form`, require(`./form`));
app.use(`/files`, require(`./files`));
app.use(`/jwt`, require(`@webex/test-helper-appid`).router);

app.get(`/requires-basic-auth`, (req, res) => {
  if (req.headers.authorization === `Basic ${btoa(`basicuser:basicpass`)}`) {
    res.status(200).send().end();
  }
  else {
    res.status(403).send().end();
  }
});

app.get(`/requires-bearer-auth`, (req, res) => {
  if (req.headers.authorization === `Bearer bearertoken`) {
    res.status(200).send().end();
  }
  else {
    res.status(403).send().end();
  }
});

app.get(`/return-qs-as-object`, (req, res) => {
  res.status(200).json(req.query).end();
});

app.get(`/embargoed`, (req, res) => {
  res.status(451).end();
});

// Enable static routes
// --------------------

const fixturePattern = `packages/{*,*/*}/test/automation/fixtures`;


glob.sync(fixturePattern).forEach((fixturePath) => {
  const packageName = fixturePath
    .replace(`packages/`, ``)
    .replace(`/test/automation/fixtures`, ``);

  app.get(`/${packageName}`, (req, res, next) => {
    if (!req.query.code) {
      next();

      return;
    }

    const state = JSON.parse(base64.decode(req.query.state));

    if (state.exchange === false) {
      next();

      return;
    }

    request({
      /* eslint-disable camelcase */
      method: `POST`,
      uri: `${process.env.IDBROKER_BASE_URL || `https://idbroker.webex.com`}/idb/oauth2/v1/access_token`,
      form: {
        grant_type: `authorization_code`,
        redirect_uri: process.env.WEBEX_REDIRECT_URI,
        code: req.query.code,
        self_contained_token: true
      },
      auth: {
        user: process.env.WEBEX_CLIENT_ID,
        pass: process.env.WEBEX_CLIENT_SECRET,
        sendImmediately: true
      }
      /* eslint-enable camelcase */
    }, (err, response) => {
      if (err) {
        console.warn(`Request to CI failed with non-HTTP error`);
        next(err);

        return;
      }
      if (response.statusCode >= 400) {
        console.warn(`Got unexpected response from CI`);
        next(new Error(response.body));

        return;
      }
      let redirect = url.parse(req.url, true);
      const qs = querystring.stringify(Object.assign({state: req.query.state}, JSON.parse(response.body)));

      redirect = `${redirect.pathname}#${qs}`;

      console.info(`redirecting to ${redirect}`);
      res.redirect(redirect);
    });
  });
  app.use(`/${packageName}`, express.static(fixturePath));
});

app.post(`/refresh`, bodyParser.json(), (req, res, next) => {
  if (!req.body.refresh_token) {
    next(new Error(`\`refresh_token\` is required`));

    return;
  }
  console.info(`Refreshing access token`);
  request({
    /* eslint-disable camelcase */
    method: `POST`,
    uri: `${process.env.IDBROKER_BASE_URL || `https://idbroker.webex.com`}/idb/oauth2/v1/access_token`,
    form: {
      grant_type: `refresh_token`,
      redirect_uri: process.env.WEBEX_REDIRECT_URI,
      refresh_token: req.body.refresh_token
    },
    auth: {
      user: process.env.WEBEX_CLIENT_ID,
      pass: process.env.WEBEX_CLIENT_SECRET,
      sendImmediately: true
    }
    /* eslint-enable camelcase */
  }, (err, response) => {
    if (err) {
      console.warn(`Request to CI failed with non-HTTP error`);
      next(err);

      return;
    }
    if (response.statusCode >= 400) {
      console.warn(`Got unexpected response from CI`);
      next(new Error(response.body));

      return;
    }

    console.info(`Returning new access token`);
    res.status(200).json(JSON.parse(response.body)).end();
  });
});

app.use(express.static(path.resolve(__dirname, '..', `static`)));

// Start the server
// ----------------

const port = parseInt(process.env.SERVER_PORT, 10) || 8000;

http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

const fixtureport = parseInt(process.env.FIXTURE_PORT, 10) || 3000;

http.createServer(app).listen(fixtureport, () => {
  console.log(`Express server listening on port ${fixtureport}`);
});

const corsport = parseInt(process.env.CORS_PORT, 10) || 3002;

http.createServer(app).listen(corsport, () => {
  console.log(`Express server listening on port ${corsport}`);
});
