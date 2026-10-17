# Rough Path Alpha Engine v1.8.8

- Paper positions open when an arrow appears on the forming candle; no candle-close wait.
- Live arrow painting dispatches bot evaluation, with the old 500 ms bot throttle removed.
- Each direction can trade once per candle; redraws and flickering/repainted arrows do not duplicate that side.
- Starting Bot can act on a current visible arrow. Closed history and resume backlogs are ignored.
- Both-direction tiles, configurable options, 10% equity / 500× defaults and Chandelier profit exits are preserved.
- Existing release signing certificate; includes APK, source ZIP, spec and checksums.
