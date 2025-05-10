import type { OutputData } from '@editorjs/editorjs';

export class Utils {
  public static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public static stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - color.length) + color;
  }

  public static getSnippet(editorData: OutputData, maxLen = 20) {
    if (!editorData?.blocks?.length) return 'No content';

    for (const block of editorData.blocks) {
      if (block.type === 'paragraph' && block.data?.text) {
        const rawText = block.data.text.replace(/<[^>]+>/g, '');
        return rawText.slice(0, maxLen) + (rawText.length > maxLen ? '…' : '');
      }
    }
    return 'No paragraph found';
  }

  public static findElementByIdOrFail<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Element with ID "${id}" not found`);
    }
    return el as T;
  }
}
