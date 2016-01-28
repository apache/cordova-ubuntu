<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->
## Release Notes for Cordova Ubuntu ##

### 4.3.3
* Fix reliance on deprecated Oxide's onLoadingChanged signal
* Fix debugging enabled flag & remove webkit specific bit
* fix typo
* adding missing node_modules

### 4.3.2 ###

* CB-10119 - change click framework to 15.04 by default (14.10 is deprecated)
* check_reqs only verifies node dependencies now, not ubuntu build deps which
  are checked once trying to build

### 4.3.1 ###

* default icon name `www/img/logo.png`
* add default icon parameter to `config.xml`
* use `QUrl::fromLocalFile()`
* set `mainUrl` when the file exists
* fix critical issue introduced by general URL support changes earlier
* check if content src points to a url or local file
* don't check deps at create time and propose to `auto-install` once at build time; this is for the `native/desktop` build

### 4.1.0 (4.0.0) ? ###

* CB-9836 Add .gitattributes to prevent CRLF line endings in repos
* CB-9800 Fixing contribute link.
* build: fix mechanism for additional dependencies
* CB-8965 Copy cordova-js-src directory to platform folder during create. This closes #11
* add default icon
* build: split error message
* use 1.3 policy_version for ubuntu-sdk-15.04+
* fix desktop file generator
* support ubuntu-sdk-15.04
* CordovaViewInternal: provide ItemSelector for oxide
* build: misc fix
* build: suggest to install dependencies automatically
* support Orientation preference from config.xml
* add custom hooks into manifest.js
* CB-8417 moved platform specific js into platform
* Update JS snapshot to version 4.1.0-dev (via coho)
* Set VERSION to 4.1.0-dev (via coho)

### 3.7.0 ###

* change version in CordovaUbuntu/qmldir
* add missing license header
* add missing license header
* fix warning message about missing chroot
* move manifest generator from cordova-lib
* unit tests
* misc
* CB-5655: make visible cordova version(native)
* set UBUNTU_TOUCH flag for device target
* Added device flag in build for building for phone. Desktop otherwise.
* set ubuntu-sdk-14.10 as default framework
* Logger.warn instead of Logger.info for some key messages.
* Use --verbose instead of --debug as argument to enabled additional output.
* Run On Device was not working because of invalid calls.
* Adb Exec Sync: fixed function call.
* Added node_modules to .gitignore.
* Added a new logging system as well as more meaningful debugging messages.
* Corrected a spelling mistake in a msg property key.
* Removed old msg.js file as we now use constants instead.
* Added node_modules to .gitignore.
* Run On Device was not working because of invalid calls.
* Adb Exec Sync: fixed function call.
* Fixed issues identified by @zaspire for merge request.
* Separated ubuntu.js in multiple tasks files for better maintainability. Use template folder for storing project assets and tasks. Deleted unecessary package.json. Various improvements.
* add wrapper class for cordova.xml
* port to oxide
* implement uri whitelist
* bin/build/run: skip signature verification
* add bin/update
* bin/build/run: support deploying to latest Ubuntu Touch
* bin/build: produce debian source package instead of binary
* set correct deb dependencies
* put icon into generated deb
* make sure 'native' dir exist
* Update JS snapshot to version 3.7.0-dev (via coho)
* added RELEASENOTES.md
* Update JS snapshot to version 3.7.0-dev (via coho)
* Set VERSION to 3.7.0-dev (via coho)

### 3.6.0 ###

* Set VERSION to 3.6.0 (via coho)
* Update JS snapshot to version 3.6.0 (via coho)
* added missing licenses
* bin/create: create www
* switch to incremental build
* set policy_version in apparmor.json based on framework version
* remove -flto from compiler flags
* change default to ubuntu-sdk-14.04
* plugin could specify additional build dependency
* use different compiler flags for debug/release build
* fix build problem with ubuntu-sdk-14.04
* bin/build/build: integrate with click-reviewers-tools
* bin/build/build: check chroot env before build
* bin/build/[build,run] add --framework option
* add emulator support
* add support for non-arm based Ubuntu Touch devices
* CordovaViewInternal: add overrideScheme
* cplugin: add onAppLoaded
* CB-6818 Add license for CONTRIBUTING.md
* Update JS snapshot to version 3.6.0-dev (via coho)
* Set VERSION to 3.6.0-dev (via coho)

### 3.5.0 ###

* CB-6954: updated version to 3.5.0 in package.json
* another qt 5.2 workaround
* allow inter plugin communication
* add .editorconfig
* workaround for qt 5.2
* check requirements before build
* bin/build/[build,run] always report errors
* don't hard code cpu count
* bin/build: fixes for --nobuild
* bin/build: specify framework instead of series for click chroot
* bin/build: switch to async shelljs.exec
* CB-6559: added top level package.json
* CB-6491 add CONTRIBUTING.md
* Update JS snapshot to version 3.5.0-dev (via coho)
* Update JS snapshot to version 3.5.0-dev (via coho)
* Set VERSION to 3.5.0-dev (via coho)

### 3.4.0 ###

* support content property from config.xml
* Expose main webview as a property
* fix bin/build/version
* src/cordova.cpp: better debug message
* change compiler flags
* bin/build/build: generate deb package
* bin/build/run: --nobuild option
* bin/build/run: --target option
* bin/run: use optimist node module for option parsing
* bin/build/run build only for target
* bin/build/run: add --debug option
* support running apps on device
* Update JS snapshot to version 3.4.0-dev (via coho)
* use child_process.exec correctly
* bin/create check for shelljs/elementtree
* Update JS snapshot to version 3.4.0-dev (via coho)
* Set VERSION to 3.4.0-dev (via coho)
