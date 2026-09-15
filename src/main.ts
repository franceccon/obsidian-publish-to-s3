import { Notice, Plugin, ProgressBarComponent } from "obsidian";
import { publishToS3 } from "./publish";
import { DEFAULT_SETTINGS, PublishToS3SettingTab, type PublishToS3Settings } from "./settings";

export default class PublishToS3Plugin extends Plugin {
  settings!: PublishToS3Settings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new PublishToS3SettingTab(this.app, this));
    this.addCommand({
      id: "publish",
      name: "Publish",
      callback: () => {
        void this.publish();
      },
    });
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

  private async publish(): Promise<void> {
    const content = document.createDocumentFragment();
    const summary = document.createElement("div");
    const currentFile = document.createElement("div");
    const progressContainer = document.createElement("div");
    content.append(summary, currentFile, progressContainer);

    summary.textContent = "Preparing files…";
    const progressBar = new ProgressBarComponent(progressContainer).setValue(0);
    const progressNotice = new Notice(content, 0);

    try {
      const fileCount = await publishToS3(this.app, this.settings, (progress) => {
        summary.textContent = `Uploaded ${progress.completed} of ${progress.total}`;
        currentFile.textContent = progress.currentPath
          ? `Uploading ${progress.currentPath}`
          : "Upload complete";
        progressBar.setValue((progress.completed / progress.total) * 100);
      });

      progressNotice.hide();
      new Notice(`Published ${fileCount} files to S3.`);
    } catch (error) {
      progressNotice.hide();
      console.error("Failed to publish files to S3", error);
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Failed to publish files to S3: ${message}`);
    }
  }
}
