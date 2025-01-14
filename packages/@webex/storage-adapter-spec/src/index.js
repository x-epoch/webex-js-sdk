/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

import {assert} from '@webex/test-helper-chai';

function noop() {
  // intentionally empty
}

export default function runAbstractStorageAdapterSpec(adapter) {
  const key = 'key';
  const namespace = 'namespace';
  const obj = {a: 1};
  const primitive = 1;
  const options = {
    logger: {
      error: noop,
      warning: noop,
      log: noop,
      info: noop,
      debug: noop,
      trace: noop
    }
  };

  describe('#bind()', () => {
    // namespace and options.logger are required more to make sure we always
    // call bind correctly rather than to make sure the adapter uses them.
    it('requires a namespace', () => assert.isRejected(adapter.bind(), /`namespace` is required/));

    it('requires a logger option', () => assert.isRejected(adapter.bind(namespace), /`options.logger` is required/));

    it('returns a db interface', () => adapter.bind(namespace, options));

    describe('bound', () => {
      let bound;

      before(() => adapter.bind(namespace, options)
        .then((b) => {
          bound = b;
        }));

      describe('#put()', () => {
        it('puts a primitive into the store', () => bound.put(key, primitive)
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, primitive))));

        [0, false, null].forEach((falsey) => {
          it(`puts falsey primitive \`${falsey}\` into the store`, () => bound.put(key, falsey)
            .then(() => bound.get(key)
              .then((result) => assert.deepEqual(result, falsey))));
        });

        it('puts an object into the store', () => bound.put(key, obj)
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, obj))));

        it('puts an array into the store', () => bound.put(key, [1, 2])
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, [1, 2]))));

        it('puts an array back into the store', () => bound.put(key, [1, 2])
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, [1, 2])))
          .then(() => bound.put(key, [1, 2, 3]))
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, [1, 2, 3]))));

        it('handles concurrency', () => Promise.all([
          bound.put(key, 1),
          bound.put(key, 2),
          bound.put(key, 3)
        ])
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, 3))));

        it('puts same key in different namespaces', () => bound.put(key, primitive)
          .then(() => adapter.bind('namespace2', options)
            .then((b) => {
              const primitive2 = 2;

              b.put(key, primitive2)
                .then(() => Promise.all([
                  bound.get(key)
                    .then((result) => assert.deepEqual(result, primitive)),
                  b.get(key)
                    .then((result) => assert.deepEqual(result, primitive2))
                ]));
            })));
      });

      describe('#get()', () => {
        it('gets a primitive from the store', () => bound.put(key, primitive)
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, primitive))));

        it('gets an object from the store', () => bound.put(key, obj)
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, obj))));

        it('rejects if the key cannot be found', () => assert.isRejected(bound.get('notakey')));
      });

      describe('#del()', () => {
        it('removes a primitive from the store', () => bound.put(key, primitive)
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, primitive)))
          .then(() => bound.del(key))
          .then(() => assert.isRejected(bound.get(key))));

        it('removes an object from the store', () => bound.put(key, obj)
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, obj)))
          .then(() => bound.del(key))
          .then(() => assert.isRejected(bound.get(key))));

        it('removes an item from the store when putting `undefined`', () => bound.put(key, undefined)
          .then(() => bound.del(key))
          .then(() => assert.isRejected(bound.get(key))));
      });

      describe('#clear()', () => {
        it('clears a primitive from the store', () => bound.put(key, primitive)
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, primitive)))
          .then(() => bound.clear())
          .then(() => assert.isRejected(bound.get(key))));

        it('clears an object from the store', () => bound.put(key, obj)
          .then(() => bound.get(key)
            .then((result) => assert.deepEqual(result, obj)))
          .then(() => bound.clear(key))
          .then(() => assert.isRejected(bound.get(key))));

        it('clears an item from the store when putting `undefined`', () => bound.put(key, undefined)
          .then(() => bound.clear(key))
          .then(() => assert.isRejected(bound.get(key))));
      });
    });
  });
}
