/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {assert} from '@webex/test-helper-chai';
import {HttpError} from '@webex/http-core';

describe('http-core', () => {
  describe('HttpError', () => {
    it('has subtypes for all standard http errors', () => {
      assert.property(HttpError, 'BadRequest');
      assert.property(HttpError, 'Unauthorized');
      assert.property(HttpError, 'PaymentRequired');
      assert.property(HttpError, 'Forbidden');
      assert.property(HttpError, 'NotFound');
      assert.property(HttpError, 'MethodNotAllowed');
      assert.property(HttpError, 'NotAcceptable');
      assert.property(HttpError, 'ProxyAuthenticationRequired');
      assert.property(HttpError, 'RequestTimeout');
      assert.property(HttpError, 'Conflict');
      assert.property(HttpError, 'Gone');
      assert.property(HttpError, 'LengthRequired');
      assert.property(HttpError, 'PreconditionFailed');
      assert.property(HttpError, 'RequestEntityTooLarge');
      assert.property(HttpError, 'RequestUriTooLong');
      assert.property(HttpError, 'UnsupportedMediaType');
      assert.property(HttpError, 'RequestRangeNotSatisfiable');
      assert.property(HttpError, 'ExpectationFailed');
      assert.property(HttpError, 'TooManyRequests');
      assert.property(HttpError, 'InternalServerError');
      assert.property(HttpError, 'NotImplemented');
      assert.property(HttpError, 'BadGateway');
      assert.property(HttpError, 'ServiceUnavailable');
      assert.property(HttpError, 'GatewayTimeout');
      assert.property(HttpError, 'HttpVersionNotSupported');
      assert.property(HttpError, 'TooManyRequests');
    });

    it('has a subtype for network or CORS errors', () => {
      assert.property(HttpError, 'NetworkOrCORSError');
    });

    it('maps http status codes to their corresponding Error types', () => {
      assert.equal(HttpError[0], HttpError.NetworkOrCORSError);
      assert.equal(HttpError[400], HttpError.BadRequest);
      assert.equal(HttpError[401], HttpError.Unauthorized);
      assert.equal(HttpError[402], HttpError.PaymentRequired);
      assert.equal(HttpError[403], HttpError.Forbidden);
      assert.equal(HttpError[404], HttpError.NotFound);
      assert.equal(HttpError[405], HttpError.MethodNotAllowed);
      assert.equal(HttpError[406], HttpError.NotAcceptable);
      assert.equal(HttpError[407], HttpError.ProxyAuthenticationRequired);
      assert.equal(HttpError[408], HttpError.RequestTimeout);
      assert.equal(HttpError[409], HttpError.Conflict);
      assert.equal(HttpError[410], HttpError.Gone);
      assert.equal(HttpError[411], HttpError.LengthRequired);
      assert.equal(HttpError[412], HttpError.PreconditionFailed);
      assert.equal(HttpError[413], HttpError.RequestEntityTooLarge);
      assert.equal(HttpError[414], HttpError.RequestUriTooLong);
      assert.equal(HttpError[415], HttpError.UnsupportedMediaType);
      assert.equal(HttpError[416], HttpError.RequestRangeNotSatisfiable);
      assert.equal(HttpError[417], HttpError.ExpectationFailed);
      assert.equal(HttpError[429], HttpError.TooManyRequests);
      assert.equal(HttpError[500], HttpError.InternalServerError);
      assert.equal(HttpError[501], HttpError.NotImplemented);
      assert.equal(HttpError[502], HttpError.BadGateway);
      assert.equal(HttpError[503], HttpError.ServiceUnavailable);
      assert.equal(HttpError[504], HttpError.GatewayTimeout);
      assert.equal(HttpError[505], HttpError.HttpVersionNotSupported);
    });

    it('falls back to a default error message', () => {
      const res = {
        statusCode: 400
      };

      const error = new HttpError(res);

      assert.equal(error.message, 'An error was received while trying to fulfill the request');
    });

    it('parses string responses', () => {
      const message = 'an error occurred';
      const res = {
        statusCode: 400,
        body: message
      };

      const error = new HttpError(res);

      assert.equal(error.message, message);
    });

    it('parses JSON responses', () => {
      const message = {
        data: 'an error'
      };

      const res = {
        statusCode: 400,
        body: message
      };

      const error = new HttpError(res);

      assert.equal(error.message, JSON.stringify(message, null, 2));
    });

    it('parses stringified JSON responses', () => {
      const message = JSON.stringify({
        data: 'an error'
      });

      const res = {
        statusCode: 400,
        body: message
      };

      const error = new HttpError(res);

      assert.equal(error.message, JSON.stringify(JSON.parse(message), null, 2));
    });

    it('parses JSON responses for candidate error messages', () => {
      const message = 'an error occurred';
      const res = {
        statusCode: 400,
        body: {
          error: message
        }
      };

      const error = new HttpError(res);

      assert.equal(error.message, message);
    });

    it('parses JSON responses for candidate error messages recursively', () => {
      const message = 'an error occurred';
      const res = {
        statusCode: 400,
        body: {
          error: {
            errorString: message
          }
        }
      };

      const error = new HttpError(res);

      assert.equal(error.message, message);
    });

    describe('.select()', () => {
      it('determines the correct Error object for the specified status code', () => {
        assert.equal(HttpError.select(), HttpError);
        assert.equal(HttpError.select(0), HttpError.NetworkOrCORSError);
        assert.equal(HttpError.select(400), HttpError.BadRequest);
        assert.equal(HttpError.select(401), HttpError.Unauthorized);
        assert.equal(HttpError.select(402), HttpError.PaymentRequired);
        assert.equal(HttpError.select(403), HttpError.Forbidden);
        assert.equal(HttpError.select(404), HttpError.NotFound);
        assert.equal(HttpError.select(405), HttpError.MethodNotAllowed);
        assert.equal(HttpError.select(406), HttpError.NotAcceptable);
        assert.equal(HttpError.select(407), HttpError.ProxyAuthenticationRequired);
        assert.equal(HttpError.select(408), HttpError.RequestTimeout);
        assert.equal(HttpError.select(409), HttpError.Conflict);
        assert.equal(HttpError.select(410), HttpError.Gone);
        assert.equal(HttpError.select(411), HttpError.LengthRequired);
        assert.equal(HttpError.select(412), HttpError.PreconditionFailed);
        assert.equal(HttpError.select(413), HttpError.RequestEntityTooLarge);
        assert.equal(HttpError.select(414), HttpError.RequestUriTooLong);
        assert.equal(HttpError.select(415), HttpError.UnsupportedMediaType);
        assert.equal(HttpError.select(416), HttpError.RequestRangeNotSatisfiable);
        assert.equal(HttpError.select(417), HttpError.ExpectationFailed);
        assert.equal(HttpError.select(499), HttpError.BadRequest);
        assert.equal(HttpError.select(500), HttpError.InternalServerError);
        assert.equal(HttpError.select(501), HttpError.NotImplemented);
        assert.equal(HttpError.select(502), HttpError.BadGateway);
        assert.equal(HttpError.select(503), HttpError.ServiceUnavailable);
        assert.equal(HttpError.select(504), HttpError.GatewayTimeout);
        assert.equal(HttpError.select(505), HttpError.HttpVersionNotSupported);
        assert.equal(HttpError.select(599), HttpError.InternalServerError);
        assert.equal(HttpError.select(600), HttpError);
      });
    });
  });
});
