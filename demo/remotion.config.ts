import { Config } from '@remotion/cli/config';
import os from 'node:os';
import path from 'node:path';

Config.setPublicDir('./assets');
// Reuse Playwright's Chromium instead of downloading another browser.
Config.setBrowserExecutable(path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1148/chrome-mac/Chromium.app/Contents/MacOS/Chromium'));
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
