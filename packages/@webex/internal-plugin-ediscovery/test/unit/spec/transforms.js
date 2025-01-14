import EDiscovery from '@webex/internal-plugin-ediscovery';
import Transforms from '@webex/internal-plugin-ediscovery/src/transforms';
import ReportRequest from '@webex/internal-plugin-ediscovery/src/report-request';
import MockWebex from '@webex/test-helper-mock-webex';
import sinon from 'sinon';
import {assert} from '@webex/test-helper-chai';
import config from '@webex/internal-plugin-ediscovery/src/config';

/* eslint-disable max-len */
describe('EDiscovery Transform Tests', () => {
  const encryptedText = 'this text has been encrypted';
  const decryptedText = 'this text has been decrypted';
  const decryptedScr = 'this scr has been decrypted';
  const uuid = 'e20d6180-2b95-11e9-8f7a-59e7a3b4e375';
  const keyUri = 'kms://ciscospark.com/keys/32471db7-3d71-4fd1-b36c-0a1fe9efae2d';

  const ctx = {transform: sinon.stub().returns(Promise.resolve())};
  let object;

  beforeEach(() => {
    ctx.webex = new MockWebex({children: {ediscovery: EDiscovery}});
    ctx.webex.config.ediscovery = config.ediscovery;
    ctx.webex.internal = {
      device: {
        deviceType: 'FAKE_DEVICE'
      },
      encryption: {
        encryptText: sinon.stub().returns(Promise.resolve(encryptedText)),
        decryptText: sinon.stub().returns(Promise.resolve(decryptedText)),
        decryptScr: sinon.stub().returns(Promise.resolve(decryptedScr)),
        kms: {
          createUnboundKeys: sinon.stub().returns(Promise.resolve([{userIds: uuid, uri: keyUri}])),
          createResource: sinon.stub().returns(Promise.resolve())
        }
      }
    };
  });

  afterEach(() => {
    ctx.transform.resetHistory();
    ctx.webex.internal.encryption.encryptText.resetHistory();
    ctx.webex.internal.encryption.decryptText.resetHistory();
    ctx.webex.internal.encryption.decryptScr.resetHistory();
    ctx.webex.internal.encryption.kms.createUnboundKeys.resetHistory();
    ctx.webex.internal.encryption.kms.createResource.resetHistory();
  });

  describe('Report Request Transforms', () => {
    let reportRequest;

    beforeEach(() => {
      reportRequest = new ReportRequest();
      reportRequest.name = 'test report';
      reportRequest.description = '';
      reportRequest.spaceNames = ['test space 1'];
      reportRequest.emails = ['email1@test.com', 'email2@test.com'];
      reportRequest.keywords = [];
    });

    describe('Encrypt ReportRequest Tests', () => {
      it('Calls the correct encrypt functions when transforming a report request', () => {
        // body IS a ReportRequest
        object = {body: reportRequest};
        const result = Transforms.encryptReportRequest(ctx, object)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.encryptText, 4);
            assert.equal(reportRequest.name, encryptedText);
            assert.equal(reportRequest.description, '');
            assert.equal(reportRequest.spaceNames[0], encryptedText);
            assert.equal(reportRequest.emails[0], encryptedText);
            assert.equal(reportRequest.emails[1], encryptedText);
            // unencryptedEmails should be copied from emails before decryption
            assert.equal(reportRequest.unencryptedEmails[0], 'email1@test.com');
            assert.equal(reportRequest.unencryptedEmails[1], 'email2@test.com');
            assert.empty(reportRequest.keywords);
            // this should be populated by request to kms
            assert.notEqual(reportRequest.encryptionKeyUrl, '');
          });

        return result;
      });
    });

    describe('Decrypt ReportRequest Tests', () => {
      it('Calls the correct decrypt functions when transforming a report request', () => {
        // body CONTAINS a ReportRequest
        object = {body: {reportRequest}};
        // object to be decrypted must have an encryption key
        reportRequest.encryptionKeyUrl = keyUri;
        const result = Transforms.decryptReportRequest(ctx, object)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 4);
            assert.equal(reportRequest.name, decryptedText);
            assert.equal(reportRequest.description, '');
            assert.equal(reportRequest.spaceNames[0], decryptedText);
            assert.equal(reportRequest.emails[0], decryptedText);
            assert.equal(reportRequest.emails[1], decryptedText);
            assert.empty(reportRequest.keywords);
          });

        return result;
      });

      it('Does not attempt to decrypt a report request if there is no encryption key url', () => {
        // body CONTAINS a ReportRequest
        object = {body: {reportRequest}};
        const result = Transforms.decryptReportRequest(ctx, object)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 0);
          });

        return result;
      });
    });
  });

  describe('Report Content Transform', () => {
    describe('Decrypt Content Tests', () => {
      let activity;
      let contentContainer;
      const reportId = uuid;

      beforeEach(() => {
        activity = {};
        activity.activityId = uuid;
        activity.verb = 'post';
        activity.actorId = uuid;
        activity.actorDisplayName = 'user1';
        activity.targetId = uuid;
        activity.objectDisplayName = 'encrypted content';
        activity.encryptionKeyUrl = keyUri;

        object = {body: activity};

        contentContainer = {};
        contentContainer.containerId = '0';
        contentContainer.containerName = 'spaceName';
        contentContainer.isOneOnOne = false;
        contentContainer.participants = [{id: uuid, displayName: 'user1'}, {id: uuid, displayName: 'user2'}, {id: uuid, displayName: 'user3'}];
        contentContainer.onBehalfOfUser = uuid;
        contentContainer.encryptionKeyUrl = keyUri;

        ctx.webex.internal.ediscovery = {getContentContainerByContainerId: sinon.stub().returns(Promise.resolve({body: contentContainer}))};
      });

      afterEach(() => ctx.webex.internal.ediscovery.getContentContainerByContainerId.resetHistory());

      it('Calls the decrypt functions when extension type is customApp', () => {
        object.body.extension = {
          objectType: 'extension', extensionType: 'customApp', contentUrl: 'encrypted content', displayName: 'encrypted content', webUrl: 'encrypted content', appId: uuid
        };
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.equal(object.body.extension.contentUrl, decryptedText);
            assert.equal(object.body.extension.webUrl, decryptedText);
            assert.equal(object.body.extension.appId, uuid);
            assert.equal(object.body.extension.displayName, decryptedText);
            assert.equal(activity.error, undefined);
          });

        return result;
      });

      it('Calls the decrypt functions when extension type is customApp along with the verb is update', () => {
        object.body.verb = 'update';
        object.body.extension = {
          objectType: 'extension', extensionType: 'customApp', contentUrl: 'encrypted content', displayName: 'encrypted content', previous: {contentUrl: 'encrypted content', displayName: 'encrypted content'}
        };
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.equal(object.body.extension.contentUrl, decryptedText);
            assert.equal(object.body.extension.displayName, decryptedText);
            assert.equal(object.body.extension.previous.contentUrl, decryptedText);
            assert.equal(object.body.extension.previous.displayName, decryptedText);
            assert.equal(activity.error, undefined);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming post activities', () => {
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.equal(activity.objectDisplayName, decryptedText);
            assert.equal(activity.spaceName, contentContainer.containerName);
          });

        return result;
      });

      it('Creates spaceName from participantDisplayNames for one to one spaces', () => {
        contentContainer.isOneOnOne = true;
        // one to one conversations have only 2 participants
        contentContainer.participants = [{id: uuid, displayName: 'user1'}, {id: uuid, displayName: 'user2'}];
        // spacename should be undefined for one on one conversations
        contentContainer.containerName = undefined;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.equal(activity.objectDisplayName, decryptedText);
            assert.equal(activity.spaceName, 'user1 & user2');
          });

        return result;
      });

      it('Does not call any decrypt functions when transforming add activities', () => {
        object.body.verb = 'add';
        // object display name for add activity is a uuid
        object.body.objectDisplayName = uuid;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 0);
            assert.equal(activity.objectDisplayName, uuid);
            assert.equal(activity.spaceName, contentContainer.containerName);
          });

        return result;
      });

      it('Does not call any decrypt functions when transforming leave activities', () => {
        object.body.verb = 'leave';
        // object display name for leave activity is a uuid
        object.body.objectDisplayName = uuid;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 0);
            assert.equal(activity.objectDisplayName, uuid);
            assert.equal(activity.spaceName, contentContainer.containerName);
          });

        return result;
      });

      it('Does not call any decrypt functions if encryption key url is empty', () => {
        object.body.encryptionKeyUrl = '';
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 0);
            assert.equal(activity.objectDisplayName, 'encrypted content');
            assert.equal(activity.spaceName, contentContainer.containerName);
          });

        return result;
      });

      it('Does not call any decrypt functions if encryption key url is undefined', () => {
        object.body.encryptionKeyUrl = undefined;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 0);
            assert.equal(activity.objectDisplayName, 'encrypted content');
            assert.equal(activity.spaceName, contentContainer.containerName);
          });

        return result;
      });

      it('Does not call any decrypt functions if onBehalfOfUser is empty', () => {
        contentContainer.onBehalfOfUser = '';
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 0);
            assert.equal(activity.objectDisplayName, 'encrypted content');
            assert.equal(activity.spaceName, contentContainer.containerName);
          });

        return result;
      });

      it('Does not call any decrypt functions if onBehalfOfUser is undefined', () => {
        contentContainer.onBehalfOfUser = undefined;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 0);
            assert.equal(activity.objectDisplayName, 'encrypted content');
            assert.equal(activity.spaceName, contentContainer.containerName);
          });

        return result;
      });

      it('Decrypt function throws an exception', () => {
        ctx.webex.internal.encryption.decryptText = sinon.stub().returns(Promise.reject(new Error('@@@@@@')));

        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.fail('Decrypt did not fail as expected');
          })
          .catch(() => {
            assert.isDefined(activity.error);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming file share activities', () => {
        object.body.verb = 'share';
        // there should be no other content for a share
        object.body.objectDisplayName = undefined;
        object.body.files = [{displayName: 'file name', scr: 'eyJhbGciOi...'}];
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 1);
            assert.callCount(ctx.webex.internal.encryption.decryptScr, 1);
            assert.equal(activity.objectDisplayName, undefined);
            assert.equal(activity.files[0].displayName, decryptedText);
            assert.equal(activity.files[0].scr, decryptedScr);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming file share activities with Microsoft shared link info', () => {
        object.body.verb = 'share';
        // there should be no other content for a share
        object.body.objectDisplayName = undefined;
        object.body.files = [{displayName: 'file name', scr: 'eyJhbGciOi...', microsoftSharedLinkInfo: {driveId: '1', itemId: '2'}}];
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 3);
            assert.callCount(ctx.webex.internal.encryption.decryptScr, 1);
            assert.equal(activity.objectDisplayName, undefined);
            assert.equal(activity.files[0].displayName, decryptedText);
            assert.equal(activity.files[0].scr, decryptedScr);
            assert.equal(activity.files[0].microsoftSharedLinkInfo.driveId, decryptedText);
            assert.equal(activity.files[0].microsoftSharedLinkInfo.itemId, decryptedText);
          });

        return result;
      });

      it('Adds warning to activity if warning found while retrieving space', () => {
        contentContainer.warning = 'warn';
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.equal(activity.warn, contentContainer.warn);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming activity.meeting.title', () => {
        object.body.verb = 'add';
        object.body.objectDisplayName = undefined;
        object.body.meeting = {title: 'Encrypted Title'};
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 1);
            assert.equal(activity.error, undefined);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming activity.recording.topic', () => {
        object.body.verb = 'add';
        object.body.objectDisplayName = undefined;
        object.body.recording = {topic: 'Encrypted Topic'};
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 1);
            assert.equal(activity.error, undefined);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming activity.spaceInfo.name', () => {
        object.body.verb = 'update';
        object.body.spaceInfo = {name: 'Encrypted Name'};
        object.body.objectDisplayName = undefined;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 1);
            assert.equal(activity.error, undefined);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming activity.spaceInfo.name with previousValue', () => {
        object.body.verb = 'update';
        object.body.spaceInfo = {name: 'Encrypted Name', previousName: 'Previous Name', previousEncryptionKeyUrl: keyUri};
        object.body.objectDisplayName = undefined;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 2);
            assert.equal(activity.error, undefined);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming activity.spaceInfo.description', () => {
        object.body.verb = 'update';
        object.body.spaceInfo = {description: 'Encrypted Description'};
        object.body.objectDisplayName = undefined;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 1);
            assert.equal(activity.error, undefined);
          });

        return result;
      });

      it('Calls the correct decrypt functions when transforming both activity.spaceInfo.name and activity.spaceInfo.description', () => {
        object.body.verb = 'update';
        object.body.spaceInfo = {name: 'Encrypted Name', description: 'Encrypted description'};
        object.body.objectDisplayName = undefined;
        const result = Transforms.decryptReportContent(ctx, object, reportId)
          .then(() => {
            assert.callCount(ctx.webex.internal.encryption.decryptText, 2);
            assert.equal(activity.error, undefined);
          });

        return result;
      });
    });
  });
});
