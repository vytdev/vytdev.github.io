const fs = require('fs');
const path = require('path');
const util = require('./util.js');

/**
 * Create a module system.
 * @param mods An object with path-func pairs.
 * @returns A require function that can be called to load a module.
 */
function createModules(mods) {

  /* Map each module function. */
  const modules = {};
  Object.keys(mods)
    .forEach(k => {
      const id = normPath(k);
      const mod = modules[id] = {
        id: id,
        filename: k,
        loaded: false,
        parent: null,
        children: [],
        exports: {},
      };
      mod.self = mods[k].bind(mod);
      mod.require = reqr.bind(mod);
    });

  /**
   * Require a module.
   * @param x The module path. Can be relative or absolute.
   * @returns The exports of that module.
   */
  function reqr(x) {
    const name = this?.id
      ? absPath(dirName(this.id), x)
      : normPath(x);
    const mod = modules[name];

    /* Module does not exist. */
    if (!mod)
      throw new ReferenceError(`Module not found: ${name}`);

    /* Load the module if it is not yet loaded. */
    if (!mod.loaded) {
      mod.loaded = true;
      mod.parent = this?.id ?? null;
      mod.self(mod.require, mod, mod.exports);
    }

    /* Add this module to childrens. */
    if (this?.children instanceof Array)
      if (!this.children.includes(name))
        this.children.push(name);

    return mod.exports;
  }

  /**
   * Returns the parent directory name of a path.
   * @param path The path.
   * @returns The parent directory path.
   */
  function dirName(path) {
    return normPath(path).split('/').slice(0, -1).join('/');
  }

  /**
   * Normalize a path.
   * @param path The path to normalize.
   * @returns The normalized path.
   */
  function normPath(path) {
    const newPath = [];

    /* Remove duplicates and backslashes. */
    path.split(/[\\\/]+/g)
      .forEach(v => {
        if (v == '.')
          return;
        if (v == '..')
          return newPath.pop();
        v = v.trim();
        if (v.length == 0)
          return;
        newPath.push(v);
      });

    return newPath.join('/');
  }

  /**
   * Get the absolute path of target, relative to base.
   * @param base The base path (must be absolute).
   * @param target The target relative path.
   * @returns The absolute path of target.
   */
  function absPath(base, target) {
    if (/^[\\\/]/.test(target.trimStart()))
      return normPath(target);

    /* Here is our initial new path. */
    const newPath = normPath(base).split('/').filter(v => v.length);

    /* Normalize the target path relative to base. */
    target.split(/[\\\/]+/g)
      .forEach(v => {
        if (v == '.')
          return;
        if (v == '..')
          return newPath.pop();
        v = v.trim();
        if (v.length == 0)
          return;
        newPath.push(v);
      });

    return newPath.join('/');
  }

  /* Return the require function bound to null. */
  return reqr.bind(null);
}


/**
 * Pack the modules in a directory.
 * @param dir The folder to pack.
 * @param entry The entry point.
 * @param out The output file.
 */
function packModules(dir, entry, out) {
  fs.writeFileSync(out, `((${createModules.toString()})({`, 'utf8');

  const append = (data) => fs.appendFileSync(out, data, 'utf8');
  util.listRecursiveSync(dir).forEach(([ fileName, stat ]) => {
    if (!stat.isFile())
      return;
    if (![ 'js', 'json' ].some(v => fileName.endsWith('.' + v)))
      return;

    /* Module prologue. */
    append(`${JSON.stringify(path.relative(dir, fileName))}:` +
      'function(require,module,exports){\n');

    /* Add the file. */
    if (fileName.endsWith('.js'))
      append(fs.readFileSync(fileName, 'utf8'));
    else if (fileName.endsWith('.json'))
      append('module.exports=' + fs.readFileSync(fileName, 'utf8'));

    /* Module epilogue. */
    append('},');
  });

  /* The initial loading part. */
  append(`}))(${JSON.stringify(entry)})`);
}


module.exports = {
  createModules,
  packModules,
};
