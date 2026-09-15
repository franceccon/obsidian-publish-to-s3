import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, PublishToS3SettingTab, type PublishToS3Settings } from "./settings";

export default class PublishToS3Plugin extends Plugin {
  settings!: PublishToS3Settings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new PublishToS3SettingTab(this.app, this));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<PublishToS3Settings> | null;

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      s3: {
        ...DEFAULT_SETTINGS.s3,
        ...saved?.s3,
      },
    };
  }
}
