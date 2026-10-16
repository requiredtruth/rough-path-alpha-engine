#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$PWD/.android-sdk}}"
BT="$SDK/build-tools/35.0.0"; JAR="$SDK/platforms/android-35/android.jar"
mkdir -p build/worker-classes build/worker-dex
javac -source 8 -target 8 -bootclasspath "$JAR:$BT/core-lambda-stubs.jar" -d build/worker-classes tests/android-worker/WorkerCheck.java
"$BT/d8" --lib "$JAR" --min-api 26 --output build/worker-dex build/worker-classes/com/roughpath/qa/*.class
"$BT/aapt" package -f -M tests/android-worker/AndroidManifest.xml -I "$JAR" -F build/worker-unsigned.apk
(cd build/worker-dex && zip -q -u ../worker-unsigned.apk classes.dex)
"$BT/zipalign" -f -p 4 build/worker-unsigned.apk build/worker-aligned.apk
"$BT/apksigner" sign --ks build/signing.jks --ks-pass "${RP_KEYSTORE_PASS:-pass:android}" --out tests/android-worker/test.apk build/worker-aligned.apk
"$BT/apksigner" verify tests/android-worker/test.apk
