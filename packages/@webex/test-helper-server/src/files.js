/*!
 * Copyright (c) 2015-2020 Cisco Systems, Inc. See LICENSE file.
 */


const bodyParser = require(`body-parser`);
const express = require(`express`);
const fs = require(`fs`);
const mkdirp = require(`mkdirp`);
const multer = require(`multer`);
const path = require(`path`);
const reflect = require(`./reflect`);
const uuid = require(`uuid`);

/* eslint new-cap: [0] */
const router = express.Router();

// Configure Image processing
// -------------------------

router.use(bodyParser.raw(`image/*`));

router.patch(`/reflect`, reflect);
router.post(`/reflect`, reflect);
router.put(`/reflect`, reflect);

const uploadPath = process.env.PACKAGE ? `.tmp/${process.env.PACKAGE}/files` : `.tmp/files`;

router.post(`/upload`, (req, res, next) => {
  mkdirp(uploadPath, (err) => {
    if (err) {
      return next(err);
    }

    const id = uuid.v4();
    const storeAt = path.join(uploadPath, id);
    const getFrom = `/files/download/${id}`;

    /* eslint max-nested-callbacks: [0] */
    return fs.writeFile(storeAt, req.body, (err2) => {
      if (err2) {
        return next(err2);
      }

      return res
        .status(201)
        .json({
          loc: getFrom
        })
        .end();
    });
  });
});

router.get(`/download/:id`, (req, res, next) => {
  if (!req.params.id) {
    return next(new Error(`id param is required`));
  }

  return fs.readFile(path.join(uploadPath, req.params.id), (err, data) => {
    if (err) {
      return next(err);
    }

    return res.status(200).send(data).end();
  });
});

const storage = multer.memoryStorage();
const upload = multer({storage});

[`put`, `patch`, `post`].forEach((methodName) => {
  router[methodName](`/metadata`, upload.array(`files`), (req, res) => {
    res
      .status(200)
      .json(req.files)
      .end();
  });
});

router.use(`/get`, express.static(path.join(__dirname, `static`)));

module.exports = router;
