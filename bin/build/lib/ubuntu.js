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

var DEFAULT_FRAMEWORK = "ubuntu-sdk-14.04";

function exec(cmd, silent) {
    console.log(cmd.green);

    var res = shell.exec(cmd, { silent: silent });
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

function additionalDependencies(ubuntuDir) {
    var files = [];
    try {
        files = fs.readdirSync(path.join(ubuntuDir, 'configs')).filter(function(s) {
            return s[0] != '.';
        });
    } catch (e) {}
    var deb = [];
    for (var i = 0; i < files.length; i++) {
        var config = JSON.parse(fs.readFileSync(path.join(ubuntuDir, 'configs', files[i])));
        if (config.deb)
            deb = deb.concat(config.deb);
    }
    return deb;
}

function checkChrootEnv(ubuntuDir, architecture, framework) {
    var deps = "cmake libicu-dev:ARCH pkg-config qtbase5-dev:ARCH qtchooser qtdeclarative5-dev:ARCH qtfeedback5-dev:ARCH qtlocation5-dev:ARCH qtmultimedia5-dev:ARCH qtpim5-dev:ARCH qtsensors5-dev:ARCH qtsystems5-dev:ARCH ";
    deps += additionalDependencies(ubuntuDir).join(' ');
    deps = deps.replace(/ARCH/g, architecture);

    var cmd = "click chroot -a" + architecture + " -f " + framework + " run dpkg-query -Wf'${db:Status-abbrev}' " + deps;
    console.log(cmd.green);
    res = shell.exec(cmd);

    if (res.code !== 0 || res.output.indexOf('un') !== -1) {
        console.error(("Error: missing " + architecture + " chroot").red);
        console.error(("run:\nsudo click chroot -a" + architecture + " -f " + framework + " create").red);
        console.error(("sudo click chroot -a" + architecture + " -f " + framework + " install " + deps).red);
        process.exit(2);
    }
}

function checkEnv(ubuntuDir) {
    var deps = additionalDependencies(ubuntuDir).join(' ');
    deps = deps.replace(/:ARCH/g, '');

    if (!deps.length)
        return;

    var cmd = "dpkg-query -Wf'${db:Status-abbrev}' " + deps;
    console.log(cmd.green);
    res = shell.exec(cmd);

    if (res.code !== 0 || res.output.indexOf('un') !== -1) {
        console.error(("Error: missing packages" + deps).red);
        process.exit(2);
    }
}

function checkClickPackage(prefixDir) {
    pushd(prefixDir);

    // 13.10 missing click-reviewers-tools package
    // FIXME: remove this check after EOL
    if (fs.existsSync('/usr/bin/click-run-checks')) {
        var cmd = '/usr/bin/click-run-checks *.click';
        console.log(cmd.green);
        var output = shell.exec(cmd, { silent: true }).output;
        var json = '[', b = 0;
        for (var i = 0; i < output.length; i++) {
            if (output[i] == '{') {
                if (json.length > 1 && !b)
                    json += ', ';
                b++;
            } else if (output[i] == '}') {
                b--;
                if (b == 0)
                    json += '} ';
            }
            if (b > 0) {
                json += output[i];
            }
        }
        json += ']';
        var out = JSON.parse(json);
        for (var i = 0; i < out.length; i++) {
            if (out[i].warn) {
                for (var m in out[i].warn) {
                    if (out[i].warn[m].text) {
                        console.warn(out[i].warn[m].text.yellow);
                        if (out[i].warn[m].link)
                            console.warn(out[i].warn[m].link);
                    }
                }
            }
        }
        for (var i = 0; i < out.length; i++) {
            if (out[i].error) {
                for (var m in out[i].error) {
                    if (out[i].error[m].text) {
                        console.warn(out[i].error[m].text.yellow);
                        if (out[i].error[m].link)
                            console.warn(out[i].error[m].link);
                    }
                }
            }
        }
    }

    popd();
}

function additionalBuildDependencies(ubuntuDir) {
    var files = [];
    try {
        files = fs.readdirSync(path.join(ubuntuDir, 'configs')).filter(function(s) {
            return s[0] != '.';
        });
    } catch (e) {}

    var pkgConfig = [];
    for (var i = 0; i < files.length; i++) {
        var config = JSON.parse(fs.readFileSync(path.join(ubuntuDir, 'configs', files[i])));
        if (config.pkgConfig)
            pkgConfig = pkgConfig.concat(config.pkgConfig);
    }

    return pkgConfig;
}

function buildClickPackage(campoDir, ubuntuDir, nobuild, architecture, framework, debug) {
    assert.ok(architecture && architecture.match(/^[a-z0-9_]+$/));

    var archDir = path.join(ubuntuDir, framework, architecture);
    var prefixDir = path.join(archDir, 'prefix');

    if (!fs.existsSync(archDir))
        shell.mkdir('-p', archDir);

    if (nobuild && fs.existsSync(path.join(prefixDir, 'cordova-ubuntu'))) {
        return Q();
    }

    checkChrootEnv(ubuntuDir, architecture, framework);

    shell.rm('-rf', path.join(archDir, 'build'));

    shell.rm('-rf', prefixDir);
    shell.mkdir(path.join(archDir, 'build'));
    shell.mkdir(prefixDir);

    pushd(path.join(archDir, 'build'));

    var buildType = '"Debug"';
    if (!debug)
        buildType = '"Release"';

    var cmakeCmd = 'click chroot -a' + architecture + ' -f ' + framework + ' run cmake ' + campoDir
              + ' -DCMAKE_INSTALL_PREFIX="' + prefixDir + '"' + ' -DCMAKE_BUILD_TYPE=' + buildType;

    if (framework == 'ubuntu-sdk-13.10')
        cmakeCmd += ' -DCMAKE_TOOLCHAIN_FILE=/etc/dpkg-cross/cmake/CMakeCross.txt';

    var deps = additionalBuildDependencies(ubuntuDir).join(' ').replace(/ARCH/g, architecture);
    if (deps.length)
        cmakeCmd += ' -DADDITIONAL_DEPENDECIES="' + deps + '"';

    return execAsync(cmakeCmd).then(function () {
        if (architecture != "i386")
            exec('find . -name AutomocInfo.cmake | xargs sed -i \'s;AM_QT_MOC_EXECUTABLE .*;AM_QT_MOC_EXECUTABLE "/usr/lib/\'$(dpkg-architecture -qDEB_BUILD_MULTIARCH)\'/qt5/bin/moc");\'');
        return execAsync('click chroot -a' + architecture + ' -f ' + framework + ' run make -j ' + cpuCount());
    }).then(function () {
        return execAsync('click chroot -a' + architecture + ' -f ' + framework + ' run make install');
    }).then(function () {
        cp(path.join(ubuntuDir, 'www', '*'), path.join(prefixDir, 'www'));
        cp(path.join(ubuntuDir, 'qml', '*'), path.join(prefixDir, 'qml'));
        cp(path.join(ubuntuDir, 'cordova.desktop'), prefixDir);
        cp(path.join(ubuntuDir, 'config.xml'), prefixDir);

        var content = JSON.parse(fs.readFileSync(path.join(ubuntuDir, 'manifest.json'), {encoding: "utf8"}));
        content.architecture = architecture;
        content.framework = framework;
        fs.writeFileSync(path.join(prefixDir, 'manifest.json'), JSON.stringify(content));

        content = JSON.parse(fs.readFileSync(path.join(ubuntuDir, 'apparmor.json'), {encoding: "utf8"}));
        if (framework == 'ubuntu-sdk-13.10')
            content.policy_version = 1;
        else
            content.policy_version = 1.1;
        fs.writeFileSync(path.join(prefixDir, 'apparmor.json'), JSON.stringify(content));

        pushd(prefixDir);

        return execAsync('click build .');
    }).then(function () {
        checkClickPackage(prefixDir);
        popd();

        popd();
    });
}

function buildNative(campoDir, ubuntuDir, nobuild, debug) {
    var nativeDir = path.join(ubuntuDir, 'native');
    var prefixDir = path.join(nativeDir, 'prefix');

    if (nobuild && fs.existsSync(path.join(prefixDir, 'cordova-ubuntu'))) {
        return Q();
    }

    checkEnv(ubuntuDir);

    shell.rm('-rf', prefixDir);

    shell.mkdir(path.join(nativeDir, 'build'));
    shell.mkdir(prefixDir);

    pushd(path.join(nativeDir, 'build'));

    var buildType = '"Debug"';
    if (!debug)
        buildType = '"Release"';

    var cmakeCmd = 'cmake ' + campoDir + ' -DCMAKE_INSTALL_PREFIX="' + prefixDir + '"'
        + ' -DCMAKE_BUILD_TYPE=' + buildType;

    var deps = additionalBuildDependencies(ubuntuDir).join(' ').replace(/ARCH/g, '');
    if (deps.length)
        cmakeCmd += ' -DADDITIONAL_DEPENDECIES="' + deps + '"';

    var debDir;
    return execAsync(cmakeCmd).then(function () {
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

module.exports.build = function(rootDir, target, nobuild, architecture, framework, debug) {
    var ubuntuDir = path.join(rootDir, 'platforms', 'ubuntu');
    var campoDir = path.join(ubuntuDir, 'build');

    if (!architecture)
        architecture = 'armhf';
    if (!framework)
        framework = DEFAULT_FRAMEWORK;

    assert.ok(fs.existsSync(ubuntuDir));
    assert.ok(fs.existsSync(campoDir));

    if (target === module.exports.PHONE)
        return buildClickPackage(campoDir, ubuntuDir, nobuild, architecture, framework, debug);
    if (target === module.exports.DESKTOP)
        return buildNative(campoDir, ubuntuDir, nobuild, debug);
    if (target === module.exports.ALL) {
        return buildClickPackage(campoDir, ubuntuDir, nobuild, architecture, framework, debug).then(function () {
            return buildNative(campoDir, ubuntuDir, nobuild);
        });
    }
}

function runNative(rootDir, debug) {
    var ubuntuDir = path.join(rootDir, 'platforms', 'ubuntu');
    var nativeDir = path.join(ubuntuDir, 'native');

    pushd(path.join(nativeDir, 'prefix'));

    var cmd = 'QTWEBKIT_INSPECTOR_SERVER=9222 ./cordova-ubuntu www/';
    if (debug) {
        cmd = "DEBUG=1 " + cmd;
        console.error('Debug enabled. Try pointing a WebKit browser to http://127.0.0.1:9222'.yellow);
    }

    return execAsync(cmd).then(function () {
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

function getDeviceArch(target) {
    var out = adbExec(target, 'shell dpkg --print-architecture').output.split('\r\n');

    assert.ok(out.length == 2 && out[0].indexOf(' ') == -1);

    return out[0];
}

function runOnDevice(rootDir, debug, target, architecture, framework) {
    var ubuntuDir = path.join(rootDir, 'platforms', 'ubuntu');

    if (!isDeviceAttached(target)) {
        console.error(msg.UBUNTU_TOUCH_DEVICE_NOT_AVALIABLE.red)
        process.exit(1);
    }

    var archDir = path.join(ubuntuDir, framework, architecture);
    var prefixDir = path.join(archDir, 'prefix');

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

module.exports.run = function(rootDir, desktop, debug, target, nobuild, emulator, framework) {
    if (desktop && !emulator) {
        return module.exports.build(rootDir, module.exports.DESKTOP, nobuild, null, null, debug).then(function () {
            return runNative(rootDir, debug);
        });
    }

    if (!framework)
        framework = DEFAULT_FRAMEWORK;

    if (!target) {
        var devices = deviceList();

        if (!devices.length) {
            console.error(msg.UBUNTU_TOUCH_DEVICE_NOT_AVALIABLE.red)
            process.exit(1);
        }

        if (emulator) {
            devices = devices.filter(function (name) {
                return name.match(/^emulator-/);
            });
            if (!devices.length) {
                console.error(msg.EMULATOR_IS_NOT_RUNNING.red)
                process.exit(1);
            }
        }

        target = devices[0];

        if (devices.length > 1) {
            console.warn('you can specify target with --target <device id>'.yellow);
            console.warn(('running on ' + target).yellow);
        }
    }
    var arch = getDeviceArch(target);

    return module.exports.build(rootDir, module.exports.PHONE, nobuild, arch, framework, debug).then(function () {
        return runOnDevice(rootDir, debug, target, arch, framework);
    });
}

module.exports.check_reqs = function(rootDir) {
    var checkReqs = path.join(rootDir, 'platforms', 'ubuntu', 'cordova', 'check_reqs');
    return execAsync(checkReqs);
}
