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

#ifndef CORDOVA_H_DJJKASDM44
#define CORDOVA_H_DJJKASDM44

#include <QtCore>
#include <cassert>

#include "cplugin.h"

class QQuickView;
class QQuickItem;

class Cordova: public QObject {
    Q_OBJECT
    Q_PROPERTY(QString mainUrl READ mainUrl CONSTANT)

public:
    explicit Cordova(QDir wwwDir, QString contentFile, QQuickItem *item, QObject *parent = nullptr);

    QString mainUrl() const;
    QObject *topLevelEventsReceiver();
    QQuickItem *rootObject();
    QString get_app_dir();

    void pushViewState(const QString &state);
    void popViewState(const QString &state);
    QString getSplashscreenPath();
signals:
    void javaScriptExecNeeded(const QString &js);
    void qmlExecNeeded(const QString &src);
    void pluginWantsToBeAdded(const QString &pluginName, QObject *pluginObject, const QString &pluginShortName);

public slots:
    void loadFinished(bool ok);
    void execJS(const QString &js);
    void setTitle(const QString &title);
    void execQML(const QString &src);

private:
    int m_alertCallback;

    void initPlugins();

    QQuickItem *m_item;
    QList<QSharedPointer<CPlugin>> m_plugins;

    QDir m_www;
    QString m_mainUrl;
    QList<QString> m_states;
    Q_DISABLE_COPY(Cordova)
};

#endif
