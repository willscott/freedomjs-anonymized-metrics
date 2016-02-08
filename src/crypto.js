/*jslint node:true,indent:2*/
/*globals freedom,crypto,Uint8Array*/
// crypto.getRandomBytes provider backed by the async freedom['core.crypto'].
'use strict';

var buf, offset = 0;
var fcrypto = freedom['core.crypto']();
// https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues
var kMaxSingleBuffer = 65536;

function getRandomByteChunks(callback, buffers, size, index) {
  // last chunk.
  if ((index+1) * kMaxSingleBuffer > size) {
    fcrypto.getRandomBytes(size - (index * kMaxSingleBuffer)).then(function (b) {
      buffers.push(new Uint8Array(b));
      buf = new Uint8Array(size);
      for (var i = 0; i < buffers.length; i++) {
        buf.set(buffers[i], i * kMaxSingleBuffer);
      }
      callback(0);
    }, function(err) {
      callback(-1, err);
    });
  } else {
   // every chunk before the last chunk.
    fcrypto.getRandomBytes(kMaxSingleBuffer).then(function(b) {
      buffers.push(new Uint8Array(b));
      getRandomByteChunks(callback, buffers, size, index+1);
    }, function(err) {
      callback(-1, err);
    });
  }
}

/**
 * refresh the internal crypto buffer to have {buffer} bytes of randomness.
 * callback is called when buffer is refreshed.
 */
exports.refreshBuffer = function (size, callback) {
  // Split up the request into kMaxSingleBuffer-size chunks.
  var num_blocks = Math.floor(size / kMaxSingleBuffer);

  // Fill each chunk individually, into subarrays of buf.
  if (typeof crypto !== 'undefined') {
    buf = new Uint8Array(size);
    offset = 0;
    for (var i = 0; i < num_blocks+1; i++) {
      crypto.getRandomValues(buf.subarray(kMaxSingleBuffer * i,
                                          Math.min(kMaxSingleBuffer * (i+1), size)));
    }
    callback(0);
    return;
  }

  // core.crypto just uses crypto.getRandomValues itself, so will have
  // the same problem with >kMaxSingleBuffer requests.  But it
  // accesses the underlying buffer in the implementation, so we can't
  // just keep passing it views each time.
  var buffers = [];
  getRandomByteChunks(callback, buffers, size, 0);
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

  // It'd be preferable to just have a promise here, and call
  // refreshBuffer() again.
  if (offset + size > buf.length) {
    throw new Error("Insufficient Randomness Allocated.");
  }

  for (i = 0; i < size; i += 1) {
    view[i] = buf[offset + i];
  }
  offset += size;
};
