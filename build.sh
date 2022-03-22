#!/bin/bash
VERSION_TYPE='patch'

[ -z "$1" ] && echo "ERROR!" && echo "Usage: $0 <dev|qa|prod> [Optional version type: <patch|minor|major>]" && exit -1

if [ "$2" != 'win32' -a "$2" != 'darwin' ]
then 
    echo "ERROR! please specify the platform you want to build upon" 
    exit -1
fi

PLATFORM=`node getPlatform.js`

BUILD_TYPE=$1

if [ ! -z "$2" ]
then
    VERSION_TYPE=$2
fi
# if prod or qa increase version
if [ "$BUILD_TYPE" = 'qa' -o "$BUILD_TYPE" = 'prod' ]
then 
    npm version ${VERSION_TYPE}
fi

rm -f ./src/env.js
cp ./deploy/${BUILD_TYPE}.env.js ./src/env.js

VERSION=`node getVersion.js`

#sed -i.bu "s/version: '___V___'/version: \"${VERSION}\"/" src/env.js
#sed -i.bu "s/platform: '___V___'/platform: \"${PLATFORM}\"/" src/env.js

URL=`node getUploadUrl.js`

source "./deploy/${BUILD_TYPE}.tokens.sh"

#win32: 
#PLATFORMS=('win32' 'darvin')

#for PLATFORM in "${PLATFORMS[@]}"
#do
    #npx electron-packager . VaClientApp --platform=${PLATFORM} --arch=all --icon=src/icon.ico --out=./_app/builds --overwrite

npm run ${PLATFORM}-make

if [ "$PLATFORM" = "darwin" ]
then 
    mv ./_app/installers/darwin/VaClientApp.dmg ./_app/installers/darwin/VaClientApp.${VERSION}.dmg 
    FILEPATH="./_app/installers/darwin/VaClientApp.${VERSION}.dmg"
fi

echo "curl -X POST -H \"Token: ${TOKENS[0]}\" -F \"version=${VERSION}\" -F \"file=@${FILEPATH}\" \"${URL}/${PLATFORM}\""
curl -X POST -H "Token: ${TOKENS[0]}" -F "version=${VERSION}" -F "file=@${FILEPATH}" -i "${URL}/${PLATFORM}"

rm -f $FILEPATH

#done
