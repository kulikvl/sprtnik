import EditorJS, { type OutputData } from '@editorjs/editorjs';
import List from '@editorjs/list';
import Image from '@editorjs/image';

interface EditorConfig {
  containerId: string;
  initialData?: OutputData;
  readOnly?: boolean;
  onImageUpload?: (image: Blob) => Promise<number>;
  onImageGet: (id: number) => Promise<Blob>;
}

export class Editor {
  private instance!: EditorJS;

  public constructor(private readonly config: EditorConfig) {}

  public async init() {
    if (this.config.initialData) {
      await this.preprocessData(this.config.initialData);
    }

    const onImageUpload = this.config.onImageUpload;

    return new Promise<void>((resolve, _) => {
      this.instance = new EditorJS({
        autofocus: false,
        inlineToolbar: false,
        hideToolbar: true,
        holder: this.config.containerId,
        data: this.config.initialData,
        tools: {
          list: List,
          image: {
            class: Image,
            config: {
              ...(onImageUpload
                ? {
                    uploader: {
                      uploadByFile: async (file: File) => {
                        const blob = new Blob([file], { type: '' });
                        const imageId = await onImageUpload(blob);
                        const objectURL = URL.createObjectURL(blob);

                        return {
                          success: 1,
                          file: {
                            url: objectURL,
                            key: imageId,
                          },
                        };
                      },
                    },
                  }
                : {}),
            },
          },
        },
        onReady: async () => {
          if (this.config.readOnly) {
            this.instance.readOnly.toggle();
          }
          // @ts-expect-error https://github.com/codex-team/editor.js/issues/2405
          this.instance.ui.nodes.wrapper.classList.remove('codex-editor--narrow');
          resolve();
        },
      });
    });
  }

  private async preprocessData(data: OutputData) {
    await Promise.all(
      data.blocks.map(async block => {
        if (block.type === 'image' && block.data?.file?.key) {
          const blobKey = block.data.file.key;
          const blob = await this.config.onImageGet(blobKey);
          block.data.file.url = URL.createObjectURL(blob);
        }
      }),
    );
  }

  public async setData(data: OutputData | null) {
    if (data === null) {
      await this.instance.blocks.clear();
    } else {
      await this.preprocessData(data);
      await this.instance.render(data);
    }
  }

  public async getData() {
    return await this.instance.save();
  }

  public destroy() {
    this.instance.destroy();
  }
}
