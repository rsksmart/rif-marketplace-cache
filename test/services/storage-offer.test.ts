import assert from 'assert';
import app from '../../src/app';

describe('\'StorageOffer\' service', () => {
  it('registered the service', () => {
    const service = app.service('storage-offer');

    assert.ok(service, 'Registered the service');
  });
});
