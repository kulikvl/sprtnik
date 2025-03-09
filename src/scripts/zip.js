import JSZip from "jszip";

export async function parseZip(file) {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);
  // Look for a file named "cards.json" in the ZIP archive
  const cardsFile = content.file("cards.json");
  if (!cardsFile) {
    throw new Error("cards.json not found in the zip archive.");
  }
  const cardsText = await cardsFile.async("string");
  const cardsData = JSON.parse(cardsText);

  return { cards: cardsData };
}
