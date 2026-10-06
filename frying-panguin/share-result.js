(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.PanguinResult = api; })(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1, DURATION = 180, MAX_TOKEN = 128;
  function tuple(value) { if (!Array.isArray(value) || value.length !== 4 || value[0] !== VERSION || value[1] !== DURATION || !['death', 'timeout'].includes(value[2]) || typeof value[3] !== 'number' || !Number.isFinite(value[3]) || Object.is(value[3], -0) || value[3] < 0 || value[3] > DURATION || value[2] === 'timeout' && value[3] !== DURATION) throw Error('Invalid result'); return value; }
  function pack(text) { return (typeof Buffer !== 'undefined' ? Buffer.from(text, 'ascii').toString('base64') : btoa(text)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
  function unpack(text) { const b = text.replace(/-/g, '+').replace(/_/g, '/'); return typeof Buffer !== 'undefined' ? Buffer.from(b, 'base64').toString('ascii') : atob(b); }
  function encode(value) { return 'v1.' + pack(JSON.stringify(tuple(value))); }
  function decode(token) { if (typeof token !== 'string' || token.length > MAX_TOKEN || !/^v1\.[A-Za-z0-9_-]+$/.test(token)) throw Error('Invalid result'); const text = unpack(token.slice(3)); if (text.length > 90) throw Error('Invalid result'); const value = tuple(JSON.parse(text)); if (encode(value) !== token) throw Error('Noncanonical result'); return Object.freeze(value); }
  function project(summary) { return Object.freeze(tuple([VERSION, DURATION, summary.reason, summary.timeSurvived])); }
  function displaySeconds(value) { const t = tuple(value); return Math.min(Math.floor(t[3] + .001), t[2] === 'death' ? 179 : 180); }
  function describe(value) { const t = tuple(value), seconds = displaySeconds(t), time = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'), outcome = t[2] === 'timeout' ? 'FULL SURVIVAL' : 'DEFEAT', imageKey = t[2] + '-' + String(seconds).padStart(3, '0') + '.png'; return Object.freeze({ time, seconds, outcome, imageKey, title: 'Frying Panguin · ' + time + ' · ' + outcome, description: t[2] === 'timeout' ? 'Pan of the year! Still waddling.' : 'Pan down! Survival time ' + time + '.', imageAlt: 'Frying Panguin penguin with pan. ' + outcome + ', ' + time + ' survival time.' }); }
  function origin(value) { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password || u.origin !== value) throw Error('Invalid result origin'); return value; }
  function resultURL(value, host, basePath) {
    const root = origin(host), token = encode(value);
    if (arguments.length < 3) return root + '/r/' + token;
    if (basePath !== '/frying-panguin') throw Error('Invalid result base path');
    const bucket = value[2] + '-' + String(displaySeconds(value)).padStart(3, '0');
    return root + basePath + '/r/' + bucket + '/?result=' + token;
  }
  return Object.freeze({ VERSION, DURATION, MAX_TOKEN, encode, decode, project, displaySeconds, describe, origin, resultURL });
});
