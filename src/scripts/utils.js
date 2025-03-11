export class Utils {
  /**
   * Trigger a browser download of a Blob.
   */
  static downloadBlob(blob, filename) {
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

  static hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('hidden');
  }
}
