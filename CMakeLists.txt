cmake_minimum_required(VERSION 2.8.8)

project(cordova-ubuntu)

set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${PROJECT_SOURCE_DIR}")

file (STRINGS "VERSION" tmp)
STRING(REGEX MATCH "^[0-9]+\\.[0-9]+" VERSION ${tmp})
STRING(REGEX MATCH "^[0-9]+" MAJOR_VERSION ${tmp})
STRING(REGEX MATCH "[0-9]+$" MINOR_VERSION ${VERSION})

configure_file (
  "${PROJECT_SOURCE_DIR}/qml/main.qml.in"
  "${PROJECT_BINARY_DIR}/main.qml"
)
configure_file (
  "${PROJECT_SOURCE_DIR}/qml/CordovaView.qml.in"
  "${PROJECT_BINARY_DIR}/CordovaView.qml"
)

SET(CMAKE_CXX_FLAGS "-std=c++11 -fno-omit-frame-pointer -O2 -g -Wall -Wextra -DCORDOVA_UBUNTU_VERSION=\\\"${VERSION}\\\" -DCORDOVA_UBUNTU_MAJOR_VERSION=${MAJOR_VERSION} -DCORDOVA_UBUNTU_MINOR_VERSION=${MINOR_VERSION} -I ${PROJECT_SOURCE_DIR}/src")

add_custom_command(OUTPUT ${PROJECT_BINARY_DIR}/qml
  COMMAND mkdir -p ${PROJECT_BINARY_DIR}/qml
  COMMAND ${CMAKE_COMMAND} -E copy ${PROJECT_BINARY_DIR}/main.qml ${PROJECT_BINARY_DIR}/qml
  DEPENDS ${PROJECT_BINARY_DIR}/main.qml
)

file(GLOB tmp Cordovaqt/*)
add_custom_command(
  OUTPUT ${PROJECT_BINARY_DIR}/CordovaUbuntu.${VERSION}
  COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/Cordovaqt ${PROJECT_BINARY_DIR}/CordovaUbuntu.${VERSION}
  COMMAND ${CMAKE_COMMAND} -E copy ${PROJECT_BINARY_DIR}/libcordovaubuntuplugin.so ${PROJECT_BINARY_DIR}/CordovaUbuntu.${VERSION}
  COMMAND ${CMAKE_COMMAND} -E copy ${PROJECT_BINARY_DIR}/CordovaView.qml ${PROJECT_BINARY_DIR}/CordovaUbuntu.${VERSION}
  DEPENDS ${tmp} cordovaubuntuplugin ${PROJECT_BINARY_DIR}/CordovaView.qml
)
file(GLOB tmp xml/*)
add_custom_command(
  OUTPUT ${PROJECT_BINARY_DIR}/xml
  COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/xml ${PROJECT_BINARY_DIR}/xml
  DEPENDS ${tmp} ${PROJECT_SOURCE_DIR}/xml
)
add_custom_target(copy_wwwqmlxml DEPENDS ${PROJECT_BINARY_DIR}/CordovaUbuntu.${VERSION} ${PROJECT_BINARY_DIR}/xml ${PROJECT_BINARY_DIR}/qml)

find_package(Qt5Widgets)
find_package(Qt5Core)

add_executable(cordova-ubuntu
  main.cpp
)
qt5_use_modules(cordova-ubuntu Widgets Quick Xml)
add_dependencies(cordova-ubuntu copy_wwwqmlxml)

ADD_LIBRARY(cordovaubuntuplugin SHARED
  src/cplugin.cpp
  src/cordova.cpp
  src/qmlplugin.cpp

  src/cordova.h
  src/cplugin.h
  src/qmlplugin.h
)
qt5_use_modules(cordovaubuntuplugin Widgets Quick)

#TODO use subprojects
file(GLOB_RECURSE PLUGIN_SOURCES src/plugins/*.cpp)
file(GLOB_RECURSE PLUGIN_HEADERS src/plugins/*.h)

ADD_LIBRARY(coreplugins SHARED
  src/coreplugins.cpp

  ${PLUGIN_SOURCES}
  ${PLUGIN_HEADERS}
)
qt5_use_modules(coreplugins Widgets Location Sensors Feedback SystemInfo Contacts Multimedia Quick MultimediaWidgets)

target_link_libraries(cordova-ubuntu cordovaubuntuplugin)
target_link_libraries(coreplugins cordovaubuntuplugin)

# Qt5's cmake does not export QT_IMPORTS_DIR, lets query qmake on our own for now
get_target_property(QMAKE_EXECUTABLE Qt5::qmake LOCATION)
function(QUERY_QMAKE VAR RESULT)
 exec_program(${QMAKE_EXECUTABLE} ARGS "-query ${VAR}" RETURN_VALUE return_code OUTPUT_VARIABLE output )
 if(NOT return_code)
 file(TO_CMAKE_PATH "${output}" output)
 set(${RESULT} ${output} PARENT_SCOPE)
 endif(NOT return_code)
endfunction(QUERY_QMAKE)
query_qmake(QT_INSTALL_QML QT_IMPORTS_DIR)

install (TARGETS cordova-ubuntu DESTINATION ${CMAKE_INSTALL_PREFIX})
install (TARGETS coreplugins DESTINATION ${CMAKE_INSTALL_PREFIX}/www)
install (FILES ${PROJECT_SOURCE_DIR}/www/cordova.js DESTINATION ${CMAKE_INSTALL_PREFIX}/www/)
install (DIRECTORY ${PROJECT_BINARY_DIR}/qml DESTINATION ${CMAKE_INSTALL_PREFIX})
install (DIRECTORY ${PROJECT_BINARY_DIR}/CordovaUbuntu.${VERSION} DESTINATION ${CMAKE_INSTALL_PREFIX})
