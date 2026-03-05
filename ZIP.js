export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { proposal, selections, model } = req.body;
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Construye los archivos del paquete
  const files = {
    'KIMERICA_Creative_Brief.md': `# KIMERICA — AI Creative Brief\n**Generated:** ${today}\n**Model:** ${model || 'Claude Opus 4'}\n\n---\n\n## Creative Direction\n\n${proposal?.text || 'AI-generated proposal.'}\n\n---\n\n## Project Scope\n\n| Deliverable | Investment |\n|---|---|\n| Creative Direction | ${proposal?.sc1 || '$2,800'} |\n| Visual Identity | ${proposal?.sc2 || '$4,200'} |\n| Digital Experience | ${proposal?.sc3 || '$5,500'} |\n| 3D / AI Elements | ${proposal?.sc4 || '$3,800'} |\n\n**Total:** ${proposal?.total || '$16,300'}\n**Timeline:** ${proposal?.time || '8–10 weeks'}\n`,

    'Brand_Guidelines.md': `# Brand Guidelines\n**Studio:** KIMERICA · ${today}\n\n## Typography\n- Display: Cormorant Garamond\n- UI: Syne\n\n## Color Palette\n- Black: #060608\n- Accent: #FF1A1A\n- White: #f8f6f2\n\n## Visual Direction\n${selections?.vis || 'Luxury Black'}\n`,

    'Project_Config.json': JSON.stringify({
      generated: today,
      model: model || 'claude-opus-4-6',
      selections,
      scope: proposal,
      studio: 'KIMERICA',
      contact: 'studio@kimerica.com'
    }, null, 2),

    'README.md': `# KIMERICA Project Package\n\nGenerated: ${today}\n\n## Files\n- Creative Brief (PDF brief content)\n- Brand Guidelines (typography, color, motion)\n- Project Config (scope + timeline)\n- README\n\n## Next Steps\n1. Review brief\n2. Approve via dashboard\n3. Studio contacts you in 48h\n\n---\nstudio@kimerica.com\n`
  };

  // Genera ZIP en Node.js (usando el builder nativo sin dependencias)
  const zipBuffer = buildZip(files);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="KIMERICA_Project_Package.zip"');
  res.setHeader('Content-Length', zipBuffer.length);
  return res.send(zipBuffer);
}

// ZIP builder sin dependencias externas
function buildZip(files) {
  const enc = (s) => Buffer.from(s, 'utf8');

  function crc32(buf) {
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v, 0); return b; }
  function u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v, 0); return b; }

  const entries = [];
  let localOffset = 0;

  for (const [name, content] of Object.entries(files)) {
    const fileData = enc(content);
    const nameBytes = enc(name);
    const crc = crc32(fileData);

    const localHeader = Buffer.concat([
      Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(fileData.length), u32(fileData.length),
      u16(nameBytes.length), u16(0), nameBytes
    ]);

    entries.push({ nameBytes, fileData, crc, localOffset, localHeader });
    localOffset += localHeader.length + fileData.length;
  }

  const cdParts = entries.map(e => Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x01, 0x02]),
    u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
    u32(e.crc), u32(e.fileData.length), u32(e.fileData.length),
    u16(e.nameBytes.length), u16(0), u16(0), u16(0), u16(0),
    u32(0), u32(e.localOffset), e.nameBytes
  ]));
  const cdData = Buffer.concat(cdParts);

  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x05, 0x06]),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(cdData.length), u32(localOffset), u16(0)
  ]);

  return Buffer.concat([
    ...entries.flatMap(e => [e.localHeader, e.fileData]),
    cdData, eocd
  ]);
}