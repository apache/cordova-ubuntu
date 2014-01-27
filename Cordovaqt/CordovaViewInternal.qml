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
import QtQuick 2.0
import QtWebKit 3.0
import QtWebKit.experimental 1.0
import "cordova_wrapper.js" as CordovaWrapper
import Ubuntu.Components 0.1
import Ubuntu.Components.Popups 0.1

Item {
    id: root

    anchors.fill: parent

    state: "main"
    signal completed

    property string splashscreenPath
    property bool disallowOverscroll
    property var mainWebview

    function exec(plugin, func, args) {
        CordovaWrapper.execMethod(plugin, func, args);
    }
    function plugin(plugin) {
        return CordovaWrapper.pluginObjects[plugin];
    }

    Rectangle {
        id: webViewContainer
        anchors.fill: parent
        WebView {
            id: webView
            anchors.fill: parent
            objectName: "webView"

            boundsBehavior: disallowOverscroll ? Flickable.StopAtBounds : Flickable.DragAndOvershootBounds
            property string scheme: "file"
            experimental.preferences.navigatorQtObjectEnabled: true
            experimental.preferences.localStorageEnabled: true
            experimental.preferences.offlineWebApplicationCacheEnabled: true
            experimental.preferences.universalAccessFromFileURLsAllowed: true
            experimental.preferences.webGLEnabled: true
            experimental.databaseQuotaDialog: Item {
                Timer {
                    interval: 1
                    running: true
                    onTriggered: {
                        model.accept(model.expectedUsage)
                    }
                }
            }
            // port in QTWEBKIT_INSPECTOR_SERVER enviroment variable
            experimental.preferences.developerExtrasEnabled: true

            function evalInPageUnsafe(expr) {
                experimental.evaluateJavaScript('(function() { ' + expr + ' })();');
            }

            experimental.onMessageReceived: {
                if (message.data.length > 1000) {
                    console.debug("WebView received Message: " + message.data.substr(0, 900) + "...");
                } else {
                    console.debug("WebView received Message: " + message.data);
                }

                CordovaWrapper.messageHandler(message)
            }

            Component.onCompleted: {
                root.mainWebview = webView;
                webView.url = cordova.mainUrl
            }

            onTitleChanged: {
                cordova.setTitle(webView.title)
            }

            onLoadingChanged: {
                if (loadRequest.status) {
                    root.completed()
                    cordova.loadFinished(true)
                }
                //TODO: check here for errors
            }

            Connections {
                target: cordova
                onJavaScriptExecNeeded: {
                    webView.experimental.evaluateJavaScript(js);
                }
                onQmlExecNeeded: {
                    console.log("2345");
                    eval(src);
                }
                onPluginWantsToBeAdded: {
                    CordovaWrapper.addPlugin(pluginName, pluginObject)
                }
            }
        }
    }

    Image {
        id: splashscreen
        anchors.fill: parent
        source: splashscreenPath
        visible: false
        smooth: true
        fillMode: Image.PreserveAspectFit
    }

    states: [
        State {
            name: "main"
            PropertyChanges {
                target: webViewContainer
                visible: true
            }
            PropertyChanges {
                target: splashscreen
                visible: false
            }
        },
        State {
            name: "splashscreen"
            PropertyChanges {
                target: webViewContainer
                visible: false
            }
            PropertyChanges {
                target: splashscreen
                visible: true
            }
        }
    ]
    transitions: Transition {
        RotationAnimation { duration: 500; direction: RotationAnimation.Shortest }
    }
}
