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
#include <QtCore>
#include "cplugin.h"
#include "coreplugins.h"
INSERT_HEADER_HERE

#define INIT_PLUGIN(class) \
    res.prepend(QSharedPointer<class>(new class(cordova))); \

extern "C" {

Q_DECL_EXPORT QList<QSharedPointer<CPlugin>> cordovaGetPluginInstances(Cordova *cordova) {
    QList<QSharedPointer<CPlugin>> res;

    INSERT_PLUGIN_HERE

    return res;
}

}
