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
import Ubuntu.Components 1.1
import Ubuntu.Components.ListItems 1.0 as ListItems
import Ubuntu.Components.Popups 1.0

Popover {
    id: itemSelector
    caller: parent

    contentWidth: Math.min(parent.width - units.gu(11), units.gu(39))
    contentHeight: Math.min(parent.height - units.gu(11), listContentHeight)
    property real listContentHeight: 0

    property QtObject selectorModel: model

    ListView {
        clip: true
        width: itemSelector.contentWidth
        height: itemSelector.contentHeight

        model: selectorModel.items

        delegate: ListItems.Standard {
            text: model.text
            enabled: model.enabled
            selected: model.selected
            onClicked: {
                selectorModel.items.select(model.index)
                selectorModel.accept()
            }
        }

        section.property: "group"
        section.delegate: ListItems.Header {
            text: section
        }

        onContentHeightChanged: itemSelector.listContentHeight = contentHeight
    }

    Component.onCompleted: show()

    onVisibleChanged: {
        if (!visible) {
            selectorModel.cancel()
        }
    }
}
