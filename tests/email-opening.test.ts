import assert from 'node:assert/strict';
import test from 'node:test';
import {openEmailWithFallback} from '../src/data/email-opening';
const url='https://mail.google.com/mail/u/0/#search/'+encodeURIComponent('in:anywhere rfc822msgid:message@example.com');
test('native Gmail opening does not open a browser',async()=>{
  assert.equal(await openEmailWithFallback(url,async()=>{},async()=>{throw Error('Unexpected fallback');},async()=>{throw Error('Unexpected browser');}),'app');
});
test('browser fallback requires explicit acceptance and preserves the exact URL',async()=>{
  let opened='';
  const unavailable=async()=>{throw Error('No Gmail handler');};
  assert.equal(await openEmailWithFallback(url,unavailable,async()=>false,async value=>{opened=value;}),'cancelled');
  assert.equal(opened,'');
  assert.equal(await openEmailWithFallback(url,unavailable,async()=>true,async value=>{opened=value;}),'browser');
  assert.equal(opened,url);
  await assert.rejects(openEmailWithFallback('https://evil.test',async()=>{},async()=>true,async()=>{}),/Invalid/);
});
