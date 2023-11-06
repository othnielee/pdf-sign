import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { AppSettings } from '../interfaces/app-settings.interface';

export class ConfigService {
  private static appSettings: AppSettings;

  static async load() {
    if (!this.appSettings) {
      dotenv.config();

      const appSettingsFile = process.env.APP_SETTINGS_FILE;

      if (!appSettingsFile) {
        throw new Error('APP_SETTINGS_FILE environment variable is not set');
      }

      const appSettingsData = await readFile(appSettingsFile, 'utf-8').catch(() => null);

      if (!appSettingsData) {
        throw new Error('APP_SETTINGS_FILE is not a valid file');
      }

      try {
        this.appSettings = JSON.parse(appSettingsData);
      } catch {
        throw new Error('APP_SETTINGS_FILE is not a valid JSON file');
      }
    }

    return this.appSettings;
  }
}