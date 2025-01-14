/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import bowser from 'bowser';
import {Exception} from '@webex/common';
import {assert} from '@webex/test-helper-chai';

describe('common', () => {
  describe('Exception', () => {
    describe('.parse()', () => {
      it('enables derived classes to override the default message', () => {
        class NoParserException extends Exception {
          static defaultMessage = 'no parser';
        }

        class DerivedNoParserException extends NoParserException {

        }

        class StaticBadParserException extends DerivedNoParserException {
          static parse() {
            return 'not really parsed';
          }
        }

        class NonStaticBadParserException extends StaticBadParserException {
          static parse() {
            return 'not really parsed, but like, totally not static';
          }
        }

        let e = new NoParserException();

        assert.match(e.message, /no parser/);
        assert.match(e.toString(), /no parser/);

        e = new DerivedNoParserException();
        assert.match(e.message, /no parser/);
        assert.match(e.toString(), /no parser/);

        e = new StaticBadParserException();
        assert.match(e.message, /not really parsed/);
        assert.match(e.toString(), /not really parsed/);

        e = new NonStaticBadParserException();
        assert.match(e.message, /not really parsed, but like, totally not static/);
        assert.match(e.toString(), /not really parsed, but like, totally not static/);
      });
    });

    describe('#defaultMessage', () => {
      it('gets used when no messsage is supplied', () => {
        let exception = new Exception();

        assert.match(exception.message, /An error occurred/);
        assert.match(exception.toString(), /An error occurred/);

        exception = new Exception(undefined);
        assert.match(exception.message, /An error occurred/);
        assert.match(exception.toString(), /An error occurred/);

        exception = new Exception(null);
        assert.match(exception.message, /An error occurred/);
        assert.match(exception.toString(), /An error occurred/);

        exception = new Exception('');
        assert.match(exception.message, /An error occurred/);
        assert.match(exception.toString(), /An error occurred/);
      });

      it('gets overridden by derived classes', () => {
        class MyException extends Exception {
          static defaultMessage = 'My exception occurred';
        }
        const exception = new MyException();

        assert.match(exception.message, /My exception occurred/);
        assert.match(exception.toString(), /My exception occurred/);
      });

      it('gets ignored when a string is supplied to the constructor', () => {
        const exception = new Exception('Something bad happened');

        assert.match(exception.message, /Something bad happened/);
        assert.match(exception.toString(), /Something bad happened/);
      });
    });

    // Skip in IE.
    (bowser.msie ? it.skip : it)('includes the exception class name when stringified', () => {
      class MyException extends Exception {
        static defaultMessage = 'My exception occurred';
      }

      let m = new MyException();

      assert.match(m.toString(), /MyException: My exception occurred/);

      m = new MyException('Your exception occurred');
      assert.match(m.toString(), /MyException: Your exception occurred/);
    });
  });
});
