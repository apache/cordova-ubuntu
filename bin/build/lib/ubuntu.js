#!/usr/bin/env node

/*
 *
 * Copyright 2013 Canonical Ltd.
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

var shell = require('shelljs');
var path = require('path');
var fs = require('fs');
var msg = require('./msg');
var assert = require('assert');
var colors = require('colors');
var Q = require("q");
var os = require("os");

function exec(cmd) {
    console.log(cmd.green);

    var res = shell.exec(cmd);
    if (res.code !== 0) {
        console.error(cmd.green + " " + "FAILED".underline.red);
        process.exit(1);
    }

    return res;
}

function execAsync(cmd) {
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
}


function cp(source, dest) {
    console.log(('cp -Rf ' + source + ' ' + dest).green);

    if (shell.cp('-r', source, dest) === null) {
        console.error("FAILED".underline.red);
        process.exit(1);
    }
}

function pushd(dir) {
    console.log(('pushd ' + dir).green);
    shell.pushd(dir);
}

function popd(dir) {
    console.log(('popd').green);
    shell.popd();
}

function cpuCount() {
    return os.cpus().length;
}

function buildArmPackage(campoDir, ubuntuDir, nobuild) {
    var armhfDir = path.join(ubuntuDir, 'armhf');
    var prefixDir = path.join(armhfDir, 'prefix');
    var framework = "ubuntu-sdk-13.10";

    if (nobuild && fs.existsSync(path.join(prefixDir, 'cordova-ubuntu'))) {
        return Q();
    }

    shell.rm('-rf', path.join(armhfDir, 'build'));

    shell.rm('-rf', prefixDir);
    shell.mkdir(path.join(armhfDir, 'build'));
    shell.mkdir(prefixDir);

    pushd(path.join(armhfDir, 'build'));

    return execAsync('click chroot -aarmhf -f ' + framework + ' run cmake ' + campoDir
              + ' -DCMAKE_TOOLCHAIN_FILE=/etc/dpkg-cross/cmake/CMakeCross.txt -DCMAKE_INSTALL_PREFIX="'
              + prefixDir + '"').then(function () {
        exec('find . -name AutomocInfo.cmake | xargs sed -i \'s;AM_QT_MOC_EXECUTABLE .*;AM_QT_MOC_EXECUTABLE "/usr/lib/\'$(dpkg-architecture -qDEB_BUILD_MULTIARCH)\'/qt5/bin/moc");\'');
        return execAsync('click chroot -aarmhf -f ' + framework + ' run make -j ' + cpuCount());
    }).then(function () {
        return execAsync('click chroot -aarmhf -f ' + framework + ' run make install');
    }).then(function () {
        cp(path.join(ubuntuDir, 'www', '*'), path.join(prefixDir, 'www'));
        cp(path.join(ubuntuDir, 'qml', '*'), path.join(prefixDir, 'qml'));
        cp(path.join(ubuntuDir, 'apparmor.json'), prefixDir);
        cp(path.join(ubuntuDir, 'cordova.desktop'), prefixDir);
        cp(path.join(ubuntuDir, 'config.xml'), prefixDir);

        var content = JSON.parse(fs.readFileSync(path.join(ubuntuDir, 'manifest.json'), {encoding: "utf8"}));
        content.architecture = "armhf";
        fs.writeFileSync(path.join(prefixDir, 'manifest.json'), JSON.stringify(content));

        pushd(prefixDir);

        return execAsync('click build .');
    }).then(function () {
        popd();

        popd();
    });
}

function buildNative(campoDir, ubuntuDir, nobuild) {
    var nativeDir = path.join(ubuntuDir, 'native');
    var prefixDir = path.join(nativeDir, 'prefix');

    if (nobuild && fs.existsSync(path.join(prefixDir, 'cordova-ubuntu'))) {
        return Q();
    }

    shell.rm('-rf', path.join(nativeDir, 'build'));
    shell.rm('-rf', prefixDir);

    shell.mkdir(path.join(nativeDir, 'build'));
    shell.mkdir(prefixDir);

    pushd(path.join(nativeDir, 'build'));

    var debDir;
    return execAsync('cmake ' + campoDir + ' -DCMAKE_INSTALL_PREFIX="' + prefixDir + '"').then(function () {
        return execAsync('make -j ' + cpuCount() + '; make install');
    }).then(function () {
        cp(path.join(ubuntuDir, 'config.xml'), prefixDir);
        cp(path.join(ubuntuDir, 'www', '*'), path.join(prefixDir, 'www'));
        cp(path.join(ubuntuDir, 'qml', '*'), path.join(prefixDir, 'qml'));

        popd();

        var manifest = JSON.parse(fs.readFileSync(path.join(ubuntuDir, 'manifest.json'), {encoding: "utf8"}));

        assert(manifest.name.length);
        assert(manifest.name.indexOf(' ') == -1);

        debDir = path.join(nativeDir, manifest.name);

        shell.rm('-rf', debDir);
        shell.mkdir('-p', path.join(debDir, 'opt', manifest.name));
        cp(path.join(prefixDir, '*'), path.join(debDir, 'opt', manifest.name));

        var destDir = path.join('/opt', manifest.name);
        shell.mkdir('-p', path.join(debDir, 'usr', 'share', 'applications'));
        shell.mkdir('-p', path.join(debDir, 'DEBIAN'));
        fs.writeFileSync(path.join(debDir, 'DEBIAN', 'control'), 'Package: ' + manifest.name + '\nVersion: ' + manifest.version + '\nMaintainer: ' + manifest.maintainer + '\nArchitecture: ' + manifest.architecture + '\nDescription: ' + manifest.description + '\n')
        fs.writeFileSync(path.join(debDir, 'usr', 'share', 'applications', manifest.name + '.desktop'), '[Desktop Entry]\nName=' + manifest.title + '\nExec=' + path.join(destDir, 'cordova-ubuntu') + ' ' + path.join(destDir, 'www') + '\nIcon=qmlscene\nTerminal=false\nType=Application\nX-Ubuntu-Touch=true\n');

        pushd(nativeDir);

        return execAsync('dpkg-deb -b "' + manifest.name + '" .');
    }).then(function () {
        shell.rm('-rf', debDir);

        popd();
    });
}

module.exports.ALL = 2;
module.exports.PHONE = 0;
module.exports.DESKTOP = 1;

module.exports.build = function(rootDir, target, nobuild) {
    var ubuntuDir = path.join(rootDir, 'platforms', 'ubuntu');
    var campoDir = path.join(ubuntuDir, 'build');

    assert.ok(fs.existsSync(ubuntuDir));
    assert.ok(fs.existsSync(campoDir));

    if (target === module.exports.PHONE)
        return buildArmPackage(campoDir, ubuntuDir, nobuild);
    if (target === module.exports.DESKTOP)
        return buildNative(campoDir, ubuntuDir, nobuild);
    if (target === module.exports.ALL) {
        return buildArmPackage(campoDir, ubuntuDir, nobuild).then(function () {
            return buildNative(campoDir, ubuntuDir, nobuild);
        });
    }
}

function runNative(rootDir, debug) {
    var ubuntuDir = path.join(rootDir, 'platforms', 'ubuntu');
    var nativeDir = path.join(ubuntuDir, 'native');

    pushd(path.join(nativeDir, 'prefix'));

    if (debug)
        console.error('Debug enabled. Try pointing a WebKit browser to http://127.0.0.1:9222');

    return execAsync('QTWEBKIT_INSPECTOR_SERVER=9222 ./cordova-ubuntu www/').then(function () {
        popd();
    });
}

function deviceList() {
    var res = exec('adb devices');

    var response = res.output.split('\n');
    var deviceList = [];

    for (var i = 1; i < response.length; i++) {
        if (response[i].match(/\w+\tdevice/)) {
            deviceList.push(response[i].replace(/\tdevice/, '').replace('\r', ''));
        }
    }

    return deviceList;
}

function adbExec(target, command) {
    assert.ok(target && command);
    return exec('adb -s ' + target + ' ' + command);
}

function adbExecAsync(target, command) {
    assert.ok(target && command);
    return execAsync('adb -s ' + target + ' ' + command);
}

function isDeviceAttached(target) {
    var res = adbExec(target, 'get-state');

    if (res.output.indexOf('device') == -1)
        return false;

    res = adbExec(target, 'shell uname -a');
    if (res.output.indexOf('ubuntu-phablet') == -1)
        return false;

    return true;
}

function runOnDevice(rootDir, debug, target) {
    var ubuntuDir = path.join(rootDir, 'platforms', 'ubuntu');

    if (!isDeviceAttached(target)) {
        console.error(msg.UBUNTU_TOUCH_DEVICE_NOT_AVALIABLE.red)
        process.exit(1);
    }

    var armhfDir = path.join(ubuntuDir, 'armhf');
    var prefixDir = path.join(armhfDir, 'prefix');

    pushd(prefixDir);

    var manifest = JSON.parse(fs.readFileSync(path.join(ubuntuDir, 'manifest.json'), {encoding: "utf8"}));
    var appId = manifest.name;

    var names = shell.ls().filter(function (name) {
        return name.indexOf(appId) == 0 && name.indexOf('.click');
    });

    assert.ok(names.length == 1);

    adbExec(target, 'shell "ps -A -eo pid,cmd | grep cordova-ubuntu | awk \'{ print \\$1 }\' | xargs kill -9"')

    if (debug)
        adbExec(target, 'forward --remove-all');

    adbExec(target, 'push ' + names[0] + ' /home/phablet');
    adbExec(target, 'shell "cd /home/phablet/; click install ' + names[0] + ' --user=phablet"');

    if (debug) {
        console.error('Debug enabled. Try pointing a WebKit browser to http://127.0.0.1:9222');

        adbExec(target, 'forward tcp:9222 tcp:9222');
    }

    console.log('have fun!'.rainbow);

    return adbExecAsync(target, 'shell "su - phablet -c \'cd /opt/click.ubuntu.com/' + appId + '/current; QTWEBKIT_INSPECTOR_SERVER=9222 ./cordova-ubuntu www/ --desktop_file_hint=/opt/click.ubuntu.com/' + appId + '/current/cordova.desktop\'"').then(function () {
        popd();
    });
}

module.exports.run = function(rootDir, desktop, debug, target, nobuild) {
    if (desktop) {
        return module.exports.build(rootDir, module.exports.DESKTOP, nobuild).then(function () {
            return runNative(rootDir, debug);
        });
    } else {
        if (!target) {
            var devices = deviceList();

            if (!devices.length) {
                console.error(msg.UBUNTU_TOUCH_DEVICE_NOT_AVALIABLE.red)
                process.exit(1);
            }

            target = devices[0];

            if (devices.length > 1) {
                console.warn('you can specify target with --target <device id>'.yellow);
                console.warn(('running on ' + target).yellow);
            }
        }

        return module.exports.build(rootDir, module.exports.PHONE, nobuild).then(function () {
             return runOnDevice(rootDir, debug, target);
        });
    }
}

module.exports.check_reqs = function(rootDir) {
    var checkReqs = path.join(rootDir, 'platforms', 'ubuntu', 'cordova', 'check_reqs');
    return execAsync(checkReqs);
}
