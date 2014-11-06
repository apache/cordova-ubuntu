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
var assert = require('assert');
var colors = require('colors');
var fs = require('fs');
var path = require('path');
var shell = require('shelljs');

var build = require('./build').build;

var Devices = require('./device');
var Constants = require('./constants');
var Utils = require('./utils');

var PLATFORMS = Constants.PLATFORM_TYPES;
var MSG = Constants.MSG;

module.exports.run = function(rootDir, desktop, debug, target, nobuild, emulator, framework) {
    if (desktop && !emulator) {
        return build(rootDir, PLATFORMS.DESKTOP, nobuild, null, null, debug).then(function () {
            return runNative(rootDir, debug);
        });
    }

    if (!framework)
        framework = Constants.DEFAULT_FRAMEWORK;

    if (!target) {
        var devices = Devices.list();

        if (!devices.length) {
            console.error(MSG.UBUNTU_TOUCH_DEVICE_NOT_AVALAIBLE.red)
            process.exit(1);
        }

        if (emulator) {
            devices = devices.filter(function (name) {
                return name.match(/^emulator-/);
            });
            if (!devices.length) {
                console.error(MSG.EMULATOR_IS_NOT_RUNNING.red)
                process.exit(1);
            }
        }

        target = devices[0];

        if (devices.length > 1) {
            console.warn('you can specify target with --target <device id>'.yellow);
            console.warn(('running on ' + target).yellow);
        }
    }
    var arch = Devices.arch(target);

    return build(rootDir, PLATFORMS.PHONE, nobuild, arch, framework, debug).then(function () {
        return runOnDevice(rootDir, debug, target, arch, framework);
    });
};

function runNative(rootDir, debug) {
    console.log('Running Cordova'.green);
    var ubuntuDir = path.join(rootDir, 'platforms', 'ubuntu');
    var nativeDir = path.join(ubuntuDir, 'native');

    Utils.pushd(path.join(nativeDir, 'prefix'));

    var cmd = 'QTWEBKIT_INSPECTOR_SERVER=9222 ./cordova-ubuntu www/';
    if (debug) {
        cmd = "DEBUG=1 " + cmd;
        console.error('Debug enabled. Try pointing a WebKit browser to http://127.0.0.1:9222'.yellow);
    }

    return Utils.execAsync(cmd).then(function () {
        Utils.popd();
    });
}

function runOnDevice(rootDir, debug, target, architecture, framework) {
    var ubuntuDir = path.join(rootDir, 'platforms', 'ubuntu');

    if (!Devices.isAttached(target)) {
        console.error(MSG.UBUNTU_TOUCH_DEVICE_NOT_AVALAIBLE.red);
        process.exit(1);
    }

    var archDir = path.join(ubuntuDir, framework, architecture);
    var prefixDir = path.join(archDir, 'prefix');

    Utils.pushd(prefixDir);

    var manifest = JSON.parse(fs.readFileSync(path.join(ubuntuDir, 'manifest.json'), {encoding: "utf8"}));
    var appId = manifest.name;

    var names = shell.ls().filter(function (name) {
        return name.indexOf(appId) == 0 && name.indexOf('.click');
    });

    assert.ok(names.length == 1);

    Devices.adbExec(target, 'shell "ps -A -eo pid,cmd | grep cordova-ubuntu | awk \'{ print \\$1 }\' | xargs kill -9"');

    if (debug)
        Devices.adbExec(target, 'forward --remove-all');

    Devices.adbExec(target, 'push ' + names[0] + ' /home/phablet');
    Devices.adbExec(target, 'shell "cd /home/phablet/; pkcon install-local ' + names[0] + ' -p --allow-untrusted -y"');

    if (debug) {
        console.error('Debug enabled. Try pointing a WebKit browser to http://127.0.0.1:9222');
        Devices.adbExec(target, 'forward tcp:9222 tcp:9222');
    }

    console.log('have fun!'.rainbow);

    return Devices.adbExecAsync(target, 'shell bash -c "ubuntu-app-launch  \\`ubuntu-app-triplet ' + appId + '\\`"').then(function () {
        Utils.popd();
    });
}
