/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

/* eslint-env browser */

import {curry, forEach, includes, reduce} from 'lodash';

export {escape, escapeSync} from './html-base';

/**
 * Some browsers don't implement {@link Element#remove()} or
 * {@link NodeList#remove()} or {@link HTMLCollection#remove()}. This wrapper
 * calls the appropriate `#remove()` method if available, or falls back to a
 * non-global-polluting polyfill.
 * @param {Element|NodeList|HTMLCollection} node
 * @returns {undefined}
 */
function removeNode(node) {
  if (node.remove) {
    node.remove();

    return;
  }

  if (node.parentElement) {
    node.parentElement.removeChild(node);

    return;
  }

  if ('length' in node) {
    for (let i = node.length - 1; i >= 0; i -= 1) {
      removeNode(node[i]);
    }

    return;
  }

  throw new Error('Could not find a way to remove node');
}

/**
 * @param {Object} allowedTags
 * @param {Array<string>} allowedStyles
 * @param {string} html
 * @private
 * @returns {string}
 */
function _filter(...args) {
  return new Promise((resolve) => {
    resolve(_filterSync(...args));
  });
}

/**
 * Curried async HTML filter.
 * @param {Object} allowedTags Map of tagName -> array of allowed attributes
 * @param {Array<string>} allowedStyles Array of allowed styles
 * @param {string} html html to filter
 * @returns {string}
 */
export const filter = curry(_filter, 4);

/**
 * @param {function} processCallback callback function to do additional
 * processing on node. of the form process(node)
 * @param {Object} allowedTags
 * @param {Array<string>} allowedStyles
 * @param {string} html
 * @private
 * @returns {string}
 */
function _filterSync(processCallback, allowedTags, allowedStyles, html) {
  if (!html || !allowedStyles || !allowedTags) {
    if (html.length === 0) {
      return html;
    }

    throw new Error('`allowedTags`, `allowedStyles`, and `html` must be provided');
  }

  const doc = (new DOMParser()).parseFromString(html, 'text/html');

  depthFirstForEach(doc.body.childNodes, filterNode);
  processCallback(doc.body);

  if (html.indexOf('body') === 1) {
    return `<body>${doc.body.innerHTML}</body>`;
  }

  return doc.body.innerHTML;

  /**
   * @param {Node} node
   * @private
   * @returns {undefined}
   */
  function filterNode(node) {
    if (!isElement(node)) {
      return;
    }

    const nodeName = node.nodeName.toLowerCase();
    const allowedTagNames = Object.keys(allowedTags);

    depthFirstForEach(node.childNodes, filterNode);

    if (includes(allowedTagNames, nodeName)) {
      const allowedAttributes = allowedTags[nodeName];

      forEach(listAttributeNames(node.attributes), (attrName) => {
        if (!includes(allowedAttributes, attrName)) {
          node.removeAttribute(attrName);
        }
        else if (attrName === 'href' || attrName === 'src') {
          const attrValue = node.attributes.getNamedItem(attrName).value.trim().toLowerCase();

          // We're doing at runtime what the no-script-url rule does at compile
          // time
          // eslint-disable-next-line no-script-url
          if (attrValue.indexOf('javascript:') === 0 || attrValue.indexOf('vbscript:') === 0) {
            reparent(node);
          }
        }
        else if (attrName === 'style') {
          const styles = node
            .attributes
            .getNamedItem('style')
            .value
            .split(';')
            .map((style) => {
              const styleName = trim(style.split(':')[0]);

              if (includes(allowedStyles, styleName)) {
                return style;
              }

              return null;
            })
            .filter((style) => Boolean(style))
            .join(';');

          node.setAttribute('style', styles);
        }
      });
    }
    else {
      reparent(node);
    }
  }
}

/**
 * Same as _filter, but escapes rather than removes disallowed values
 * @param {Function} processCallback
 * @param {Object} allowedTags
 * @param {Array<string>} allowedStyles
 * @param {string} html
 * @returns {Promise<string>}
 */
function _filterEscape(...args) {
  return new Promise((resolve) => {
    resolve(_filterEscapeSync(...args));
  });
}

/**
 * Same as _filterSync, but escapes rather than removes disallowed values
 * @param {Function} processCallback
 * @param {Object} allowedTags
 * @param {Array<string>} allowedStyles
 * @param {string} html
 * @returns {string}
 */
function _filterEscapeSync(processCallback, allowedTags, allowedStyles, html) {
  if (!html || !allowedStyles || !allowedTags) {
    if (html.length === 0) {
      return html;
    }

    throw new Error('`allowedTags`, `allowedStyles`, and `html` must be provided');
  }

  const doc = (new DOMParser()).parseFromString(html, 'text/html');

  depthFirstForEach(doc.body.childNodes, filterNode);
  processCallback(doc.body);

  if (html.indexOf('body') === 1) {
    return `<body>${doc.body.innerHTML}</body>`;
  }

  return doc.body.innerHTML;

  /**
   * @param {Node} node
   * @private
   * @returns {undefined}
   */
  function filterNode(node) {
    if (!isElement(node)) {
      return;
    }

    depthFirstForEach(node.childNodes, filterNode);

    const nodeName = node.nodeName.toLowerCase();
    const allowedTagNames = Object.keys(allowedTags);

    if (includes(allowedTagNames, nodeName)) {
      const allowedAttributes = allowedTags[nodeName];

      forEach(listAttributeNames(node.attributes), (attrName) => {
        if (!includes(allowedAttributes, attrName)) {
          node.removeAttribute(attrName);
        }
        else if (attrName === 'href' || attrName === 'src') {
          const attrValue = node.attributes.getNamedItem(attrName).value.toLowerCase();

          // We're doing at runtime what the no-script-url rule does at compile
          // time
          // eslint-disable-next-line no-script-url
          if (attrValue.indexOf('javascript:') === 0 || attrValue.indexOf('vbscript:') === 0) {
            reparent(node);
          }
        }
        else if (attrName === 'style') {
          const styles = node
            .attributes
            .getNamedItem('style')
            .value
            .split(';')
            .map((style) => {
              const styleName = trim(style.split(':')[0]);

              if (includes(allowedStyles, styleName)) {
                return style;
              }

              return null;
            })
            .filter((style) => Boolean(style))
            .join(';');

          node.setAttribute('style', styles);
        }
      });
    }
    else {
      escapeNode(node);
    }
  }
}

/**
 * Escapes a given html node
 * @param {Node} node
 * @returns {undefined}
 */
function escapeNode(node) {
  const before = document.createTextNode(`<${node.nodeName.toLowerCase()}>`);
  const after = document.createTextNode(`</${node.nodeName.toLowerCase()}>`);

  node.parentNode.insertBefore(before, node);
  while (node.childNodes.length > 0) {
    node.parentNode.insertBefore(node.childNodes[0], node);
  }
  node.parentNode.insertBefore(after, node);

  removeNode(node);
}

const trimPattern = /^\s|\s$/g;

/**
 * @param {string} str
 * @returns {string}
 */
function trim(str) {
  return str.replace(trimPattern, '');
}

/**
 * @param {Node} node
 * @private
 * @returns {undefined}
 */
function reparent(node) {
  while (node.childNodes.length > 0) {
    node.parentNode.insertBefore(node.childNodes[0], node);
  }
  removeNode(node);
}

/**
 * @param {NamedNodeMap} attributes
 * @private
 * @returns {Array<string>}
 */
function listAttributeNames(attributes) {
  return reduce(attributes, (attrNames, attr) => {
    attrNames.push(attr.name);

    return attrNames;
  }, []);
}

/**
 * @param {Array} list
 * @param {Function} fn
 * @private
 * @returns {undefined}
 */
function depthFirstForEach(list, fn) {
  for (let i = list.length; i >= 0; i -= 1) {
    fn(list[i]);
  }
}

/**
 * @param {Node} o
 * @private
 * @returns {Boolean}
 */
function isElement(o) {
  if (!o) {
    return false;
  }

  if (o.ownerDocument === undefined) {
    return false;
  }

  if (o.nodeType !== 1) {
    return false;
  }

  if (typeof o.nodeName !== 'string') {
    return false;
  }

  return true;
}

/**
 * Curried HTML filter.
 * @param {Object} allowedTags Map of tagName -> array of allowed attributes
 * @param {Array<string>} allowedStyles Array of allowed styles
 * @param {string} html html to filter
 * @returns {string}
 */
export const filterSync = curry(_filterSync, 4);

/**
 * Curried HTML filter that escapes rather than removes disallowed tags
 * @param {Object} allowedTags Map of tagName -> array of allowed attributes
 * @param {Array<string>} allowedStyles Array of allowed styles
 * @param {string} html html to filter
 * @returns {Promise<string>}
 */
export const filterEscape = curry(_filterEscape, 4);

/**
 * Curried HTML filter that escapes rather than removes disallowed tags
 * @param {Object} allowedTags Map of tagName -> array of allowed attributes
 * @param {Array<string>} allowedStyles Array of allowed styles
 * @param {string} html html to filter
 * @returns {string}
 */
export const filterEscapeSync = curry(_filterEscapeSync, 4);
