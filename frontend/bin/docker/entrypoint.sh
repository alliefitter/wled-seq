#!/bin/sh
set -e

cat <<EOF >/app/env-config.js
window.__ENV__ = {
  API_URL: "${WLED_SEQ_API_URL}"
};
EOF

exec "$@"
