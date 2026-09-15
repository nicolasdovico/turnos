#!/bin/bash
set -e

# Parchear el tuple de browser en los bundles compilados de Evolution API
# Reemplaza Node os.release() ("6.8.0-139-generic") por "22.04.4" para cumplir la firma oficial de Baileys Browsers.ubuntu('Chrome')
node -e '
const fs = require("fs");
const path = require("path");
function patchDir(d) {
  if (!fs.existsSync(d)) return;
  for (const item of fs.readdirSync(d)) {
    const full = path.join(d, item);
    if (fs.statSync(full).isDirectory()) patchDir(full);
    else if (item.endsWith(".js") && !item.endsWith(".map")) {
      let c = fs.readFileSync(full, "utf8");
      const r = /\[t\.CLIENT,\s*t\.NAME,\s*(?:\(0,\s*[a-zA-Z0-9_$]+\.release\)\(\)|[a-zA-Z0-9_$]+\.release\(\))\]/g;
      if (r.test(c)) {
        fs.writeFileSync(full, c.replace(r, "[t.CLIENT, t.NAME, \"22.04.4\"]"), "utf8");
      }
    }
  }
}
patchDir("/evolution/dist");
'

# Ejecutar despliegue de base de datos y servidor de producción
. ./Docker/scripts/deploy_database.sh
exec npm run start:prod
