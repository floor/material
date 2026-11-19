#!/usr/bin/env bash
# Ubuntu runner only. Playwright owns the dependency list.
set -euo pipefail

install_from_mirror() {
  local attempt status start
  for attempt in 1 2; do
    start=$SECONDS
    echo "System packages: mirror attempt $attempt/2 (limit $DEPS_TIMEOUT)"
    if install_attempt; then
      echo "System packages: mirror attempt $attempt succeeded in $((SECONDS - start))s"
      return 0
    else
      status=$?
    fi
    if [[ $attempt == 1 ]]; then
      echo "::warning::System package install exited $status after $((SECONDS - start))s; retrying once"
    fi
  done
  echo "::error::System package install exited $status after $((SECONDS - start))s on its second attempt"
  return "$status"
}

install_attempt() {
  # Run the deadline as root so it can also stop apt and its child processes.
  # Repair interrupted or partially configured packages inside the same
  # deadline. Leave any archives apt fetched in place for the retry.
  sudo DEBIAN_FRONTEND=noninteractive timeout --kill-after=15s "$DEPS_TIMEOUT" \
    bash -c 'dpkg --configure -a || apt-get -y -f install || exit; exec "$@"' \
    bash "${playwright[@]}" install-deps "${browsers[@]}"
}

main() {
  packages="$HOME/.cache/playwright-packages"
  playwright=("$(command -v node)" node_modules/playwright/cli.js)
  read -r -a browsers <<< "$BROWSERS"

  shopt -s nullglob
  local cached=("$packages"/*.deb)
  if [[ $CACHED == true && ${#cached[@]} -gt 0 ]]; then
    # apt-get can redownload files whose version is also in its package lists.
    # Use dpkg and let Playwright verify the full dependency set afterwards.
    if sudo DEBIAN_FRONTEND=noninteractive timeout --kill-after=15s 2m dpkg -i "${cached[@]}" \
      && "${playwright[@]}" install-deps --dry-run "${browsers[@]}"; then
      echo "System packages: ${#cached[@]} installed from the cache, none from the mirror"
      return 0
    fi
    echo "::warning::The cached system packages did not install; falling back to the mirror"
  fi

  echo 'APT::Keep-Downloaded-Packages "true";' | sudo tee /etc/apt/apt.conf.d/99-keep-downloaded-packages > /dev/null
  sudo apt-get clean
  install_from_mirror
  local fetched=(/var/cache/apt/archives/*.deb)
  echo "System packages: ${#fetched[@]} downloaded from the mirror"
  if [[ ${#fetched[@]} -gt 0 ]]; then
    mkdir -p "$packages"
    find "$packages" -maxdepth 1 -type f -name '*.deb' -delete
    cp "${fetched[@]}" "$packages/"
    echo "archives=true" >> "$GITHUB_OUTPUT"
  fi
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  main
fi
