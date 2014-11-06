#!/usr/bin/env node

/*
 *
 * Copyright 2014 Canonical Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/
var Q = require('q');
var colors = require('colors');
var shell = require('shelljs');

module.exports.cp = function(source, dest) {
    console.log(('cp -Rf ' + source + ' ' + dest).green);

    if (shell.cp('-r', source, dest) === null) {
        console.error("FAILED".underline.red);
        process.exit(1);
    }
};

module.exports.pushd = function(dir) {
    console.log(('pushd ' + dir).green);
    shell.pushd(dir);
};

module.exports.popd = function(dir) {
    console.log(('popd').green);
    shell.popd();
};

module.exports.execSync = function(cmd, silent) {
    console.log(cmd.green);

    var res = shell.exec(cmd, { silent: silent });
    if (res.code !== 0) {
        console.error(cmd.green + " " + "FAILED".underline.red);
        process.exit(1);
    }

    return res;
};

module.exports.execAsync = function (cmd) {
    var deferred = Q.defer();

    console.log(cmd.green);

    shell.exec(cmd, { async: true }, function (code, output) {
        var res = { code: code, output: output };
        if (res.code !== 0) {
            console.error(cmd.green + " " + "FAILED".underline.red);
            process.exit(1);
        }
        deferred.resolve(res);
    });

    return deferred.promise;
};

