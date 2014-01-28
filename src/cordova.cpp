/*
 *  Copyright 2013 Canonical Ltd.
 *  Copyright 2011 Wolfgang Koller - http://www.gofg.at/
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

#include "cordova.h"

#include <QtGui>

#include <QApplication>
#include <QQuickView>
#include <QQuickItem>
#include <QQmlContext>

Cordova::Cordova(QDir wwwDir, QString contentFile, QQuickItem *item, QObject *parent): QObject(parent), m_item(item), m_www(wwwDir) {
    qDebug() << "Using" << m_www.absolutePath() << "as working dir";

    if (!m_www.exists(contentFile))
        qCritical() << contentFile << "does not exists";

    m_mainUrl = QUrl::fromUserInput(m_www.absoluteFilePath(contentFile)).toString();

    qCritical() << QString(m_mainUrl);
}

QString Cordova::get_app_dir() {
    return m_www.absolutePath();
}

struct Splash {
    double rating;
    QString path;
};

QString Cordova::getSplashscreenPath() {
    double ratio = (double)m_item->width() / m_item->height();

    QDir dir(get_app_dir());
    if (!dir.cd("splashscreen"))
        return "";

    QList<Splash> images;
    for (QFileInfo info: dir.entryInfoList()) {
        QImage image(info.absoluteFilePath());
        if (image.isNull())
            continue;
        Splash t;
        t.path = info.absoluteFilePath();
        t.rating = std::abs((image.width() / (double)m_item->width()) * ((image.width() / image.height()) / ratio) - 1);
        images.push_back(t);
    }
    std::min_element(images.begin(), images.end(), [](Splash &f, Splash &s) {
        return f.rating < s.rating;
    });
    if (!images.empty())
      return images.first().path;
    return "";
}

void Cordova::initPlugins() {
    QList<QDir> searchPath = {get_app_dir()};

    m_plugins.clear();
    for (QDir pluginsDir: searchPath) {
        for (const QString &fileName: pluginsDir.entryList(QDir::Files)) {
            QString path = pluginsDir.absoluteFilePath(fileName);
            qDebug() << "Testing" << path;

            if (!QLibrary::isLibrary(path))
                continue;

            CordovaGetPluginInstances loader = (CordovaGetPluginInstances) QLibrary::resolve(path, "cordovaGetPluginInstances");
            if (!loader) {
                qCritical() << "Missing cordovaGetPluginInstances symbol in" << path;
                continue;
            }

            auto plugins = (*loader)(this);

            for (QSharedPointer<CPlugin> plugin: plugins) {
                qDebug() << "Enable plugin" << plugin->fullName();
                emit pluginWantsToBeAdded(plugin->fullName(), plugin.data(), plugin->shortName());
            }
            m_plugins += plugins;
        }
    }
}

void Cordova::loadFinished(bool ok) {
    Q_UNUSED(ok)

    initPlugins();
}

void Cordova::execQML(const QString &src) {
    emit qmlExecNeeded(src);
}

void Cordova::execJS(const QString &js) {
    emit javaScriptExecNeeded(js);
}

QString Cordova::mainUrl() const {
    return m_mainUrl;
}

QObject *Cordova::topLevelEventsReceiver() {
    return dynamic_cast<QQuickView*>(m_item->window());
}

QQuickItem *Cordova::rootObject() {
    return m_item->parentItem();
}

void Cordova::setTitle(const QString &title) {
    dynamic_cast<QQuickView*>(m_item->window())->setTitle(title);
}

void Cordova::pushViewState(const QString &state) {
    if (m_states.empty()) {
        rootObject()->setState(state);
    }
    m_states.push_front(state);
}

void Cordova::popViewState(const QString &state) {
    if (!m_states.removeOne(state))
        qDebug() << "WARNING: incorrect view states order";

    if (m_states.empty()) {
        rootObject()->setState("main");
    } else {
        rootObject()->setState(m_states.front());
    }
}
