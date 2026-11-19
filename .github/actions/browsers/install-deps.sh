#!/usr/bin/env bash
# Ubuntu runner only. Playwright owns the dependency list.
set -euo pipefail

install_from_mirror() {
  local attempt status start limit
  for attempt in 1 2; do
    limit=$DEPS_TIMEOUT
    if [[ $attempt == 2 ]]; then
      limit=$DEPS_RETRY_TIMEOUT
    fi
    start=$SECONDS
    echo "System packages: mirror attempt $attempt/2 (limit $limit)"
    if install_attempt "$attempt" "$limit"; then
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

# Preserve the runner's suites, components, and keyrings. Change only Ubuntu
# archive URLs, leaving other repositories and the host's source files alone.
make_https_sources() {
  local apt_root=$1 dest=$2 file
  mkdir -p "$dest/sources.list.d" || return
  if [[ -f "$apt_root/sources.list" ]]; then
    cp "$apt_root/sources.list" "$dest/sources.list" || return
  else
    touch "$dest/sources.list" || return
  fi
  for file in "$apt_root"/sources.list.d/*.list "$apt_root"/sources.list.d/*.sources; do
    [[ -f "$file" ]] || continue
    cp "$file" "$dest/sources.list.d/" || return
  done
  for file in "$dest"/sources.list "$dest"/sources.list.d/*.list "$dest"/sources.list.d/*.sources; do
    [[ -f "$file" ]] || continue
    sed -E \
      -e 's#mirror\+file:(//)?/etc/apt/apt-mirrors\.txt([[:space:]]|$)#https://archive.ubuntu.com/ubuntu/\2#g' \
      -e 's#https?://([[:alnum:].-]+\.)?archive\.ubuntu\.com/ubuntu/?([[:space:]]|$)#https://archive.ubuntu.com/ubuntu/\2#g' \
      "$file" > "$file.rewritten" || return
    mv "$file.rewritten" "$file" || return
  done
  printf 'Dir::Etc::sourcelist "%s/sources.list";\nDir::Etc::sourceparts "%s/sources.list.d";\n' "$dest" "$dest" > "$dest/apt.conf"
}

install_attempt() {
  local config=
  if [[ $1 == 2 ]]; then
    local fallback
    fallback=$(mktemp -d "$RUNNER_TEMP/playwright-apt.XXXXXX") || return
    make_https_sources /etc/apt "$fallback" || return
    config="$fallback/apt.conf"
    echo "System packages: retrying Ubuntu archives via https://archive.ubuntu.com/ubuntu/"
  fi
  # Run the deadline as root so it can also stop apt and its child processes.
  # Repair interrupted or partially configured packages inside the same
  # deadline. Leave any archives apt fetched in place for the retry.
  sudo DEBIAN_FRONTEND=noninteractive timeout --kill-after=15s "$2" bash -c '
    if [[ -n $1 ]]; then export APT_CONFIG="$1"; fi
    shift
    dpkg --configure -a || apt-get -y -f install || exit
    exec "$@"
  ' bash "$config" "${playwright[@]}" install-deps "${browsers[@]}"
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
