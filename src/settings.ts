import {
  AbstractInputSuggest,
  App,
  PluginSettingTab,
  SecretComponent,
  Setting,
  TFolder,
} from "obsidian";
import type PublishToS3Plugin from "./main";

class FolderSuggest extends AbstractInputSuggest<TFolder> {
  protected getSuggestions(query: string): TFolder[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return this.app.vault
      .getAllFolders(true)
      .filter(
        (folder) =>
          (!normalizedQuery && folder.isRoot()) ||
          (!folder.isRoot() && folder.path.toLocaleLowerCase().includes(normalizedQuery)),
      )
      .sort((left, right) => {
        if (left.isRoot()) return -1;
        if (right.isRoot()) return 1;
        return left.path.localeCompare(right.path);
      });
  }

  renderSuggestion(folder: TFolder, element: HTMLElement): void {
    element.setText(folder.isRoot() ? "Vault root" : folder.path);
  }
}

export interface PublishToS3Settings {
  folder: string;
  s3: {
    accessKeyId: string;
    secretAccessKeySecretId: string;
    bucket: string;
    prefix: string;
    endpoint: string;
    region: string;
  };
}

export const DEFAULT_SETTINGS: PublishToS3Settings = {
  folder: "",
  s3: {
    accessKeyId: "",
    secretAccessKeySecretId: "",
    bucket: "",
    prefix: "",
    endpoint: "",
    region: "",
  },
};

export class PublishToS3SettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: PublishToS3Plugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Folder")
      .setDesc("Path to the folder to publish, relative to the vault root.")
      .addText((text) => {
        new FolderSuggest(this.app, text.inputEl).onSelect(async (folder) => {
          const path = folder.isRoot() ? "" : folder.path;
          text.setValue(path);
          this.plugin.settings.folder = path;
          await this.plugin.saveSettings();
        });

        return text
          .setPlaceholder("Vault root")
          .setValue(this.plugin.settings.folder)
          .onChange(async (folder) => {
            this.plugin.settings.folder = folder;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName("S3 configuration").setHeading();

    new Setting(containerEl)
      .setName("Access key ID")
      .setDesc("The S3 access key ID.")
      .addText((text) =>
        text.setValue(this.plugin.settings.s3.accessKeyId).onChange(async (accessKeyId) => {
          this.plugin.settings.s3.accessKeyId = accessKeyId;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Secret access key")
      .setDesc("Select the S3 secret access key from Obsidian's keychain.")
      .addComponent((element) =>
        new SecretComponent(this.app, element)
          .setValue(this.plugin.settings.s3.secretAccessKeySecretId)
          .onChange(async (secretAccessKeySecretId) => {
            this.plugin.settings.s3.secretAccessKeySecretId = secretAccessKeySecretId;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Bucket")
      .setDesc("The S3 bucket.")
      .addText((text) =>
        text.setValue(this.plugin.settings.s3.bucket).onChange(async (bucket) => {
          this.plugin.settings.s3.bucket = bucket;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Prefix (optional)")
      .setDesc("The prefix to prepend to published object keys.")
      .addText((text) =>
        text.setValue(this.plugin.settings.s3.prefix).onChange(async (prefix) => {
          this.plugin.settings.s3.prefix = prefix;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Endpoint (optional)")
      .setDesc("The S3-compatible service endpoint.")
      .addText((text) =>
        text
          .setPlaceholder("https://s3.example.com")
          .setValue(this.plugin.settings.s3.endpoint)
          .onChange(async (endpoint) => {
            this.plugin.settings.s3.endpoint = endpoint;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Region (optional)")
      .setDesc("The S3 region.")
      .addText((text) =>
        text
          .setPlaceholder("us-east-1")
          .setValue(this.plugin.settings.s3.region)
          .onChange(async (region) => {
            this.plugin.settings.s3.region = region;
            await this.plugin.saveSettings();
          }),
      );
  }
}
