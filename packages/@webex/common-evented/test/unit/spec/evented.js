/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import evented from '@webex/common-evented';
import Events from 'ampersand-events';
import {assert} from '@webex/test-helper-chai';
import sinon from 'sinon';

describe('common-evented', () => {
  describe('@evented()', () => {
    class EventedClass {
      @evented
        prop = null;
    }

    Object.assign(EventedClass.prototype, Events);

    it('fires a specific change event', () => {
      const ec = new EventedClass();
      const spy = sinon.spy();

      ec.on('change:prop', spy);
      ec.prop = 1;
      assert.calledOnce(spy);
    });

    it('fires a generic change evnet', () => {
      const ec = new EventedClass();
      const spy = sinon.spy();

      ec.on('change', spy);
      ec.prop = 1;
      assert.calledOnce(spy);
    });

    it('fires the all event', () => {
      const ec = new EventedClass();
      const spy = sinon.spy();

      ec.on('all', spy);
      ec.prop = 1;
      // Once for `change:prop`, once for `change`
      assert.calledTwice(spy);
    });
  });
});
