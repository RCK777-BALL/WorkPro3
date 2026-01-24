#!/usr/bin/env bash
set -euo pipefail

TLS_DIR="${1:-docker/mongo/tls}"

mkdir -p "$TLS_DIR"

openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout "$TLS_DIR/ca.key" \
  -out "$TLS_DIR/ca.crt" \
  -subj "/CN=workpro-mongo-ca"

openssl req -new -newkey rsa:4096 -nodes \
  -keyout "$TLS_DIR/server.key" \
  -out "$TLS_DIR/server.csr" \
  -subj "/CN=mongo" \
  -addext "subjectAltName=DNS:mongo,DNS:localhost"

openssl x509 -req -in "$TLS_DIR/server.csr" \
  -CA "$TLS_DIR/ca.crt" \
  -CAkey "$TLS_DIR/ca.key" \
  -CAcreateserial \
  -out "$TLS_DIR/server.crt" \
  -days 3650 \
  -sha256

cat "$TLS_DIR/server.crt" "$TLS_DIR/server.key" > "$TLS_DIR/tls.pem"
chmod 600 "$TLS_DIR/"*.key "$TLS_DIR/tls.pem"

echo "Mongo TLS materials written to $TLS_DIR"
