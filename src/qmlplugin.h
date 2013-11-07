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
#ifndef QMLPLUGIN_H_SDASDAS
#define QMLPLUGIN_H_SDASDAS

#include <QtCore>
#include <QtQuick>
#include <cassert>

#include "cordova.h"

class CordovaWrapper: public QQuickItem {
    Q_OBJECT
    Q_PROPERTY(QString wwwDir READ wwwDir WRITE setWwwDir SCRIPTABLE true FINAL)
    Q_PROPERTY(QString mainUrl READ mainUrl CONSTANT)
public:
    CordovaWrapper() = default;

    QString wwwDir() {
        if (!m_cordova.data()) {
            return "";
        }
        return m_wwwDir;
    }

    void setWwwDir(const QString &www) {
        assert(!m_cordova.data());
        m_cordova = QSharedPointer<Cordova>(new Cordova(QDir(www), this));
        m_wwwDir = www;

        connect(m_cordova.data(), &Cordova::javaScriptExecNeeded, [&] (const QString &js) {
            emit javaScriptExecNeeded(js);
        });
        connect(m_cordova.data(), &Cordova::qmlExecNeeded, [&] (const QString &src) {
            emit qmlExecNeeded(src);
        });
        connect(m_cordova.data(), &Cordova::pluginWantsToBeAdded, [&] (const QString &pluginName, QObject *pluginObject, const QString &pluginShortName) {
            emit pluginWantsToBeAdded(pluginName, pluginObject, pluginShortName);
        });
    }

    Q_INVOKABLE static QString getSplashscreenPath(QQuickItem *parent, const QString &www) {
        return QSharedPointer<Cordova>(new Cordova(QDir(www), parent))->getSplashscreenPath();
    }

    QString mainUrl() {
        if (!m_cordova.data()) {
            return "";
        }
        return m_cordova->mainUrl();
    }

signals:
    void javaScriptExecNeeded(const QString &js);
    void pluginWantsToBeAdded(const QString &pluginName, QObject *pluginObject, const QString &pluginShortName);
    void qmlExecNeeded(const QString &src);
public slots:
    void setTitle(const QString &title) {
        if (!m_cordova.data() || !m_cordova->rootObject()) {
            return;
        }
        return m_cordova->setTitle(title);
    }

    void loadFinished(bool b) {
        if (!m_cordova.data()) {
            return;
        }
        return m_cordova->loadFinished(b);
    }

private:
    QSharedPointer<Cordova> m_cordova;
    QString m_wwwDir;
};

class CordovaUbuntuPlugin: public QQmlExtensionPlugin {
    Q_OBJECT
    Q_PLUGIN_METADATA(IID "org.qt-project.Qt.QQmlExtensionInterface")

public:
    void registerTypes(const char *uri);
};

#endif
