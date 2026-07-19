import { getCatalystApp } from "@/lib/catalystContext";

/**
 * `convertToPdf` returns a Node.js Readable stream (confirmed from
 * zcatalyst-sdk-node's own type definitions —
 * node_modules/zcatalyst-sdk-node/lib/smartbrowz/index.d.ts —
 * `convertToPdf(source: string, options?): Promise<Readable>`), not a
 * Buffer/URL, so it has to be drained before it can be sent as an HTTP
 * response body.
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Renders an HTML string to a PDF Buffer via Catalyst SmartBrowz. */
export async function renderHtmlToPdfBuffer(html) {
  const smartbrowz = getCatalystApp().smartbrowz();
  const stream = await smartbrowz.convertToPdf(html, {
    pdf_options: {
      format: "A4",
      print_background: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    },
    navigation_options: { wait_until: "domcontentloaded" },
  });
  return streamToBuffer(stream);
}
