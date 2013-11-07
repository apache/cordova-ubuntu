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

#include <QtCore>
#include <QApplication>
#include <QQuickView>
#include <QQuickItem>
#include <QQmlContext>
#include <QQmlEngine>

#ifdef Q_OS_LINUX
#include <xcb/xcb.h>
#include <xcb/xproto.h>
#endif

static void customMessageOutput(QtMsgType type, const QMessageLogContext &, const QString &msg) {
    switch (type) {
    case QtDebugMsg:
        if (qgetenv("DEBUG").size()) {
            fprintf(stderr, "Debug: %s\n", msg.toStdString().c_str());
        }
        break;
    case QtWarningMsg:
        fprintf(stderr, "Warning: %s\n", msg.toStdString().c_str());
        break;
    case QtCriticalMsg:
        fprintf(stderr, "Critical: %s\n", msg.toStdString().c_str());
        break;
    case QtFatalMsg:
        fprintf(stderr, "Fatal: %s\n", msg.toStdString().c_str());
        abort();
    }
}

int main(int argc, char *argv[]) {
    qInstallMessageHandler(customMessageOutput);
    QScopedPointer<QApplication> app(new QApplication(argc, argv));

    //TODO: switch to options parser
    // temprory hack to filter --desktop_file_hint
    QStringList args = app->arguments().filter(QRegularExpression("^[^-]"));

    std::string wm_class;
    QDir wwwDir;
    qDebug() << args << args[args.size() - 1];
    if (QDir(args[args.size() - 1]).exists()) {
        QDir app_dir(args[args.size() - 1]);
        QDir parent(app_dir);
        parent.cdUp();
        wm_class = parent.dirName().toStdString();
        wwwDir = app_dir;
    } else {
        wwwDir = QDir(QApplication::applicationDirPath());
        wwwDir.cd("www");
    }

    QScopedPointer<QQuickView> view(new QQuickView());;

    std::string execDir = "/usr/bin";
    QDir workingDir;
    if (QApplication::applicationDirPath().toStdString().substr(0, execDir.size()) == execDir) {
        workingDir = QString("/usr/share/cordova-ubuntu-") + CORDOVA_UBUNTU_VERSION;
    } else {
        workingDir = QApplication::applicationDirPath();
    }

    view->rootContext()->setContextProperty("www", wwwDir.absolutePath());
    view->setSource(QUrl(QString("%1/qml/main.qml").arg(workingDir.absolutePath())));

#if defined(Q_OS_LINUX) && defined(Q_PROCESSOR_X86)
    if (wm_class.size()) {
        xcb_connection_t *c = xcb_connect(NULL,NULL);
        xcb_change_property(c, XCB_PROP_MODE_REPLACE, view->winId(), XCB_ATOM_WM_CLASS, XCB_ATOM_STRING, 8, wm_class.size(), wm_class.c_str());
        xcb_flush(c);
        xcb_disconnect(c);
    }
#endif

    view->setResizeMode(QQuickView::SizeRootObjectToView);
    view->show();

    return app->exec();
}
