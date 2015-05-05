/*jslint node:true,indent:2*/
/*globals freedom,crypto,Uint8Array*/
// crypto.getRandomBytes provider backed by the async freedom['core.crypto'].
'use strict';

var buf, offset = 0;
var fcrypto = freedom['core.crypto']();

/**
 * refresh the internal crypto buffer to have {buffer} bytes of randomness.
 * callback is called when buffer is refreshed.
 */
exports.refreshBuffer = function (size, callback) {
  if (typeof crypto !== 'undefined') {
    buf = new Uint8Array(size);
    offset = 0;
    crypto.getRandomValues(buf);
    callback(0);
    return;
  }

  fcrypto.getRandomvalues(size).then(function (b) {
    buf = new Uint8Array(b);
    offset = 0;
    callback(0);
  }, function (err) {
    callback(-1, err);
  });
};

/**
 * fill an array buffer with random bytes, using the same interface as
 * crypto.getRandomValues
 */
exports.getRandomValues = function (buffer) {
  if (buffer.buffer) {
    buffer = buffer.buffer;
  }
  var size = buffer.byteLength,
    view = new Uint8Array(buffer),
    i;

  if (offset + size > buf.length) {
    throw new Error("Insufficient Randomness Allocated.");
  }

  for (i = 0; i < size; i += 1) {
    view[i] = buf[offset + i];
  }
  offset += size;
};
