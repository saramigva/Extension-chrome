export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export async function copy(text: string, button?: HTMLButtonElement): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (button) {
    const prev = button.textContent;
    button.textContent = "¡Copiado!";
    setTimeout(() => (button.textContent = prev), 1200);
  }
}

export function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  el("a", { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
