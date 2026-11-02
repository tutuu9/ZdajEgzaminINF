#!/usr/bin/env python3
"""Back up only the dedicated Zdaj database; retain seven verified dumps."""

import datetime
import fcntl
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


DEPLOYMENT = Path("/opt/zdaj-egzamin-inf")
BACKUPS = Path("/var/backups/zdaj-egzamin-inf")
LOCK_FILE = Path("/run/lock/zdaj-egzamin-backup.lock")
COMPOSE = [
    "/usr/bin/docker",
    "compose",
    "--env-file",
    str(DEPLOYMENT / ".env"),
    "-f",
    str(DEPLOYMENT / "compose.site.yaml"),
]
DUMP_NAME = re.compile(r"zdaj-\d{8}T\d{6}Z\.dump")


def run_database_command(arguments, **streams):
    result = subprocess.run(
        COMPOSE + ["exec", "-T", "postgres"] + arguments,
        stderr=subprocess.PIPE,
        timeout=600,
        check=False,
        **streams,
    )
    if result.returncode:
        # The database may include transient sessions; do not relay its output.
        raise RuntimeError("PostgreSQL backup or archive verification failed")


def backup():
    if os.geteuid() != 0:
        raise RuntimeError("This backup must run as root")
    os.umask(0o077)
    if DEPLOYMENT.resolve() != DEPLOYMENT:
        raise RuntimeError("Unexpected deployment path")
    BACKUPS.mkdir(mode=0o700, parents=True, exist_ok=True)
    if BACKUPS.resolve() != BACKUPS or not BACKUPS.is_dir():
        raise RuntimeError("Unexpected backup path")
    BACKUPS.chmod(0o700)

    with LOCK_FILE.open("w", encoding="utf-8") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print("Zdaj database backup is already running.")
            return
        name = datetime.datetime.now(datetime.timezone.utc).strftime(
            "zdaj-%Y%m%dT%H%M%SZ.dump"
        )
        destination = BACKUPS / name
        if destination.exists():
            raise RuntimeError("A backup with this timestamp already exists")
        descriptor, temporary_name = tempfile.mkstemp(prefix=".pending-", dir=BACKUPS)
        temporary = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "wb") as output:
                run_database_command(
                    ["pg_dump", "-U", "zdaj", "-d", "zdaj", "-Fc", "--no-owner", "--no-acl"],
                    stdout=output,
                )
                output.flush()
                os.fsync(output.fileno())
            if temporary.stat().st_size == 0:
                raise RuntimeError("The backup archive is empty")
            with temporary.open("rb") as source:
                run_database_command(
                    ["pg_restore", "--list"], stdin=source, stdout=subprocess.DEVNULL
                )
            digest = hashlib.sha256()
            with temporary.open("rb") as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
            temporary.replace(destination)
            destination.with_suffix(".dump.sha256").write_text(
                f"{digest.hexdigest()}  {name}\n", encoding="ascii"
            )
            archives = sorted(
                (
                    path
                    for path in BACKUPS.iterdir()
                    if DUMP_NAME.fullmatch(path.name)
                    and path.is_file()
                    and not path.is_symlink()
                ),
                reverse=True,
            )
            for old in archives[7:]:
                old.unlink()
                old.with_suffix(".dump.sha256").unlink(missing_ok=True)
            print(f"Verified Zdaj database backup: {name}; retention: seven archives.")
        finally:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        backup()
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(f"Zdaj database backup failed ({type(error).__name__}).", file=sys.stderr)
        sys.exit(1)
