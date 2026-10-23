#!/usr/bin/env bash
# Prueba todos los modelos gratuitos/adicionales de OpenCode de una vez.
# Uso: bash probe_free_models.sh
set -u

PROVIDERS=(
  "opencode-go|gpt-5.6-luna"
  "opencode-go|deepseek-v4-flash"
  "opencode-go|kimi-k2.6"
  "opencode-go|qwen3.7-plus"
  "opencode-go|glm-5.2"
  "opencode-go|minimax-m3"
  "opencode-go|hy3"
  "opencode-go|grok-4.5"
  "opencode-go|qwen3.8-max"
  "google|gemini-3-flash-preview"
  "openrouter|nvidia/nemotron-3-ultra-550b-a55b:free"
  "openrouter|deepcogito/cogito-v2.1-671b"
  "openrouter|microsoft/phi-4"
  "openrouter|qwen/qwen3-coder-480b-a35b-instruct"
  "opencode-compatible-free|deepseek-v4-flash-free"
  "opencode-compatible-free|laguna-s-2.1-free"
  "opencode-compatible-free|ling-3.0-tiny-free"
  "opencode-compatible-free|longcat-2.0-free"
  "opencode-compatible-free|mimo-v2.5-free"
  "opencode-compatible-free|north-mini-code-free"
)

ok=()
maybe=()
fail=()

for entry in "${PROVIDERS[@]}"; do
  prov="${entry%%|*}"
  model="${entry##*|}"
  mid="$prov/$model"
  echo "== PROBANDO: $mid"
  out=$(opencode run 'Say PROBE_OK' --model "$mid" 2>&1 | tail -n 1 || true)
  echo "   -> $out"
  if echo "$out" | grep -qi "PROBE_OK\|build ·"; then
    ok+=("$mid")
  elif echo "$out" | grep -qi "timeout\|API key not valid\|Incorrect API key\|Unexpected server error\|doesn't look like a task\|I am online\|I'm online and ready to help"; then
    maybe+=("$mid")
  else
    fail+=("$mid")
  fi
  sleep 2
done

echo
echo "=== OK ==="
printf '%s\n' "${ok[@]}"
echo
echo "=== MAYBE ==="
printf '%s\n' "${maybe[@]}"
echo
echo "=== FAIL ==="
printf '%s\n' "${fail[@]}"
