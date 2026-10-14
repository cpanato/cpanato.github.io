'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

test('all local HTML resources and navigation targets exist', () => {
    for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        if (url.startsWith('#')) {
            assert.ok(html.includes(`id="${url.slice(1)}"`), `Missing target: ${url}`);
        } else if (!/^(https?:|mailto:|data:)/.test(url)) {
            assert.ok(fs.statSync(path.join(dist, url)).size > 0, `Empty resource: ${url}`);
        }
    }
});

test('deployment includes domain ownership files and matching Bootstrap JS', () => {
    for (const file of ['CNAME', 'keybase.txt']) {
        assert.equal(fs.readFileSync(path.join(dist, file), 'utf8'), fs.readFileSync(path.join(root, file), 'utf8'));
    }
    assert.deepEqual(fs.readFileSync(path.join(dist, 'js/bootstrap.bundle.min.js')),
        fs.readFileSync(require.resolve('bootstrap/dist/js/bootstrap.bundle.min.js')));
});

test('page has accessible social links and no template placeholders', () => {
    for (const [, attributes] of html.matchAll(/<a\s+([^>]*class="social-icon"[^>]*)>/g)) {
        assert.match(attributes, /aria-label="[^"]+"/);
        assert.match(attributes, /rel="noopener noreferrer"/);
    }
    assert.match(html, /<main\b/);
    assert.match(html, /name="description" content="[^"]+"/);
    assert.doesNotMatch(html, /TBA\.|Google Analytics Certified Developer|Mobile Web Specialist/);
});
