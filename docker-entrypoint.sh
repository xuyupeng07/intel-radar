#!/bin/sh
set -e

# 让命名卷 / PVC 的第一启动也能被非 root 用户写入。
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/.data
  chown -R nextjs:nodejs /app/.data
  exec gosu nextjs "$@"
fi

exec "$@"
