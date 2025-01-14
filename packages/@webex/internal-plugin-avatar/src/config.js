/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */

export default {
  avatar: {
    batcherWait: 100,
    batcherMaxCalls: 100,
    batcherMaxWait: 1500,

    /**
     * @description avatar URL store TTL, allows avatar updates to eventually be propegated
     * @type {number} Number of seconds the avatar should remain in store
     */
    cacheControl: 60 * 60,
    /**
     * @description default avatar size to retrieve if no size is specified
     * @type {number}
     */
    defaultAvatarSize: 80,
    sizes: [40, 50, 80, 110, 135, 192, 640, 1600],
    /**
     * Max height for thumbnails generated when sharing an image
     * @type {number}
     */
    thumbnailMaxHeight: 960,
    /**
     * Max width for thumbnails generated when sharing an image
     * @type {number}
     */
    thumbnailMaxWidth: 640
  }
};
