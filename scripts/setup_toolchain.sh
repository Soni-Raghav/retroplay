#!/bin/bash
# Re-provision Android build toolchain (sandbox only keeps /home/z/my-project).
set -e
mkdir -p /home/z/tools && cd /home/z/tools

echo "== gradle =="
if [ ! -x gradle-8.7/bin/gradle ]; then
  curl -sSLo gradle-8.7.zip https://services.gradle.org/distributions/gradle-8.7-bin.zip
  rm -rf gradle-8.7 && python3 -c "import zipfile; zipfile.ZipFile('gradle-8.7.zip').extractall('.')"
  chmod +x gradle-8.7/bin/gradle
fi
/home/z/tools/gradle-8.7/bin/gradle --version | head -6

echo "== android cmdline-tools =="
mkdir -p /home/z/android-sdk/cmdline-tools
if [ ! -d /home/z/android-sdk/cmdline-tools/latest ]; then
  curl -sSLo cmt.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  python3 -c "import zipfile; zipfile.ZipFile('cmt.zip').extractall('/home/z/android-sdk/cmdline-tools/_tmp')"
  mv /home/z/android-sdk/cmdline-tools/_tmp/cmdline-tools /home/z/android-sdk/cmdline-tools/latest
  rm -rf /home/z/android-sdk/cmdline-tools/_tmp cmt.zip
fi

export ANDROID_HOME=/home/z/android-sdk
yes | /home/z/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null 2>&1 || true
/home/z/android-sdk/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" | tail -3
echo "SDK ready:"
ls /home/z/android-sdk
