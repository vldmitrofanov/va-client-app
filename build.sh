#!/bin/bash
VERSION_TYPE='patch'
PLATFORM_KEY=''
PUBLISH='never'

[ -z "$1" ] && echo "ERROR!" && echo "Usage: $0 <dev|qa|prod> [Optional version type: <patch|minor|major|none>]" && exit -1

#if [ "$2" != 'win32' -a "$2" != 'darwin' ]
#then 
#    echo "ERROR! please specify the platform you want to build upon" 
#    exit -1
#fi

PLATFORM=`node getPlatform.js`

case $PLATFORM in

  'darwin')
    PLATFORM_KEY='--mac --win'
    ;;

  'win32')
    PLATFORM_KEY='--win'
    ;;

  'linux')
    PLATFORM_KEY='--linux'
    ;;

#  *)
#    default goes here
#    ;;
esac

BUILD_TYPE=$1

case $BUILD_TYPE in

  'prod')
    PUBLISH='always'
    ;;

  *)
    PUBLISH='never'
    ;;
esac

if [ ! -z "$2" ]
then
    VERSION_TYPE=$2
fi
# if prod or qa increase version
if [ "$BUILD_TYPE" == 'prod' ]
then 
    if [ "$VERSION_TYPE" != "none" ]
    then
        npm version ${VERSION_TYPE}
    fi
fi

rm -f ./src/env.js
cp ./deploy/${BUILD_TYPE}.env.js ./src/env.js

# Example:
# npx electron-builder build --win --x64 --publish always
echo "Executing:"
echo "npx electron-builder build ${PLATFORM_KEY} --x64 --publish ${PUBLISH}"

npx electron-builder build ${PLATFORM_KEY} --x64 --publish ${PUBLISH}

cp ./deploy/dev.env.js ./src/env.js