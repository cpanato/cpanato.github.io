'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

async function clean() {
    await fs.rm(dist, { recursive: true, force: true });
    await fs.mkdir(dist, { recursive: true });
}

async function assets() {
    await fs.cp(path.join(root, 'src/assets'), path.join(dist, 'assets'), { recursive: true });
    for (const file of ['CNAME', 'keybase.txt']) {
        await fs.copyFile(path.join(root, file), path.join(dist, file));
    }
}

async function pug() {
    const pug = require('pug');
    const prettier = require('prettier');
    const source = path.join(root, 'src/pug');
    for (const file of await fs.readdir(source, { recursive: true })) {
        if (!file.endsWith('.pug') || /(^|[/\\])(includes?|mixins?|layouts)([/\\]|$)/.test(file)) continue;
        const html = pug.renderFile(path.join(source, file), {
            basedir: path.join(root, 'src'),
            credentials: require('../src/data/credentials.json'),
        });
        const destination = path.join(dist, file.replace(/\.pug$/, '.html'));
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, await prettier.format(html, {
            parser: 'html', printWidth: 1000, tabWidth: 4, htmlWhitespaceSensitivity: 'ignore',
        }));
    }
}

async function scripts() {
    await fs.cp(path.join(root, 'src/js'), path.join(dist, 'js'), { recursive: true });
    await fs.copyFile(require.resolve('bootstrap/dist/js/bootstrap.bundle.min.js'), path.join(dist, 'js/bootstrap.bundle.min.js'));
    await fs.copyFile(require.resolve('bootstrap/dist/js/bootstrap.bundle.min.js.map'), path.join(dist, 'js/bootstrap.bundle.min.js.map'));
}

async function scss() {
    const sass = require('sass');
    const postcss = require('postcss');
    const autoprefixer = require('autoprefixer');
    const result = sass.compile(path.join(root, 'src/scss/styles.scss'), {
        loadPaths: [path.join(root, 'node_modules')], style: 'compressed', quietDeps: true,
        // Bootstrap 5 and the theme still use Sass imports and global functions.
        silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
    });
    const output = await postcss([autoprefixer]).process(result.css, { from: undefined, map: false });
    for (const warning of output.warnings()) console.warn(warning.toString());
    await fs.mkdir(path.join(dist, 'css'), { recursive: true });
    await fs.writeFile(path.join(dist, 'css/styles.css'), output.css);
}

async function main() {
    const tasks = { clean, assets, pug, scripts, scss };
    const task = process.argv[2];
    if (task) {
        if (!tasks[task]) throw new Error(`Unknown build task: ${task}`);
        return tasks[task]();
    }
    await clean();
    await Promise.all([assets(), pug(), scripts(), scss()]);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
